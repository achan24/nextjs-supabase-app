'use client';

import React from 'react';

export type NodeKind = "action" | "decision";

export interface TimelineNode {
  id: string;
  title: string;
  kind: NodeKind;
  children?: string[];
  defaultDurationMs?: number;
}

interface Graph {
  nodes: Record<string, TimelineNode>;
  rootId: string;
  lastEdited: number;
}

function toMermaid(rootId: string, nodes: Record<string, TimelineNode>) {
  const lines = ["flowchart LR"];
  const seen = new Set<string>();

  function walk(id: string) {
    if (seen.has(id)) return;
    seen.add(id);
    const n = nodes[id];
    if (!n) return;
    
    const box = n.kind === "decision" 
      ? `${id}{${n.title}}`
      : `${id}[${n.title}]`;
    
    lines.push(box);

    (n.children ?? []).forEach((cid) => {
      const child = nodes[cid];
      if (child) {
        const childBox = child.kind === "decision"
          ? `${cid}{${child.title}}`
          : `${cid}[${child.title}]`;
        lines.push(`${box} --> ${childBox}`);
        walk(cid);
      }
    });
  }

  walk(rootId);
  return lines.join("\n");
}

interface MermaidTimelineProps {
  graph: Graph;
}

export default function MermaidTimeline({ graph }: MermaidTimelineProps) {
  const mermaidCode = toMermaid(graph.rootId, graph.nodes);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-4">Timeline Preview (Mermaid)</h3>
      <div className="bg-gray-50 rounded p-3 font-mono text-sm overflow-x-auto">
        <pre>{mermaidCode}</pre>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        <p>Copy this code to <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Mermaid Live Editor</a> to visualize your timeline.</p>
      </div>
    </div>
  );
}
