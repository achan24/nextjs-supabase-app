import { useCallback } from 'react';
import { Node, XYPosition } from 'reactflow';
import throttle from 'lodash-es/throttle';

/**
 * Returns a mousedown handler for a resize handle + the inline style for it.
 * `corner` is 'nw' | 'ne' | 'se' | 'sw'
 */
export default function useResizeHandle(
  corner: 'nw' | 'ne' | 'se' | 'sw',
  nodeId: string,
  setNodes: (updater: (nodes: Node[]) => Node[]) => void
) {
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Do not stop propagation; let the click bubble to select the node

      const start = { x: e.clientX, y: e.clientY };
      const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
      const origin: XYPosition = { x: rect.left, y: rect.top };

      const move = throttle((ev: MouseEvent) => {
        ev.preventDefault();
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;

        setNodes(nodes =>
          nodes.map(n => {
            if (n.id !== nodeId) return n;

            const width  = Math.max(80, (n.width ?? 180) + (corner.includes('e') ? dx : -dx));
            const height = Math.max(40, (n.height ?? 60) + (corner.includes('s') ? dy : -dy));

            return {
              ...n,
              width,
              height,
              style: { ...(n.style || {}), width, height },
              data: { ...n.data, width, height },
            };
          })
        );
      }, 16); // ~60 fps

      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };

      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    },
    [corner, nodeId, setNodes]
  );

  const style = {
    width: 8,
    height: 8,
    background: '#1e90ff',
    position: 'absolute' as const,
    cursor:
      corner === 'nw' || corner === 'se'
        ? 'nwse-resize'
        : 'nesw-resize',
    ...(corner.includes('n') ? { top: -4 } : { bottom: -4 }),
    ...(corner.includes('w') ? { left: -4 } : { right: -4 }),
    zIndex: 10,
    borderRadius: 2,
  };

  return { onMouseDown, style };
} 