'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  signedUrl: string;
  storagePath: string;
}

export default function EbookViewerClient({ signedUrl, storagePath }: Props) {
  const router = useRouter();
  const [zoom, setZoom] = useState<string>('page-width');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Load/save notes to localStorage (wire to SQL later)
  useEffect(() => {
    const key = `ebook-notes:${storagePath}`;
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (saved) setNotes(saved);
  }, [storagePath]);
  useEffect(() => {
    const key = `ebook-notes:${storagePath}`;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, notes);
    }
  }, [notes, storagePath]);

  const iframeSrc = useMemo(() => {
    const hash = `#toolbar=1&navpanes=0&scrollbar=1&zoom=${encodeURIComponent(zoom)}`;
    return `${signedUrl}${hash}`;
  }, [signedUrl, zoom]);

  function handleFullscreen() {
    const elem = containerRef.current;
    if (elem && elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => router.push('/dashboard/ebooks')}>Back</Button>
        <a href={signedUrl} target="_blank" rel="noreferrer">
          <Button variant="outline">Open in new tab</Button>
        </a>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zoom</span>
          <Select value={zoom} onValueChange={setZoom}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Zoom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page-width">Fit width</SelectItem>
              <SelectItem value="page-fit">Fit page</SelectItem>
              <SelectItem value="100">100%</SelectItem>
              <SelectItem value="125">125%</SelectItem>
              <SelectItem value="150">150%</SelectItem>
              <SelectItem value="200">200%</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => setLeftOpen((v) => !v)}>{leftOpen ? 'Hide Notes' : 'Show Notes'}</Button>
        <Button variant="outline" onClick={() => setRightOpen((v) => !v)}>{rightOpen ? 'Hide TOC' : 'Show TOC'}</Button>
        <Button variant="outline" onClick={handleFullscreen}>Fullscreen</Button>
      </div>

      <div className="flex gap-3">
        {leftOpen && (
          <aside className="w-72 shrink-0 border rounded p-2 h-[80vh] flex flex-col">
            <div className="text-sm font-medium mb-2">Notes</div>
            <textarea
              className="flex-1 w-full resize-none border rounded p-2 text-sm"
              placeholder="Write notes here. Use [p.123] to jump to a page."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </aside>
        )}

        <div ref={containerRef} className="flex-1 border rounded">
          <iframe src={iframeSrc} className="w-full h-[80vh]" />
        </div>

        {rightOpen && (
          <aside className="w-64 shrink-0 border rounded p-2 h-[80vh] overflow-auto">
            <div className="text-sm font-medium mb-2">Table of Contents</div>
            <div className="text-xs text-muted-foreground">TOC not implemented yet (requires PDF.js/ePub.js). Coming next.</div>
          </aside>
        )}
      </div>
    </div>
  );
}
