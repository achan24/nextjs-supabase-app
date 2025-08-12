'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Clock, Plus, SplitSquareHorizontal, Play, Square, ZoomIn, ZoomOut, Trash2, Save, Undo2, ArrowLeft } from "lucide-react";
import ReactFlowTimeline from './ReactFlowTimeline';
import { timelineDB, TimelineNode as DBTimelineNode } from '@/lib/timeline-db';
import { useSupabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// ---------- Types ----------
export type NodeKind = "action" | "decision";
export type TimelineNode = {
  id: string;
  kind: NodeKind;
  title: string;
  children: string[]; // child node ids
  parentId?: string | null;
  createdAt: number;
  // action-only
  durationsMs?: number[]; // historical actuals
  defaultDurationMs?: number; // rolling average used as default length
  // decision-only: optional chosen child id(s) history
  chosenChildIds?: string[];
};

// ---------- Utilities ----------
const now = () => Date.now();
const msToHuman = (ms: number | undefined) => {
  if (!ms || ms <= 0) return "--";
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
};

const rollingAverage = (values: number[]) => {
  if (!values || values.length === 0) return undefined;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
};

// ---------- Storage ----------
const STORAGE_KEY = "branching-timelines-v1";

type Graph = {
  nodes: Record<string, TimelineNode>;
  rootId: string;
  lastEdited: number;
};

const createInitialGraph = (): Graph => {
  const rootId = uuid();
  const root: TimelineNode = {
    id: rootId,
    kind: "action",
    title: "Empty Node",
    children: [],
    createdAt: now(),
    durationsMs: [],
    defaultDurationMs: 5000, // 5 seconds default
  };
  return { nodes: { [rootId]: root }, rootId, lastEdited: now() };
};

const loadGraph = (): Graph => {
  if (typeof window === 'undefined') {
    return createInitialGraph();
  }
  
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialGraph();
  try {
    const parsed = JSON.parse(raw) as Graph;
    if (!parsed.rootId || !parsed.nodes) return createInitialGraph();
    return parsed;
  } catch {
    return createInitialGraph();
  }
};

const saveGraph = (g: Graph) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...g, lastEdited: now() }));
};

// ---------- Timer Hook ----------
function useActionTimer() {
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0); // forces re-render each second

  useEffect(() => {
    if (!runningActionId || !startedAt) return;
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [runningActionId, startedAt]);

  const start = (actionId: string) => {
    setRunningActionId(actionId);
    setStartedAt(now());
  };
  const stop = () => {
    if (!runningActionId || !startedAt) return { actionId: null as string | null, elapsedMs: 0 };
    const elapsedMs = now() - startedAt;
    const actionId = runningActionId;
    setRunningActionId(null);
    setStartedAt(null);
    return { actionId, elapsedMs };
  };
  // Use tick to force re-render and recalculate elapsedMs
  const elapsedMs = runningActionId && startedAt ? now() - startedAt : 0;
  return { runningActionId, elapsedMs, start, stop };
}

