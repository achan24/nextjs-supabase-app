'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import { Plus, Upload, Download, MonitorSmartphone, Image as ImageIcon, Type, Globe, ZoomIn, ZoomOut, Move, Trash2, Link as LinkIcon, Maximize2, Shapes } from "lucide-react";

/**
 * Infinite Canvas — Single-File Dropboard
 *
 * Aesthetic, modern infinite canvas where you can drop photos, text files, and websites —
 * all saved in a single JSON file (images embedded as data URLs).
 *
 * Features
 * - Pan (Space+Drag / Middle mouse / Two-finger trackpad) & Zoom (wheel/cmd+wheel + controls)
 * - Drop files/URLs directly on the canvas
 *   • Images => Image node (embedded as data URL for single-file exports)
 *   • .txt / text/* => Text node (editable)
 *   • URLs => Embedded website (iframe)
 * - Create nodes from toolbar (Text / Image URL / Website URL)
 * - Select, move, resize nodes; delete with toolbar or Backspace
 * - Export/Import .canvas.json (self-contained, one file)
 * - Snap-to-grid visuals, soft glassmorphism cards
 */

const GRID_SIZE = 24;
const INITIAL_SCALE = 1;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

// Types
const NodeTypes = {
  TEXT: "text",
  IMAGE: "image",
  WEB: "web",
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Helper: Download JSON as file
function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Canvas background grid CSS
const gridBg = {
  backgroundImage:
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent " +
    GRID_SIZE +
    "px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent " +
    GRID_SIZE +
    "px)",
};

export default function InfiniteCanvas() {
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: INITIAL_SCALE });
  const [isPanning, setIsPanning] = useState(false);
  const panState = useRef({ startX: 0, startY: 0, camX: 0, camY: 0 });

  // Keyboard delete
  useEffect(() => {
    function onKey(e) {
      if ((e.key === "Backspace" || e.key === "Delete") && selectedId) {
        setNodes((prev) => prev.filter((n) => n.id !== selectedId));
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  // Pan logic
  const onPointerDown = useCallback((e) => {
    const isSpace = e.shiftKey || e.button === 1 || e.buttons === 4 || e.button === 2 || e.getModifierState?.("Space");
    if (isSpace) {
      setIsPanning(true);
      panState.current = { startX: e.clientX, startY: e.clientY, camX: camera.x, camY: camera.y };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
  }, [camera]);

  const onPointerMove = useCallback((e) => {
    if (!isPanning) return;
    const dx = e.clientX - panState.current.startX;
    const dy = e.clientY - panState.current.startY;
    setCamera((c) => ({ ...c, x: panState.current.camX + dx, y: panState.current.camY + dy }));
  }, [isPanning]);

  const endPan = useCallback(() => setIsPanning(false), []);

  // Zoom with wheel / trackpad
  const onWheel = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? -0.1 : 0.1; // natural scroll
    setCamera((c) => {
      const newScale = clamp(c.scale * (1 + delta), MIN_SCALE, MAX_SCALE);
      // zoom towards mouse position
      const wx = (mouseX - c.x) / c.scale;
      const wy = (mouseY - c.y) / c.scale;
      const nx = mouseX - wx * newScale;
      const ny = mouseY - wy * newScale;
      return { x: nx, y: ny, scale: newScale };
    });
  }, []);

  // Convert screen to world coords
  const screenToWorld = useCallback(
    (sx, sy) => ({ x: (sx - camera.x) / camera.scale, y: (sy - camera.y) / camera.scale }),
    [camera]
  );

  // Create nodes
  const createTextNode = useCallback((pos, initialText = "Double-click to edit") => {
    const id = uid();
    const node = {
      id,
      type: NodeTypes.TEXT,
      x: pos.x,
      y: pos.y,
      width: 320,
      height: 160,
      data: { text: initialText, fontSize: 16 },
    };
    setNodes((n) => [...n, node]);
    setSelectedId(id);
  }, []);

  const createImageNode = useCallback((pos, dataUrl, name = "image") => {
    const id = uid();
    const node = { id, type: NodeTypes.IMAGE, x: pos.x, y: pos.y, width: 420, height: 280, data: { src: dataUrl, name } };
    setNodes((n) => [...n, node]);
    setSelectedId(id);
  }, []);

  const createWebNode = useCallback((pos, url) => {
    const id = uid();
    const node = { id, type: NodeTypes.WEB, x: pos.x, y: pos.y, width: 560, height: 360, data: { url } };
    setNodes((n) => [...n, node]);
    setSelectedId(id);
  }, []);

  // Drag & Drop handlers
  const onDrop = useCallback(
    async (e) => {
      e.preventDefault();
      const pos = screenToWorld(e.clientX, e.clientY);

      // Files first
      const files = Array.from(e.dataTransfer.files || []);
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          const dataUrl = await readFileAsDataURL(file);
          createImageNode(pos, dataUrl, file.name);
          return;
        }
        if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
          const text = await readFileAsText(file);
          createTextNode(pos, text.slice(0, 8000));
          return;
        }
      }

      // If text was dropped (possibly a URL)
      const plain = e.dataTransfer.getData("text/plain");
      if (plain) {
        const url = extractUrl(plain);
        if (url) {
          createWebNode(pos, url);
          return;
        }
        // Otherwise treat as text note
        createTextNode(pos, plain.slice(0, 8000));
      }
    },
    [createImageNode, createTextNode, createWebNode, screenToWorld]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // Tools
  const zoomIn = () => setCamera((c) => ({ ...c, scale: clamp(c.scale * 1.15, MIN_SCALE, MAX_SCALE) }));
  const zoomOut = () => setCamera((c) => ({ ...c, scale: clamp(c.scale / 1.15, MIN_SCALE, MAX_SCALE) }));
  const resetView = () => setCamera({ x: 0, y: 0, scale: INITIAL_SCALE });

  // Export/Import
  const exportFile = () => {
    const payload = { version: 1, createdAt: new Date().toISOString(), nodes };
    downloadJSON("canvas.dropboard.json", payload);
  };

  const importRef = useRef(null);
  const onImport = () => importRef.current?.click();
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await readFileAsText(file);
      const json = JSON.parse(txt);
      if (Array.isArray(json.nodes)) setNodes(json.nodes);
    } catch (err) {
      alert("Invalid file");
    } finally {
      e.target.value = "";
    }
  };

  // Add by URL helpers
  const addImageByUrl = async () => {
    const url = prompt("Image URL");
    if (!url) return;
    const pos = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
    // Keep as URL (not embedded) — still persisted in JSON; for full single-file, user can download image and drop it.
    createImageNode(pos, url, url);
  };

  const addWebsite = async () => {
    const url = prompt("Website URL (e.g., https://google.com)");
    if (!url) return;
    
    // Validate and clean the URL
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    try {
      new URL(cleanUrl); // Validate URL format
      const pos = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
      createWebNode(pos, cleanUrl);
    } catch (error) {
      alert('Please enter a valid URL (e.g., https://google.com)');
    }
  };

  const addText = () => {
    const pos = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
    createTextNode(pos);
  };

  // Selection helpers
  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes((n) => n.filter((x) => x.id !== selectedId));
    setSelectedId(null);
  };

  // Node interactions: drag & resize
  const beginDragNode = (e, id) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const start = { sx: e.clientX, sy: e.clientY, nx: node.x, ny: node.y };

    const onMove = (ev) => {
      const dx = (ev.clientX - start.sx) / camera.scale;
      const dy = (ev.clientY - start.sy) / camera.scale;
      setNodes((arr) => arr.map((n) => (n.id === id ? { ...n, x: start.nx + dx, y: start.ny + dy } : n)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const beginResize = (e, id) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const start = { sx: e.clientX, sy: e.clientY, w: node.width, h: node.height };
    const onMove = (ev) => {
      const dx = (ev.clientX - start.sx) / camera.scale;
      const dy = (ev.clientY - start.sy) / camera.scale;
      setNodes((arr) =>
        arr.map((n) => (n.id === id ? { ...n, width: Math.max(160, start.w + dx), height: Math.max(120, start.h + dy) } : n))
      );
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="w-full h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-16 left-4 right-4 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur border border-white/10 shadow-sm text-sm">Dropboard</div>
          <div className="hidden md:flex items-center gap-2 text-xs text-pink-400 font-bold">
            <span className="inline-flex items-center gap-1"><Move className="w-3.5 h-3.5"/> Space+Drag</span>
            <span className="inline-flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5"/> Scroll to zoom</span>
            <span className="inline-flex items-center gap-1"><Shapes className="w-3.5 h-3.5"/> Drop images, text, or URLs</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="bg-black/60 border border-white/30 hover:bg-black/80 text-pink-400 font-bold" onClick={zoomOut}>
            <ZoomOut className="w-4 h-4 mr-2"/>Zoom out
          </Button>
          <Button variant="secondary" className="bg-black/60 border border-white/30 hover:bg-black/80 text-pink-400 font-bold" onClick={zoomIn}>
            <ZoomIn className="w-4 h-4 mr-2"/>Zoom in
          </Button>
          <Button variant="secondary" className="bg-black/60 border border-white/30 hover:bg-black/80 text-pink-400 font-bold" onClick={resetView}>
            <Maximize2 className="w-4 h-4 mr-2"/>Fit
          </Button>
          <Button variant="secondary" className="bg-black/60 border border-white/30 hover:bg-black/80 text-pink-400 font-bold" onClick={exportFile}>
            <Download className="w-4 h-4 mr-2"/>Export
          </Button>
          <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
          <Button variant="secondary" className="bg-black/60 border border-white/30 hover:bg-black/80 text-pink-400 font-bold" onClick={onImport}>
            <Upload className="w-4 h-4 mr-2"/>Import
          </Button>
        </div>
      </div>

      {/* Left Toolbar */}
      <div className="absolute left-4 top-32 z-40 grid gap-2">
        <ToolButton icon={<Type className="w-4 h-4"/>} label="Text" onClick={addText} />
        <ToolButton icon={<ImageIcon className="w-4 h-4"/>} label="Image URL" onClick={addImageByUrl} />
        <ToolButton icon={<Globe className="w-4 h-4"/>} label="Website" onClick={addWebsite} />
        <ToolButton icon={<Trash2 className="w-4 h-4"/>} label="Delete" onClick={deleteSelected} disabled={!selectedId} />
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-[grab]"
        onPointerDown={onPointerDown}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onPointerMove={onPointerMove}
        onWheel={onWheel}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <div className="w-full h-full" style={gridBg}>
          <div
            className="relative w-full h-full"
            style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`, transformOrigin: "0 0" }}
            onMouseDown={() => setSelectedId(null)}
          >
            {nodes.map((n) => (
              <NodeCard
                key={n.id}
                node={n}
                selected={n.id === selectedId}
                onSelect={() => setSelectedId(n.id)}
                onDrag={(e) => beginDragNode(e, n.id)}
                onResize={(e) => beginResize(e, n.id)}
                setNodes={setNodes}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-3 left-0 right-0 z-40 flex items-center justify-center">
        <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs text-pink-400 font-bold">
          Tip: Drop images, .txt files, or paste a URL anywhere on the canvas.
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "group inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 backdrop-blur border border-white/30 shadow-lg hover:bg-black/80 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed text-pink-400 font-bold"
      }
    >
      <span className="w-5 h-5 inline-flex items-center justify-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function NodeCard({ node, selected, onSelect, onDrag, onResize, setNodes }) {
  const common = "absolute rounded-2xl shadow-xl border overflow-hidden";
  const ring = selected ? "ring-2 ring-cyan-400/80" : "ring-1 ring-white/10";

  const header = (
    <div
      className="cursor-[grab] active:cursor-[grabbing] select-none px-3 py-2 text-xs font-bold text-pink-400 bg-white/10 border-b border-white/20 flex items-center justify-between"
      onMouseDown={onDrag}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="truncate">
        {node.type === NodeTypes.TEXT && "Text"}
        {node.type === NodeTypes.IMAGE && (node.data?.name || "Image")}
        {node.type === NodeTypes.WEB && (node.data?.url || "Website")}
      </div>
      <div className="opacity-70">{Math.round(node.width)} × {Math.round(node.height)}</div>
    </div>
  );

  const resizeHandle = (
    <div
      onMouseDown={onResize}
      className="absolute bottom-1 right-1 w-4 h-4 rounded-md bg-white/30 border border-white/50 cursor-se-resize"
      title="Resize"
    />
  );

  return (
    <div
      className={`${common} ${ring} bg-white/10 backdrop-blur-lg`}
      style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {header}
      <div className="w-full h-[calc(100%-32px)] relative">
        {node.type === NodeTypes.TEXT && (
          <TextEditor node={node} setNodes={setNodes} />
        )}
        {node.type === NodeTypes.IMAGE && (
          <img src={node.data?.src} alt={node.data?.name || "image"} className="w-full h-full object-contain" draggable={false} />
        )}
        {node.type === NodeTypes.WEB && (
          <div className="w-full h-full bg-white flex flex-col">
            <div className="p-2 bg-gray-100 border-b text-xs text-gray-600">
              <a href={safeUrl(node.data?.url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {node.data?.url} ↗
              </a>
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              <div className="text-center">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Website preview not available</p>
                <p className="text-xs mt-1">Click the link above to open in new tab</p>
              </div>
            </div>
          </div>
        )}
        {resizeHandle}
      </div>
    </div>
  );
}

function TextEditor({ node, setNodes }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(node.data?.text || "");

  useEffect(() => setValue(node.data?.text || ""), [node.id]);

  const commit = () => {
    setNodes((arr) => arr.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, text: value } } : n)));
    setEditing(false);
  };

  return (
    <div className="p-3 w-full h-full">
      {editing ? (
        <textarea
          autoFocus
          className="w-full h-full bg-white/80 text-slate-900 rounded-xl p-3 outline-none"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") commit();
          }}
        />
      ) : (
        <div
          className="w-full h-full text-pink-400 whitespace-pre-wrap leading-relaxed text-sm overflow-auto"
          onDoubleClick={() => setEditing(true)}
        >
          {value || <span className="text-pink-400/60">Double-click to edit</span>}
        </div>
      )}
    </div>
  );
}

// Utils
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
function extractUrl(text) {
  try {
    const url = new URL(text.trim());
    return url.href;
  } catch (_) {
    // Fallback: find within text
    const m = text.match(/https?:\/\/[^\s]+/);
    return m ? m[0] : null;
  }
}
function safeUrl(u) {
  if (!u) return "about:blank";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}
