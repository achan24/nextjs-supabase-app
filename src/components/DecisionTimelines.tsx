'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Clock, Plus, SplitSquareHorizontal, Play, Square, ZoomIn, ZoomOut, Trash2, Save, Undo2 } from "lucide-react";

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
    title: "Open book",
    children: [],
    createdAt: now(),
    durationsMs: [],
    defaultDurationMs: undefined,
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

// ---------- Main Component ----------
export default function DecisionTimelines() {
  const [graph, setGraph] = useState<Graph>(() => loadGraph());
  const [focusNodeId, setFocusNodeId] = useState<string>(graph.rootId); // zoom target
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const { runningActionId, elapsedMs, start, stop } = useActionTimer();
  const undoStack = useRef<Graph[]>([]);

  // NEW: visual runner state
  const [isPlaying, setIsPlaying] = useState(false);
  const [runnerProgressMs, setRunnerProgressMs] = useState(0); // elapsed within current segment
  const [runnerPath, setRunnerPath] = useState<string[]>([]); // linearised nodes along the chosen path
  const [runnerIndex, setRunnerIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  
  // Decision popup state
  const [showDecisionPopup, setShowDecisionPopup] = useState(false);
  const [currentDecisionNode, setCurrentDecisionNode] = useState<TimelineNode | null>(null);

  // persist
  useEffect(() => {
    if (graph && Object.keys(graph.nodes).length > 0) {
      saveGraph(graph);
    }
  }, [graph]);

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

  const addChild = (parentId: string, kind: NodeKind) => {
    const id = uuid();
    const title = kind === "action" ? "New action" : "Decision point";
    const node: TimelineNode = {
      id,
      kind,
      title,
      children: [],
      parentId,
      createdAt: now(),
      durationsMs: kind === "action" ? [] : undefined,
      defaultDurationMs: kind === "action" ? undefined : undefined,
      chosenChildIds: kind === "decision" ? [] : undefined,
    };
    pushUndo();
    setGraph((g) => ({
      ...g,
      nodes: { 
        ...g.nodes, 
        [id]: node, 
        [parentId]: { 
          ...g.nodes[parentId], 
          children: [...(g.nodes[parentId]?.children || []), id] 
        } 
      },
      lastEdited: now(),
    }));
  };

  const deleteNode = (id: string) => {
    if (id === graph.rootId) return; // don't delete root
    const node = get(id);
    if (!node) return;
    pushUndo();
    const newNodes = { ...graph.nodes };
    // remove children recursively
    const removeRecursive = (nid: string) => {
      const n = newNodes[nid];
      if (!n) return;
      n.children.forEach(removeRecursive);
      delete newNodes[nid];
    };
    removeRecursive(id);
    // detach from parent
    if (node.parentId && newNodes[node.parentId]) {
      newNodes[node.parentId] = {
        ...newNodes[node.parentId],
        children: (newNodes[node.parentId].children || []).filter((c) => c !== id),
      };
    }
    setGraph((g) => ({ ...g, nodes: newNodes, lastEdited: now() }));
    if (focusNodeId === id && node.parentId) setFocusNodeId(node.parentId);
  };

  const renameNode = (id: string, title: string) => {
    setGraph((g) => ({ ...g, nodes: { ...g.nodes, [id]: { ...g.nodes[id], title } }, lastEdited: now() }));
  };

  const startAction = (id: string) => start(id);
  const stopAction = () => {
    const { actionId, elapsedMs } = stop();
    if (!actionId) return;
    const n = get(actionId);
    if (!n) return;
    const updatedDurations = [...(n.durationsMs || []), elapsedMs];
    const avg = rollingAverage(updatedDurations);
    pushUndo();
    setGraph((g) => ({
      ...g,
      nodes: {
        ...g.nodes,
        [actionId]: { ...n, durationsMs: updatedDurations, defaultDurationMs: avg },
      },
      lastEdited: now(),
    }));
  };

  const chooseDecision = (decisionId: string, childId: string) => {
    const d = get(decisionId);
    if (!d || d.kind !== "decision") return;
    const chosen = [...(d.chosenChildIds || []), childId];
    pushUndo();
    setGraph((g) => ({
      ...g,
      nodes: { ...g.nodes, [decisionId]: { ...d, chosenChildIds: chosen } },
      lastEdited: now(),
    }));
    // zoom into the chosen branch automatically
    setFocusNodeId(childId);
    // if runner is waiting at this decision, continue
    if (isPlaying) {
      setTimeout(() => advanceRunnerAfterDecision(childId), 0);
    }
  };

  const pathToRoot = useMemo(() => {
    const path: TimelineNode[] = [];
    let n: TimelineNode | undefined = get(focusNodeId);
    while (n) {
      path.unshift(n);
      if (!n.parentId) break;
      n = get(n.parentId);
    }
    return path;
  }, [graph, focusNodeId]);

  const focused = get(focusNodeId);

  // ------- Visual Runner helpers -------
  const estimateDuration = (n?: TimelineNode) => {
    if (!n) return 0;
    if (n.kind === "action") return n.defaultDurationMs ?? 5000; // fallback 5s
    return 1200; // small visual pause for decision marker
  };

  // Build linear path from a node until a decision (exclusive). If a decision has a previously chosen child, follow latest choice; else stop at decision and wait.
  const buildLinearPath = (startId: string): string[] => {
    const seq: string[] = [];
    let curr: TimelineNode | undefined = get(startId);
    while (curr) {
      seq.push(curr.id);
              if (!curr.children || curr.children.length === 0) break;
        if (curr.kind === "decision") {
          const lastChosen = curr.chosenChildIds && curr.chosenChildIds[curr.chosenChildIds.length - 1];
          if (!lastChosen) break; // wait for input
          curr = get(lastChosen);
        } else {
          // Action: if single child, continue; if multiple, stop to let user decide via explicit decision node
          if (curr.children.length === 1) curr = get(curr.children[0]);
          else break;
        }
    }
    return seq;
  };

  const startRunner = () => {
    if (!focused) return;
    setRunnerIndex(0);
    setRunnerProgressMs(0);
    // Start with the focused node and build path from there
    setRunnerPath([focused.id, ...buildLinearPath(focused.id).slice(1)]);
    setIsPlaying(true);
  };

  const stopRunner = () => {
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setRunnerProgressMs(0);
  };

  const handleDecisionChoice = (childId: string) => {
    if (!currentDecisionNode) return;
    
    // Record the choice in the decision node
    chooseDecision(currentDecisionNode.id, childId);
    
    // Extend path from chosen child and resume
    const more = buildLinearPath(childId);
    setRunnerPath((p) => [...(p || []), ...(more.slice(1) || [])]); // Null checks added
    setIsPlaying(true);
    
    // Close popup
    setShowDecisionPopup(false);
    setCurrentDecisionNode(null);
  };

  const advanceRunnerAfterDecision = (childId: string) => {
    // Extend path from chosen child and resume
    const more = buildLinearPath(childId);
    setRunnerPath((p) => [...(p || []), ...(more.slice(1) || [])]); // avoid duplicating decision child if already next
    setIsPlaying(true);
  };

  // animation loop
  useEffect(() => {
    if (!isPlaying) return;
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

  // step through segments
  useEffect(() => {
    if (!isPlaying) return;
    const currentId = runnerPath[runnerIndex];
    const current = currentId ? get(currentId) : undefined;
    const dur = estimateDuration(current);
    if (!current) return;
    if (runnerProgressMs >= dur) {
      // segment done
      setRunnerProgressMs(0);
      const nextIndex = runnerIndex + 1;
      const nextId = runnerPath[nextIndex];
      // if we ran off the end, try to extend
      if (!nextId) {
        if (current.kind === "decision") {
          // pause and show decision popup
          setIsPlaying(false);
          setCurrentDecisionNode(current);
          setShowDecisionPopup(true);
          return;
        }
        // if current has a single child, extend; if multiple or none, stop
        if (current.children && current.children.length === 1) {
          const ext = buildLinearPath(current.children[0]);
          setRunnerPath((p) => [...(p || []), ...(ext || [])]);
          setRunnerIndex(nextIndex);
        } else {
          setIsPlaying(false);
        }
      } else {
        // normal advance
        setRunnerIndex(nextIndex);
        // if next is a decision, pause and show popup
        const nextNode = get(nextId);
        if (nextNode && nextNode.kind === "decision") {
          setIsPlaying(false);
          setCurrentDecisionNode(nextNode);
          setShowDecisionPopup(true);
        }
      }
    }
  }, [runnerProgressMs, isPlaying, runnerIndex, runnerPath, graph]);

  const totalWidthMs = useMemo(() => (runnerPath || []).reduce((acc, id) => acc + estimateDuration(get(id)), 0), [runnerPath, graph]);
  const elapsedBeforeCurrent = useMemo(() => (runnerPath || []).slice(0, runnerIndex).reduce((acc, id) => acc + estimateDuration(get(id)), 0), [runnerIndex, runnerPath, graph]);
  const redDotOffset = totalWidthMs === 0 ? 0 : ((elapsedBeforeCurrent + runnerProgressMs) / totalWidthMs) * 100;

  // ---------- Render ----------
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Branching Timelines</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={undo} title="Undo (in-memory)"><Undo2 className="h-4 w-4"/>Undo</Button>
            <Button onClick={() => saveGraph(graph)} title="Save to localStorage"><Save className="h-4 w-4"/>Save</Button>
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
                              <div className="flex flex-col gap-2">
                                <Button onClick={() => setFocusNodeId(child.id)} title="Zoom in"><ZoomIn className="h-4 w-4"/></Button>
                                {isDecision(focused) && (
                                  <Button onClick={() => chooseDecision(focused.id, child.id)} title="Choose this branch and zoom">Choose</Button>
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

        {/* Map view (zoomed subtree) */}
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm uppercase tracking-wide opacity-60">Map (subtree)</span>
            <span className="text-xs opacity-50">Zoom target: {focused?.title}</span>
          </div>
          <TreeView graph={graph} rootId={focusNodeId} onZoom={setFocusNodeId} onStart={startAction} runningActionId={runningActionId} />
        </Card>

        {/* NEW: Visual runner */}
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm uppercase tracking-wide opacity-60">Visual Runner (beta)</span>
            <div className="flex items-center gap-2 text-sm">
              {!isPlaying ? (
                <Button onClick={startRunner}><Play className="h-4 w-4"/>Play</Button>
              ) : (
                <Button onClick={stopRunner}><Square className="h-4 w-4"/>Stop</Button>
              )}
            </div>
          </div>

          {/* Canvas-style visual runner */}
          <div className="mt-3 relative min-h-48 bg-white border border-gray-300 rounded-lg p-6">
            <div className="relative w-full h-full">
              {/* Canvas area */}
              <div className="relative w-full h-full">
                {/* Render branching timeline */}
                                 <svg className="w-full h-full" viewBox="0 0 800 200">

                  
                                     {/* Timeline paths */}
                   {(() => {
                     // Constants for layout
                     const PX_PER_MS = 0.005;      // horizontal scale for action duration
                     const MIN_ACTION_W = 140;     // min width for very short actions
                     const COL_GAP = 160;          // horizontal gap after a node before children
                     const ROW_GAP = 64;           // vertical gap between sibling branches
                     const DECISION_D = 48;        // diamond width/height
                     const ACTION_H = 10;          // action lane height (stroke thickness area)

                     // Types for layout
                     interface LayoutNode {
                       id: string;
                       title: string;
                       kind: "action" | "decision";
                       x: number;
                       y: number;
                       width: number;
                       height: number;
                     }

                     interface LayoutEdge {
                       fromId: string;
                       toId: string;
                       points: Array<{ x: number; y: number }>;
                     }

                     interface SubtreeLayout {
                       nodes: LayoutNode[];
                       edges: LayoutEdge[];
                       width: number;
                       height: number;
                       entry: { x: number; y: number };
                       exits: Array<{ id: string; x: number; y: number }>;
                     }

                     // Measure action width based on duration
                     function measureActionWidth(n: TimelineNode): number {
                       const dur = n.defaultDurationMs ?? 0;
                       return Math.max(MIN_ACTION_W, dur * PX_PER_MS);
                     }

                     // Layout a subtree bottom-up
                     function layoutSubtree(nodesById: Map<string, TimelineNode>, nodeId: string): SubtreeLayout {
                       const n = nodesById.get(nodeId)!;
                       console.log('[DecisionTimelines] Layout subtree for:', nodeId, n.title, n.kind, 'children:', n.children);

                       if (n.kind === "action") {
                         const w = measureActionWidth(n);
                         const h = ACTION_H;
                         const children = n.children ?? [];

                         if (children.length === 0) {
                           // Action with no children
                           const node: LayoutNode = {
                             id: n.id,
                             title: n.title,
                             kind: n.kind,
                             x: 0,
                             y: -h / 2,
                             width: w,
                             height: h,
                           };

                           return {
                             nodes: [node],
                             edges: [],
                             width: w,
                             height: Math.max(h, DECISION_D),
                             entry: { x: 0, y: 0 },
                             exits: [{ id: n.id, x: w, y: 0 }],
                           };
                         } else {
                           // Action with children - treat like a decision for layout purposes
                           console.log('[DecisionTimelines] Action with children:', n.title, children);
                           
                           // Layout each child subtree
                           const childLayouts = children.map((cid) => layoutSubtree(nodesById, cid));
                           
                           // Stack children vertically with ROW_GAP between them
                           const totalChildrenHeight =
                             childLayouts.reduce((acc, c) => acc + c.height, 0) + ROW_GAP * (childLayouts.length - 1);

                           let yCursor = -totalChildrenHeight / 2;
                           const childX = w + COL_GAP;

                           const placedNodes: LayoutNode[] = [];
                           const placedEdges: LayoutEdge[] = [];
                           const exits: SubtreeLayout["exits"] = [];

                           // Add the action node itself
                           placedNodes.push({
                             id: n.id,
                             title: n.title,
                             kind: n.kind,
                             x: 0,
                             y: -h / 2,
                             width: w,
                             height: h,
                           });

                           let maxChildWidthRight = 0;

                           childLayouts.forEach((cl, idx) => {
                             const childTop = yCursor;
                             const childCenterY = childTop + cl.height / 2;

                             // Offset all child nodes
                             cl.nodes.forEach((nn) => {
                               placedNodes.push({
                                 ...nn,
                                 x: nn.x + childX,
                                 y: nn.y + childTop,
                               });
                             });

                             // Offset edges
                             cl.edges.forEach((e) => {
                               placedEdges.push({
                                 fromId: e.fromId,
                                 toId: e.toId,
                                 points: e.points.map((p) => ({ x: p.x + childX, y: p.y + childTop })),
                               });
                             });

                             // Connect action to child with orthogonal polyline
                             const actionRight = { x: w, y: 0 };
                             const childEntry = { x: cl.entry.x + childX, y: cl.entry.y + childCenterY };
                             placedEdges.push({
                               fromId: n.id,
                               toId: children[idx],
                               points: [
                                 { x: actionRight.x, y: actionRight.y },
                                 { x: actionRight.x + COL_GAP / 2, y: actionRight.y },
                                 { x: actionRight.x + COL_GAP / 2, y: childEntry.y },
                                 { x: childEntry.x, y: childEntry.y },
                               ],
                             });

                             // Collect exits from child subtree
                             cl.exits.forEach((ex) => {
                               exits.push({
                                 id: ex.id,
                                 x: ex.x + childX,
                                 y: ex.y + childTop,
                               });
                             });

                             const childRight = childX + cl.width;
                             if (childRight > maxChildWidthRight) maxChildWidthRight = childRight;

                             yCursor += cl.height + ROW_GAP;
                           });

                           const subtreeWidth = Math.max(w, maxChildWidthRight);
                           const subtreeHeight = Math.max(totalChildrenHeight, h);

                           return {
                             nodes: placedNodes,
                             edges: placedEdges,
                             width: subtreeWidth,
                             height: subtreeHeight,
                             entry: { x: 0, y: 0 },
                             exits,
                           };
                         }
                       }

                       // decision
                       const d = DECISION_D;
                       const children = n.children ?? [];
                       if (children.length === 0) {
                         const node: LayoutNode = {
                           id: n.id,
                           title: n.title,
                           kind: n.kind,
                           x: -d / 2,
                           y: -d / 2,
                           width: d,
                           height: d,
                         };
                         return {
                           nodes: [node],
                           edges: [],
                           width: d,
                           height: d,
                           entry: { x: 0, y: 0 },
                           exits: [{ id: n.id, x: d / 2, y: 0 }],
                         };
                       }

                       // Layout each child subtree
                       console.log('[DecisionTimelines] Decision has', children.length, 'children:', children);
                       const childLayouts = children.map((cid) => layoutSubtree(nodesById, cid));

                       // Stack children vertically with ROW_GAP between them
                       const totalChildrenHeight =
                         childLayouts.reduce((acc, c) => acc + c.height, 0) + ROW_GAP * (childLayouts.length - 1);

                       let yCursor = -totalChildrenHeight / 2;
                       const childX = d / 2 + COL_GAP;

                       const placedNodes: LayoutNode[] = [];
                       const placedEdges: LayoutEdge[] = [];
                       const exits: SubtreeLayout["exits"] = [];

                       // Add the decision diamond itself
                       placedNodes.push({
                         id: n.id,
                         title: n.title,
                         kind: n.kind,
                         x: -d / 2,
                         y: -d / 2,
                         width: d,
                         height: d,
                       });

                       let maxChildWidthRight = 0;

                       childLayouts.forEach((cl, idx) => {
                         const childTop = yCursor;
                         const childCenterY = childTop + cl.height / 2;

                         // Offset all child nodes
                         cl.nodes.forEach((nn) => {
                           placedNodes.push({
                             ...nn,
                             x: nn.x + childX,
                             y: nn.y + childTop,
                           });
                         });

                         // Offset edges
                         cl.edges.forEach((e) => {
                           placedEdges.push({
                             fromId: e.fromId,
                             toId: e.toId,
                             points: e.points.map((p) => ({ x: p.x + childX, y: p.y + childTop })),
                           });
                         });

                         // Connect diamond to child with orthogonal polyline
                         const diamondRight = { x: d / 2, y: 0 };
                         const childEntry = { x: cl.entry.x + childX, y: cl.entry.y + childCenterY };
                         placedEdges.push({
                           fromId: n.id,
                           toId: children[idx],
                           points: [
                             { x: diamondRight.x, y: diamondRight.y },
                             { x: diamondRight.x + COL_GAP / 2, y: diamondRight.y },
                             { x: diamondRight.x + COL_GAP / 2, y: childEntry.y },
                             { x: childEntry.x, y: childEntry.y },
                           ],
                         });

                         // Collect exits from child subtree
                         cl.exits.forEach((ex) => {
                           exits.push({
                             id: ex.id,
                             x: ex.x + childX,
                             y: ex.y + childTop,
                           });
                         });

                         const childRight = childX + cl.width;
                         if (childRight > maxChildWidthRight) maxChildWidthRight = childRight;

                         yCursor += cl.height + ROW_GAP;
                       });

                       const subtreeWidth = Math.max(d, maxChildWidthRight);
                       const subtreeHeight = Math.max(totalChildrenHeight, d);

                       return {
                         nodes: placedNodes,
                         edges: placedEdges,
                         width: subtreeWidth,
                         height: subtreeHeight,
                         entry: { x: -d / 2, y: 0 },
                         exits,
                       };
                     }

                     // Build the full timeline structure
                     function getTimelineStructure(
                       rootId: string,
                       nodesById: Map<string, TimelineNode>
                     ): { nodes: LayoutNode[]; edges: LayoutEdge[]; size: { width: number; height: number } } {
                       const s = layoutSubtree(nodesById, rootId);

                       // Normalize so top-left is (0,0) for the SVG
                       const minX = Math.min(...s.nodes.map((n) => n.x), ...s.edges.flatMap((e) => e.points.map((p) => p.x)));
                       const minY = Math.min(...s.nodes.map((n) => n.y), ...s.edges.flatMap((e) => e.points.map((p) => p.y)));

                       const nodes = s.nodes.map((n) => ({ ...n, x: n.x - minX, y: n.y - minY }));
                       const edges = s.edges.map((e) => ({
                         ...e,
                         points: e.points.map((p) => ({ x: p.x - minX, y: p.y - minY })),
                       }));

                       return {
                         nodes,
                         edges,
                         size: { width: s.width - minX, height: s.height - minY },
                       };
                     }
                     
                     // Create nodes map for layout
                     const nodesMap = new Map<string, TimelineNode>();
                     Object.values(graph.nodes || {}).forEach(node => {
                       nodesMap.set(node.id, node);
                     });
                     
                     // Debug: log the graph structure
                     console.log('[DecisionTimelines] Graph nodes:', Object.keys(graph.nodes || {}));
                     console.log('[DecisionTimelines] Focus node:', focusNodeId);
                     console.log('[DecisionTimelines] Focus node children:', get(focusNodeId)?.children);
                     
                     // Log all nodes and their children
                     Object.values(graph.nodes || {}).forEach(node => {
                       console.log('[DecisionTimelines] Node:', node.id, node.title, node.kind, 'children:', node.children);
                     });
                     
                     const timelineStructure = getTimelineStructure(focusNodeId, nodesMap);
                     
                     // Debug: log the layout result
                     console.log('[DecisionTimelines] Layout result:', {
                       nodesCount: timelineStructure.nodes.length,
                       edgesCount: timelineStructure.edges.length,
                       size: timelineStructure.size
                     });
                     const runnerNodes = (runnerPath && runnerPath.length > 0) ? runnerPath : [focusNodeId];
                     const paths = [];
                     
                                                               // Render with proper layering (DOM order = z-index)
                     
                     // 1. Edges (behind everything)
                     const edges = timelineStructure.edges.map((edge, i) => {
                       const currentRunnerIndex = runnerNodes.indexOf(edge.toId);
                       const isCompleted = currentRunnerIndex >= 0 && currentRunnerIndex < runnerIndex && isPlaying;
                       const strokeColor = isCompleted ? "#10b981" : "#f3f4f6";
                       
                       return (
                         <polyline 
                           key={`edge-${i}`}
                           points={edge.points.map(p => `${p.x},${p.y}`).join(' ')}
                           stroke={strokeColor} 
                           strokeWidth="1"
                           fill="none"
                           strokeLinecap="round"
                         />
                       );
                     });
                     
                     // 2. Node shapes (bars + diamonds)
                     const nodeShapes = timelineStructure.nodes.map((node, i) => {
                       const n = get(node.id);
                       if (!n) return null;
                       
                       const currentRunnerIndex = runnerNodes.indexOf(node.id);
                       const isCurrent = currentRunnerIndex === runnerIndex && isPlaying;
                       const isCompleted = currentRunnerIndex >= 0 && currentRunnerIndex < runnerIndex && isPlaying;
                       
                       if (n.kind === "decision") {
                         const fillColor = isCurrent ? "#3b82f6" : isCompleted ? "#d1fae5" : "#fef3c7";
                         
                         // Draw diamond (rotated square)
                         const centerX = node.x + DECISION_D / 2;
                         const centerY = node.y + DECISION_D / 2;
                         const halfSize = DECISION_D / 2;
                         
                         return (
                           <polygon 
                             key={`shape-${i}`}
                             points={`${centerX},${centerY-halfSize} ${centerX+halfSize},${centerY} ${centerX},${centerY+halfSize} ${centerX-halfSize},${centerY}`}
                             fill={fillColor}
                           />
                         );
                       } else {
                         const lineColor = isCurrent ? "#3b82f6" : isCompleted ? "#10b981" : "#fef3c7";
                         
                         // Draw action as rounded rectangle
                         return (
                           <rect 
                             key={`shape-${i}`}
                             x={node.x} 
                             y={node.y} 
                             width={node.width} 
                             height={node.height} 
                             rx={node.height / 2}
                             fill={lineColor}
                           />
                         );
                       }
                     });
                     
                     // 3. Labels (titles + durations) - explicit fill to avoid inheritance issues
                     const labels = timelineStructure.nodes.map((node, i) => {
                       const n = get(node.id);
                       if (!n) return null;
                       
                       const currentRunnerIndex = runnerNodes.indexOf(node.id);
                       const isCurrent = currentRunnerIndex === runnerIndex && isPlaying;
                       
                       if (n.kind === "decision") {
                         const centerX = node.x + DECISION_D / 2;
                         const centerY = node.y + DECISION_D / 2;
                         
                         return (
                           <text 
                             key={`text-${i}`}
                             x={centerX} 
                             y={centerY + 4} 
                             textAnchor="middle" 
                             fontSize="8" 
                             fill={isCurrent ? "white" : "#92400e"}
                             style={{ fontWeight: 600 }}
                             paintOrder="stroke"
                             stroke="#fff" 
                             strokeWidth="1"
                           >
                             {n.title}
                           </text>
                         );
                       } else {
                         const duration = n.defaultDurationMs || 5000;
                         const centerX = node.x + node.width / 2;
                         const centerY = node.y + node.height / 2;
                         
                         return (
                           <g key={`label-${i}`}>
                             <text 
                               x={centerX} 
                               y={centerY - 8} 
                               textAnchor="middle" 
                               fontSize="7" 
                               fill={isCurrent ? "#3b82f6" : "#581c87"}
                               style={{ fontWeight: 600 }}
                               paintOrder="stroke"
                               stroke="#fff" 
                               strokeWidth="1"
                             >
                               {n.title}
                             </text>
                             <text 
                               x={centerX} 
                               y={centerY + 12} 
                               textAnchor="middle" 
                               fontSize="6" 
                               fill="#9ca3af"
                             >
                               {msToHuman(duration)}
                             </text>
                           </g>
                         );
                       }
                     });
                     
                     // 4. Progress indicators (red dot, highlights)
                     const progressIndicators = [];
                     if (isPlaying) {
                       const totalElapsed = elapsedBeforeCurrent + runnerProgressMs;
                       const totalDuration = totalWidthMs;
                       const overallProgress = totalDuration > 0 ? totalElapsed / totalDuration : 0;
                       
                       // Find the current path in the layout
                       const currentPathNodes = runnerPath.slice(0, runnerIndex + 1);
                       if (currentPathNodes.length > 0) {
                         const currentNodeId = currentPathNodes[currentPathNodes.length - 1];
                         const currentNode = timelineStructure.nodes.find(n => n.id === currentNodeId);
                         
                         if (currentNode) {
                           const progressInNode = runnerProgressMs / (estimateDuration(get(currentNodeId)) || 5000);
                           let dotX, dotY;
                           
                           if (get(currentNodeId)?.kind === "decision") {
                             dotX = currentNode.x + DECISION_D / 2;
                             dotY = currentNode.y + DECISION_D / 2;
                           } else {
                             dotX = currentNode.x + (currentNode.width * progressInNode);
                             dotY = currentNode.y + currentNode.height / 2;
                           }
                           
                           progressIndicators.push(
                             <circle 
                               key={`progress-dot`}
                               cx={dotX} 
                               cy={dotY} 
                               r="4" 
                               fill="#ef4444"
                               className="animate-pulse"
                             />
                           );
                         }
                       }
                     }
                     
                     // Combine all layers in proper order
                     paths.push(
                       <g key="edges">{edges}</g>,
                       <g key="nodes">{nodeShapes}</g>,
                       <g key="labels">{labels}</g>,
                       <g key="runner">{progressIndicators}</g>
                     );
                    
                    return paths;
                  })()}
                </svg>
              </div>
              

            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs opacity-60">
          Data is stored locally in your browser (localStorage). This is a prototype.
        </div>
      </div>

      {/* Decision Popup */}
      {showDecisionPopup && currentDecisionNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Decision Point: {currentDecisionNode.title}
              </h3>
              <p className="text-sm text-gray-600">
                Choose which path to take:
              </p>
            </div>
            
            <div className="space-y-3">
              {currentDecisionNode.children?.map((childId) => {
                const child = get(childId);
                if (!child) return null;
                
                return (
                  <button
                    key={childId}
                    onClick={() => handleDecisionChoice(childId)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{child.title}</div>
                        <div className="text-sm text-gray-500 capitalize">{child.kind}</div>
                      </div>
                      {child.kind === "action" && (
                        <div className="text-xs text-gray-400">
                          {msToHuman(child.defaultDurationMs)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowDecisionPopup(false);
                  setCurrentDecisionNode(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="overflow-auto">
      <ul className="mt-3">
        {renderNode(rootId)}
      </ul>
    </div>
  );
}
