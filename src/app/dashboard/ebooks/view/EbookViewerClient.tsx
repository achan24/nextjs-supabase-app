'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface Props {
  signedUrl: string;
  storagePath: string;
}

interface BookmarkItem {
  id: string;
  page: number;
  label: string;
  createdAt: number;
}

export default function EbookViewerClient({ signedUrl, storagePath }: Props) {
  const router = useRouter();
  const [zoom, setZoom] = useState<string>('page-width');
  const [leftOpen, setLeftOpen] = useState(false); // TOC placeholder
  const [rightOpen, setRightOpen] = useState(true); // Notes + Bookmarks
  const [notes, setNotes] = useState('');
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [pageInput, setPageInput] = useState<string>('1');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)') : null;
    if (mq) {
      const update = () => setIsMobile(mq.matches);
      update();
      mq.addEventListener?.('change', update);
      return () => mq.removeEventListener?.('change', update);
    }
  }, []);

  useEffect(() => {
    if (isMobile) {
      setLeftOpen(false);
      setRightOpen(false);
    }
  }, [isMobile]);

  // Load/save notes and bookmarks to localStorage (wire to SQL later)
  useEffect(() => {
    const nk = `ebook-notes:${storagePath}`;
    const bk = `ebook-bookmarks:${storagePath}`;
    const savedNotes = typeof window !== 'undefined' ? window.localStorage.getItem(nk) : null;
    const savedBookmarks = typeof window !== 'undefined' ? window.localStorage.getItem(bk) : null;
    if (savedNotes) setNotes(savedNotes);
    if (savedBookmarks) {
      try { setBookmarks(JSON.parse(savedBookmarks)); } catch {}
    }
  }, [storagePath]);
  useEffect(() => {
    const nk = `ebook-notes:${storagePath}`;
    if (typeof window !== 'undefined') window.localStorage.setItem(nk, notes);
  }, [notes, storagePath]);
  useEffect(() => {
    const bk = `ebook-bookmarks:${storagePath}`;
    if (typeof window !== 'undefined') window.localStorage.setItem(bk, JSON.stringify(bookmarks));
  }, [bookmarks, storagePath]);

  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams();
    params.set('toolbar', '1');
    params.set('navpanes', '0');
    params.set('scrollbar', '1');
    params.set('zoom', zoom);
    params.set('page', String(currentPage));
    const hash = `#${params.toString()}`;
    return `${signedUrl}${hash}`;
  }, [signedUrl, zoom, currentPage]);

  function handleFullscreen() {
    const elem = containerRef.current;
    if (elem && elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
  }

  function goToPage() {
    const n = Number(pageInput);
    if (!Number.isFinite(n) || n <= 0) return;
    setCurrentPage(Math.floor(n));
  }

  function addBookmark() {
    const n = currentPage;
    const label = `Page ${n}`;
    const item: BookmarkItem = { id: crypto.randomUUID(), page: n, label, createdAt: Date.now() };
    setBookmarks((prev) => [item, ...prev]);
  }

  function startEditBookmark(bm: BookmarkItem) {
    setEditingBookmarkId(bm.id);
    setEditingLabel(bm.label);
  }
  function saveEditBookmark(id: string) {
    setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, label: editingLabel } : b)));
    setEditingBookmarkId(null);
    setEditingLabel('');
  }

  function openBookmark(bm: BookmarkItem) {
    setCurrentPage(bm.page);
    setPageInput(String(bm.page));
  }

  function deleteBookmark(id: string) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" onClick={() => router.push('/dashboard/ebooks')}>Back</Button>
        <a href={`${signedUrl}#page=${currentPage}&zoom=${encodeURIComponent(zoom)}`} target="_blank" rel="noreferrer">
          <Button variant="outline">Open in new tab</Button>
        </a>
        {isMobile && (
          <Button onClick={() => window.open(`${signedUrl}#page=${currentPage}&zoom=${encodeURIComponent(zoom)}`, '_blank')}>Open Externally</Button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zoom</span>
          <Select value={zoom} onValueChange={setZoom}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Zoom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50%</SelectItem>
              <SelectItem value="67">67%</SelectItem>
              <SelectItem value="75">75%</SelectItem>
              <SelectItem value="90">90%</SelectItem>
              <SelectItem value="100">100%</SelectItem>
              <SelectItem value="125">125%</SelectItem>
              <SelectItem value="150">150%</SelectItem>
              <SelectItem value="200">200%</SelectItem>
              <SelectItem value="page-width">Fit width</SelectItem>
              <SelectItem value="page-fit">Fit page</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Page</span>
          <Input className="w-20" value={pageInput} onChange={(e) => setPageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') goToPage(); }} />
          <Button variant="outline" onClick={goToPage}>Go</Button>
          <Button variant="outline" onClick={addBookmark}>Add Bookmark</Button>
        </div>
        <Button variant="outline" onClick={() => setLeftOpen((v) => !v)} className="hidden md:inline-flex">{leftOpen ? 'Hide TOC' : 'Show TOC'}</Button>
        <Button variant="outline" onClick={() => setRightOpen((v) => !v)} className="hidden md:inline-flex">{rightOpen ? 'Hide Notes' : 'Show Notes'}</Button>
        <Button variant="outline" onClick={handleFullscreen} className="hidden md:inline-flex">Fullscreen</Button>
      </div>

      <div className="flex gap-3">
        {leftOpen && (
          <aside className="w-64 shrink-0 border rounded p-2 h-[80vh] overflow-auto hidden md:block">
            <div className="text-sm font-medium mb-2">Table of Contents</div>
            <div className="text-xs text-muted-foreground">TOC not implemented yet (requires PDF.js/ePub.js). Coming next.</div>
          </aside>
        )}

        <div
          ref={containerRef}
          className="flex-1 border rounded md:h-[80vh] h-[calc(100vh-160px)] overflow-auto"
          style={{ WebkitOverflowScrolling: 'touch' as any }}
        >
          <iframe key={`${currentPage}-${zoom}`} src={iframeSrc} className="w-full md:h-full h-[calc(100vh-160px)]" />
        </div>

        {rightOpen && (
          <aside className="w-80 shrink-0 border rounded p-2 h-[80vh] flex-col gap-3 hidden md:flex">
            <div>
              <div className="text-sm font-medium mb-2">Bookmarks</div>
              {bookmarks.length === 0 ? (
                <div className="text-xs text-muted-foreground">No bookmarks yet.</div>
              ) : (
                <ul className="space-y-1">
                  {bookmarks.map((bm) => (
                    <li key={bm.id} className="flex items-center justify-between gap-2 text-sm">
                      {editingBookmarkId === bm.id ? (
                        <>
                          <Input className="h-8" value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} />
                          <Button size="sm" variant="outline" onClick={() => saveEditBookmark(bm.id)}>Save</Button>
                        </>
                      ) : (
                        <>
                          <button className="text-blue-600 hover:underline" onClick={() => openBookmark(bm)}>{bm.label}</button>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => startEditBookmark(bm)}>Edit</Button>
                            <Button size="sm" variant="outline" onClick={() => deleteBookmark(bm.id)}>Remove</Button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              <div className="text-sm font-medium mb-2">Notes</div>
              <textarea
                className="flex-1 w-full resize-none border rounded p-2 text-sm"
                placeholder="Write notes here. Use [p.123] to jump to a page."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