// ---------- UI Primitives (tiny, self-contained) ----------
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 shadow-sm hover:shadow transition text-sm bg-white border border-gray-200 ${className}`}
  />
);

const Card: React.FC<{ children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <div {...props} className={`rounded-2xl border border-gray-200 bg-white p-3 shadow-sm ${className}`}>{children}</div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = "", ...props }) => (
  <input {...props} className={`w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`} />
);

type RunnerState = {
  isPlaying: boolean;
  runnerPath: string[];
  runnerIndex: number;
  runnerProgressMs: number;
};

// ---------- Main Component ----------
export default function DecisionTimelines({ timelineId }: { timelineId?: string }) {
  const supabase = useSupabaseBrowser();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [graph, setGraph] = useState<Graph>({ nodes: {}, rootId: '', lastEdited: 0 });
  const [focusNodeId, setFocusNodeId] = useState<string>('');
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [currentTimelineId, setCurrentTimelineId] = useState<string>('');
  const { runningActionId, elapsedMs, start, stop } = useActionTimer();
  const undoStack = useRef<Graph[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Runner state
  const [isPlaying, setIsPlaying] = useState(false);
  const [runnerProgressMs, setRunnerProgressMs] = useState(0);
  const [runnerPath, setRunnerPath] = useState<string[]>([]);
  const [runnerIndex, setRunnerIndex] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  // Load graph from database
  useEffect(() => {
    const loadGraph = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get the specified timeline or the first one
        let timeline;
        if (timelineId) {
          timeline = await timelineDB.getTimeline(timelineId);
          if (!timeline) {
            throw new Error('Timeline not found');
          }
        } else {
          timeline = await timelineDB.getFirstTimeline(user.id);
        }
        
        console.log('Using timeline:', timeline.title);
        setCurrentTimelineId(timeline.id);
        
        // Get the graph for this timeline
        const dbGraph = await timelineDB.getGraph(timeline.id);
        
        // Convert database format to component format
        const nodesMap: Record<string, any> = {};
        dbGraph.nodes.forEach(node => {
          nodesMap[node.id] = {
            id: node.id,
            title: node.title,
            kind: node.kind,
            children: [],
            parentId: node.parentId,
            createdAt: new Date(node.createdAt).getTime(),
            defaultDurationMs: node.defaultDurationMs,
            chosenChildIds: node.chosenChildId ? [node.chosenChildId] : [],
          };
        });
        
        // Build children relationships
        dbGraph.nodes.forEach(node => {
          if (node.parentId && nodesMap[node.parentId]) {
            nodesMap[node.parentId].children.push(node.id);
          }
        });
        
        if (dbGraph.nodes.length === 0) {
          // No nodes in timeline - create default node in DB and use its ID
          console.log('Timeline is empty, creating default node...');
          try {
            const created = await timelineDB.createNode({
              timelineId: timeline.id,
              title: 'Empty Node',
              kind: 'action',
              parentId: null,
              userId: user.id,
              defaultDurationMs: 5000,
              chosenChildId: null,
            });
            const rootId = created.id;
            const g: Graph = {
              nodes: {
                [rootId]: {
                  id: rootId,
                  kind: 'action',
                  title: created.title,
                  children: [],
                  parentId: null,
                  createdAt: new Date(created.createdAt).getTime(),
                  durationsMs: [],
                  defaultDurationMs: created.defaultDurationMs,
                },
              },
              rootId,
              lastEdited: now(),
            };
            setGraph(g);
            setFocusNodeId(rootId);
          } catch (dbError) {
            console.error('Failed to create default node in database:', dbError);
            const fallback = createInitialGraph();
            setGraph(fallback);
            setFocusNodeId(fallback.rootId);
          }
        } else {
          // Use existing timeline from database
          const componentGraph: Graph = {
            nodes: nodesMap,
            rootId: dbGraph.rootId || '',
            lastEdited: Date.now(),
          };
          
          setGraph(componentGraph);
          setFocusNodeId(componentGraph.rootId);
        }
        
        setHasHydrated(true);
      } catch (error) {
        console.error('Failed to load graph:', error);
        // Fallback to default graph if database fails
        const defaultGraph = createInitialGraph();
        setGraph(defaultGraph);
        setFocusNodeId(defaultGraph.rootId);
        setHasHydrated(true);
      } finally {
        setLoading(false);
      }
    };
    
    loadGraph();
  }, [user]);

  // Removed bulk auto-persist effect. We now persist per-action (create/update) to avoid 406 errors.

  // Ensure focusNodeId is valid
  useEffect(() => {
    if (!graph.nodes[focusNodeId]) {
      setFocusNodeId(graph.rootId);
    }
  }, [graph, focusNodeId]);

  // helpers
  const get = (id: string) => graph.nodes[id];
  const isAction = (n: TimelineNode) => n.kind === "action";
  const isDecision = (n: TimelineNode) => n.kind === "decision";

  const pushUndo = () => {
    undoStack.current.push(JSON.parse(JSON.stringify(graph)));
    if (undoStack.current.length > 50) undoStack.current.shift();
  };
  const undo = () => {
    const prev = undoStack.current.pop();
    if (prev) setGraph(prev);
  };

   const addChild = async (parentId: string, kind: NodeKind) => {
    if (!user) return;
    
    pushUndo();
     // Persist first to DB to get authoritative UUID, then mirror in state
    try {
      const created = await timelineDB.createNode({
        timelineId: currentTimelineId,
        title: kind === 'action' ? 'New Action' : 'New Decision',
        kind,
        parentId,
        userId: user.id,
        defaultDurationMs: kind === 'action' ? 3000 : undefined,
        chosenChildId: null,
      });

      const childId = created.id;
      const child: TimelineNode = {
        id: childId,
        kind,
        title: created.title,
        children: [],
        parentId,
        createdAt: new Date(created.createdAt).getTime(),
        ...(kind === 'action' && { durationsMs: [], defaultDurationMs: created.defaultDurationMs }),
      };

      // Update local state using returned id
      setGraph((g) => ({
        ...g,
        nodes: { 
          ...g.nodes, 
          [childId]: child,
          [parentId]: { 
            ...g.nodes[parentId], 
            children: [...(g.nodes[parentId].children || []), childId] 
          }
        },
        lastEdited: now(),
      }));
      toast.success('Node added');
    } catch (error) {
      console.error('Failed to add child to database:', error);
      toast.error('Failed to add node');
    }
  };

  const deleteNode = (id: string) => {
    pushUndo();
    const nodesToDelete = new Set<string>();
    
    const collectNodesToDelete = (nid: string) => {
      const node = graph.nodes[nid];
      if (!node) return;
      nodesToDelete.add(nid);
      node.children?.forEach(collectNodesToDelete);
    };
    collectNodesToDelete(id);
    
    setGraph((g) => {
      const newNodes = { ...g.nodes };
      nodesToDelete.forEach(nid => {
        delete newNodes[nid];
      });
      
      // Remove references from parent nodes
      Object.values(newNodes).forEach(node => {
        if (node.children) {
          node.children = node.children.filter(childId => !nodesToDelete.has(childId));
        }
      });
      
      return { ...g, nodes: newNodes, lastEdited: now() };
    });
  };

  const renameNode = (id: string, title: string) => {
    setGraph((g) => ({
      ...g,
      nodes: { ...g.nodes, [id]: { ...g.nodes[id], title } },
      lastEdited: now(),
    }));
  };

  const saveTimeline = async () => {
    if (!user || !currentTimelineId || Object.keys(graph.nodes).length === 0) return;
    
    try {
      console.log('Saving entire timeline to database...');
      
      // Save all nodes in the timeline
      const nodesToSave = Object.values(graph.nodes);
      for (const node of nodesToSave) {
        await timelineDB.updateNode(node.id, {
          title: node.title,
          kind: node.kind,
          parentId: node.parentId,
          userId: user.id,
          defaultDurationMs: node.defaultDurationMs,
          chosenChildId: node.chosenChildIds?.[0] || null,
        });
      }
      
      console.log(`Saved ${nodesToSave.length} nodes to database`);
      toast.success(`Saved ${nodesToSave.length} node${nodesToSave.length === 1 ? '' : 's'}`);
    } catch (error) {
      console.error('Failed to save timeline to database:', error);
      toast.error('Failed to save timeline');
    }
  };

  const startAction = (id: string) => start(id);
  const stopAction = () => {
    const result = stop();
    if (result.actionId) {
      setGraph((g) => ({
        ...g,
        nodes: {
          ...g.nodes,
          [result.actionId!]: {
            ...g.nodes[result.actionId!],
            durationsMs: [...(g.nodes[result.actionId!].durationsMs || []), result.elapsedMs],
            defaultDurationMs: rollingAverage([...(g.nodes[result.actionId!].durationsMs || []), result.elapsedMs]),
          },
        },
        lastEdited: now(),
      }));
    }
  };

  const chooseDecision = (decisionId: string, childId: string) => {
    setGraph((g) => ({
      ...g,
      nodes: {
        ...g.nodes,
        [decisionId]: {
          ...g.nodes[decisionId],
          chosenChildIds: [...(g.nodes[decisionId].chosenChildIds || []), childId],
        },
      },
      lastEdited: now(),
    }));
  };

  // computed
  const focused = get(focusNodeId);
  const pathToRoot = useMemo(() => {
    const path: TimelineNode[] = [];
    let current: TimelineNode | null = focused;
    while (current) {
      path.unshift(current);
      if (current.parentId) {
        const parent = get(current.parentId);
        current = parent || null;
      } else {
        current = null;
      }
    }
    return path;
  }, [focused, graph.nodes]);

  const estimateDuration = (n?: TimelineNode) => {
    if (!n || n.kind !== "action") return 5000;
    return n.defaultDurationMs || 5000;
  };

  // Runner functions


  const startRunner = () => {
    console.log('[Runner] Starting runner...');
    setRunnerIndex(0);
    setRunnerProgressMs(0);
    // Start from root and build initial path - but don't auto-choose decisions
    const initialPath = [graph.rootId];
    console.log('[Runner] Initial path:', initialPath);
    setRunnerPath(initialPath);
    setIsPlaying(true);
    console.log('[Runner] Runner started, isPlaying:', true);
  };

  const stopRunner = () => {
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setRunnerProgressMs(0);
  };

  const handleDecisionChoice = (decisionId: string, childId: string) => {
    // Record the choice
    chooseDecision(decisionId, childId);
    
    // Just add the chosen child to the path and continue
    setRunnerPath((p) => [...p, childId]);
    setIsPlaying(true);
  };

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    console.log('[Runner] Starting animation loop');
    let last = performance.now();
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      setRunnerProgressMs((m) => m + dt);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isPlaying]);

  // Step through segments
  useEffect(() => {
    if (!isPlaying) return;
    const currentId = runnerPath[runnerIndex];
    const current = currentId ? get(currentId) : undefined;
    console.log('[Runner] Current node:', current?.title, 'kind:', current?.kind, 'progress:', runnerProgressMs);
    
    if (!current) return;
    
    if (current.kind === "action") {
      const dur = estimateDuration(current);
      console.log('[Runner] Action duration:', dur, 'progress:', runnerProgressMs);
      if (runnerProgressMs >= dur) {
        // action completed, move to next
        console.log('[Runner] Action completed, moving to next');
        setRunnerProgressMs(0);
        const nextIndex = runnerIndex + 1;
        const nextId = runnerPath[nextIndex];
        if (!nextId) {
          // Need to find the next node
          if (current.children && current.children.length > 0) {
            if (current.children.length === 1) {
              // Single child - auto-advance
              const nextNodeId = current.children[0];
              console.log('[Runner] Auto-advancing to single child:', nextNodeId);
              setTimeout(() => {
                setRunnerPath(prev => [...prev, nextNodeId]);
                setRunnerIndex(nextIndex);
              }, 1000);
            } else {
              // Multiple children - should not happen for actions
              console.log('[Runner] Action has multiple children - stopping');
              setIsPlaying(false);
            }
          } else {
            // No children - reached end
            console.log('[Runner] Reached end of path');
            setIsPlaying(false);
          }
        } else {
          // Add a 1-second delay before advancing
          console.log('[Runner] Adding delay before advancing');
          setTimeout(() => {
            console.log('[Runner] Advancing to next node after delay');
            setRunnerIndex(nextIndex);
          }, 1000);
        }
      }
    } else if (current.kind === "decision") {
      // For decisions, check if we need to wait for input
      const hasChosenChild = current.chosenChildIds && current.chosenChildIds.length > 0;
      console.log('[Runner] Decision node, has chosen child:', hasChosenChild, 'children count:', current.children?.length);
      if (!hasChosenChild && current.children && current.children.length > 1) {
        // Pause here - decision popup will be shown by ReactFlowTimeline
        console.log('[Runner] Pausing for decision input');
        return;
      } else {
        // Auto-advance for decisions with choices or single child
        console.log('[Runner] Auto-advancing decision');
        setRunnerProgressMs(0);
        const nextIndex = runnerIndex + 1;
        const nextId = runnerPath[nextIndex];
        if (!nextId) {
          // Need to find the next node based on choice
          if (hasChosenChild && current.chosenChildIds) {
            const chosenChildId = current.chosenChildIds[current.chosenChildIds.length - 1];
            console.log('[Runner] Following chosen path:', chosenChildId);
            setTimeout(() => {
              setRunnerPath(prev => [...prev, chosenChildId]);
              setRunnerIndex(nextIndex);
            }, 1000);
          } else if (current.children && current.children.length === 1) {
            // Single child - auto-choose
            const nextNodeId = current.children[0];
            console.log('[Runner] Auto-choosing single child:', nextNodeId);
            chooseDecision(current.id, nextNodeId);
            setTimeout(() => {
              setRunnerPath(prev => [...prev, nextNodeId]);
              setRunnerIndex(nextIndex);
            }, 1000);
          } else {
            // No children - reached end
            console.log('[Runner] Reached end of path');
            setIsPlaying(false);
          }
        } else {
          // Add a 1-second delay before advancing
          console.log('[Runner] Adding delay before advancing decision');
          setTimeout(() => {
            console.log('[Runner] Advancing to next node after delay');
            setRunnerIndex(nextIndex);
          }, 1000);
        }
      }
    }
  }, [runnerProgressMs, isPlaying, runnerIndex, runnerPath, graph]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push('/dashboard/decision-timelines')} className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-4 w-4" />
              Back to Timelines
            </Button>
            <Clock className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Decision Timelines</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={undo} title="Undo (in-memory)"><Undo2 className="h-4 w-4"/>Undo</Button>
                            <Button onClick={saveTimeline} title="Save entire timeline to database"><Save className="h-4 w-4"/>Save</Button>
            <Button onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }} title="Clear data and restart" className="text-red-600 hover:text-red-700">Clear</Button>
          </div>
        </div>

        {/* Breadcrumb / Zoom controls */}
        <Card className="mt-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="opacity-60">Focus:</span>
            {pathToRoot.map((n, i) => (
              <span key={n.id} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-4 w-4 opacity-40" />}
                <button onClick={() => setFocusNodeId(n.id)} className={`rounded-xl px-2 py-1 ${n.id === focusNodeId ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-100"}`}>
                  {n.title}
                </button>
              </span>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {focused?.parentId && (
                <Button onClick={() => setFocusNodeId(focused.parentId!)}><ZoomOut className="h-4 w-4"/>Up</Button>
              )}
              <Button onClick={() => setFocusNodeId(graph.rootId)}><ChevronLeft className="h-4 w-4"/>Root</Button>
            </div>
          </div>
        </Card>

        {/* Focus node editor */}
        {focused && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="md:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-wide opacity-60">Focused Node</span>
                {focused.id !== graph.rootId && (
                  <Button onClick={() => deleteNode(focused.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4"/>Delete</Button>
                )}
              </div>
              <div className="mt-3 space-y-2">
                <label className="text-xs opacity-70">Title</label>
                <Input value={focused.title} onChange={(e) => renameNode(focused.id, e.target.value)} />
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded-full bg-gray-100 px-2 py-1">{focused.kind}</span>
                  {isAction(focused) && (
                    <span className="opacity-70">Avg: {msToHuman(focused.defaultDurationMs)}</span>
                  )}
                </div>
                {isAction(focused) && (
                  <div className="mt-2 flex items-center gap-2">
                    {runningActionId === focused.id ? (
                      <Button onClick={stopAction} className="bg-red-50 text-red-700 border-red-200"><Square className="h-4 w-4"/>Stop • {msToHuman(elapsedMs)}</Button>
                    ) : (
                      <Button onClick={() => startAction(focused.id)} className="bg-green-50 text-green-700 border-green-200"><Play className="h-4 w-4"/>Start</Button>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-4 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Button onClick={() => addChild(focused.id, "action")}><Plus className="h-4 w-4"/>Add Action</Button>
                  <Button onClick={() => addChild(focused.id, "decision")}><SplitSquareHorizontal className="h-4 w-4"/>Add Decision</Button>
                </div>
              </div>
            </Card>

            {/* Children list / choose branches */}
            <Card className="md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-wide opacity-60">Children</span>
                <span className="text-xs opacity-50">{focused?.children?.length || 0} item(s)</span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {focused?.children?.map((cid) => {
                    const child = get(cid);
                    if (!child) return null;
                    const chosenCount = isDecision(focused) && focused.chosenChildIds ? focused.chosenChildIds.filter((x) => x === cid).length : 0;
                    return (
                      <AnimatePresence key={cid}>
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                          <Card className={`relative ${selectionId === cid ? "ring-2 ring-indigo-400" : ""}`} onMouseEnter={() => setSelectionId(cid)} onMouseLeave={() => setSelectionId(null)}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="text-sm font-medium">{child.title}</div>
                                <div className="mt-1 text-xs opacity-60">{child.kind}</div>
                                {isAction(child) && (
                                  <div className="mt-1 text-xs opacity-70">Avg: {msToHuman(child.defaultDurationMs)}</div>
                                )}
                                {isDecision(focused) && (
                                  <div className="mt-1 text-xs opacity-70">Chosen here: {chosenCount}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button onClick={() => setFocusNodeId(cid)} className="text-xs"><ZoomIn className="h-3 w-3"/></Button>
                                {isDecision(focused) && (
                                  <Button onClick={() => chooseDecision(focused.id, cid)} className="text-xs bg-green-50 text-green-700 border-green-200">
                                    Choose
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      </AnimatePresence>
                    );
                  })}
                </AnimatePresence>
              </div>
            </Card>
          </div>
        )}

        {/* Tree View */}
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm uppercase tracking-wide opacity-60">Map (Subtree)</span>
          </div>
          <div className="mt-3">
            <TreeView graph={graph} rootId={focusNodeId} onZoom={setFocusNodeId} onStart={startAction} runningActionId={runningActionId} />
          </div>
        </Card>

        {/* Timeline Visualization */}
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm uppercase tracking-wide opacity-60">Timeline Visualization</span>
          </div>
          <div className="mt-3">
            <ReactFlowTimeline 
              graph={graph}
              isPlaying={isPlaying}
              runnerPath={runnerPath}
              runnerIndex={runnerIndex}
              runnerProgressMs={runnerProgressMs}
              hasHydrated={hasHydrated}
              onNodeClick={(nodeId) => setFocusNodeId(nodeId)}
              onStartRunner={startRunner}
              onStopRunner={stopRunner}
              onDecisionChoice={handleDecisionChoice}
            />
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs opacity-60">
          Data is stored locally in your browser (localStorage). This is a prototype.
        </div>
      </div>
    </div>
  );
}

// ---------- Tree View ----------
function TreeView({ graph, rootId, onZoom, onStart, runningActionId }: { graph: Graph; rootId: string; onZoom: (id: string) => void; onStart: (id: string) => void; runningActionId: string | null; }) {
  const get = (id: string) => graph.nodes[id];

  const NodePill: React.FC<{ n: TimelineNode }> = ({ n }) => (
    <div className={`flex items-center gap-2 rounded-full border px-2 py-1 text-xs ${n.kind === "decision" ? "bg-yellow-50 border-yellow-200" : "bg-indigo-50 border-indigo-200"}`}>
      <span className="font-medium">{n.kind === "decision" ? "Decision" : "Action"}</span>
      {n.kind === "action" && <span className="opacity-70">avg {msToHuman(n.defaultDurationMs)}</span>}
    </div>
  );

  const renderNode = (id: string, depth = 0) => {
    const n = get(id);
    if (!n) return null;
    return (
      <li key={id} className="relative">
        <div className="group mb-2 inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <button onClick={() => onZoom(id)} className="rounded-xl px-2 py-1 text-sm hover:bg-gray-100" title="Zoom here">{n.title}</button>
          <NodePill n={n} />
          {n.kind === "action" && (
            <Button onClick={() => onStart(id)} className={`ml-1 ${runningActionId === id ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`} title="Start timer from map">
              {runningActionId === id ? <Square className="h-4 w-4"/> : <Play className="h-4 w-4"/>}
            </Button>
          )}
        </div>
        {n.children?.length > 0 && (
          <ul className="ml-6 border-l border-dashed border-gray-300 pl-6">
            {n.children.map((cid) => renderNode(cid, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul className="space-y-1">
      {renderNode(rootId)}
    </ul>
  );
}
