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
export default function BranchingTimelines() {
  const [graph, setGraph] = useState<Graph>(() => loadGraph());
  const [focusNodeId, setFocusNodeId] = useState<string>(graph.rootId); // zoom target
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const { runningActionId, elapsedMs, start, stop } = useActionTimer();
  const undoStack = useRef<Graph[]>([]);

  // persist
  useEffect(() => saveGraph(graph), [graph]);

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
      nodes: { ...g.nodes, [id]: node, [parentId]: { ...g.nodes[parentId], children: [...g.nodes[parentId].children, id] } },
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
        children: newNodes[node.parentId].children.filter((c) => c !== id),
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
    // optional: zoom into the chosen branch automatically
    setFocusNodeId(childId);
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
                <span className="text-xs opacity-50">{focused.children.length} item(s)</span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {focused.children.map((cid) => {
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
        {n.children.length > 0 && (
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
