'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { upsertEbookByPath, fetchBookmarks as fetchBookmarksSql, addBookmarkSql, updateBookmarkLabel, removeBookmark, fetchNotes as fetchNotesSql, saveNotes as saveNotesSql, saveProgress, getProgress } from '@/lib/timeline-db';

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
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [notes, setNotes] = useState('');
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ebookId, setEbookId] = useState<string | null>(null);

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
    if (isMobile) { setLeftOpen(false); setRightOpen(false); }
  }, [isMobile]);

  // Load SQL state for this ebook
  useEffect(() => {
    (async () => {
      try {
        const id = await upsertEbookByPath(storagePath);
        setEbookId(id);
        const [bms, note, progress] = await Promise.all([
          fetchBookmarksSql(id),
          fetchNotesSql(id),
          getProgress(storagePath),
        ]);
        setBookmarks(bms.map(b => ({ id: b.id, page: b.page, label: b.label, createdAt: Date.parse(b.created_at) })));
        if (note?.content) setNotes(note.content);
        if (progress?.last_page) setCurrentPage(progress.last_page);
        if (progress?.last_zoom) setZoom(progress.last_zoom);
      } catch (e) {
        console.warn('[Ebooks] load sql failed', e);
      }
    })();
  }, [storagePath]);

  // Persist notes/bookmarks
  useEffect(() => { if (typeof window !== 'undefined') window.localStorage.setItem(`ebook-notes:${storagePath}`, notes); }, [notes, storagePath]);
  useEffect(() => { if (typeof window !== 'undefined') window.localStorage.setItem(`ebook-bookmarks:${storagePath}`, JSON.stringify(bookmarks)); }, [bookmarks, storagePath]);
  // Persist progress when page/zoom change (debounced)
  useEffect(() => {
    const t = setTimeout(() => { saveProgress(storagePath, currentPage, zoom).catch(() => {}); }, 500);
    return () => clearTimeout(t);
  }, [storagePath, currentPage, zoom]);

  // Stable viewer URL – do not include page/zoom to avoid reload loops
  const viewerBase = '/pdfjs-viewer.html';
  const viewerSrc = useMemo(() => `${viewerBase}?file=${encodeURIComponent(signedUrl)}`, [signedUrl]);

  const externalHref = useMemo(
    () => `${viewerBase}?file=${encodeURIComponent(signedUrl)}#page=${currentPage}&zoom=${encodeURIComponent(zoom)}`,
    [signedUrl, currentPage, zoom]
  );

  // Listen to viewer state
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as any;
      if (data && data.type === 'ebook:viewer_state') {
        if (typeof data.page === 'number') setCurrentPage(data.page);
        if (typeof data.total === 'number') setTotalPages(data.total);
        if (typeof data.zoom === 'string') setZoom(data.zoom);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function sendToViewer(msg: any) {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      try { win.postMessage(msg, '*'); } catch {}
    }
  }

  // Initialize viewer once it loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const handleLoad = () => {
      sendToViewer({ type: 'ebook:setZoom', zoom });
      sendToViewer({ type: 'ebook:go', page: currentPage });
    };
    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedUrl]);

  function handleFullscreen() {
    const elem = containerRef.current;
    if (elem && elem.requestFullscreen) { elem.requestFullscreen().catch(() => {}); }
  }

  function addBookmark() {
    if (!ebookId) return;
    const n = currentPage;
    const label = `Page ${n}`;
    addBookmarkSql(ebookId, n, label)
      .then((row) => setBookmarks((prev) => [{ id: row.id, page: row.page, label: row.label, createdAt: Date.parse(row.created_at) }, ...prev]))
      .catch((e) => console.warn('[Ebooks] add bookmark failed', e));
  }

  function startEditBookmark(bm: BookmarkItem) { setEditingBookmarkId(bm.id); setEditingLabel(bm.label); }
  function saveEditBookmark(id: string) {
    updateBookmarkLabel(id, editingLabel)
      .then(() => setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, label: editingLabel } : b))))
      .catch((e) => console.warn('[Ebooks] update bookmark failed', e));
    setEditingBookmarkId(null);
    setEditingLabel('');
  }
  function openBookmark(bm: BookmarkItem) { sendToViewer({ type: 'ebook:go', page: bm.page }); }
  function deleteBookmark(id: string) {
    removeBookmark(id).catch((e) => console.warn('[Ebooks] delete bookmark failed', e));
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" onClick={() => router.push('/dashboard/ebooks')}>Back</Button>
        <a href={externalHref} target="_blank" rel="noreferrer"><Button variant="outline">Open in new tab</Button></a>
        {isMobile && (<Button onClick={() => window.open(externalHref, '_blank')}>Open Externally</Button>)}

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zoom</span>
          <Select value={zoom} onValueChange={(z) => { setZoom(z); sendToViewer({ type: 'ebook:setZoom', zoom: z }); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Zoom" /></SelectTrigger>
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

        <Button variant="outline" onClick={addBookmark}>Add Bookmark</Button>
        <Button variant="outline" onClick={() => {
          // Manual reload from storage
          const data = window.localStorage.getItem(`ebook-bookmarks:${storagePath}`);
          if (data) { try { setBookmarks(JSON.parse(data)); } catch {} }
        }}>Refresh Bookmarks</Button>
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

        <div ref={containerRef} className="flex-1 border rounded md:h:[80vh] h-[calc(100vh-160px)] overflow-auto" style={{ WebkitOverflowScrolling: 'touch' as any }}>
          <iframe ref={iframeRef} src={viewerSrc} className="w-full md:h-full h-[calc(100vh-160px)]" />
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
                          <button
                            className="text-blue-600 hover:underline text-left whitespace-normal break-words flex-1"
                            onClick={() => openBookmark(bm)}
                          >
                            {bm.label}
                          </button>
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
              <textarea className="flex-1 w-full resize-none border rounded p-2 text-sm" placeholder="Write notes here. Use [p.123] to jump to a page." value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => { if (ebookId) saveNotesSql(ebookId, notes).catch((err) => console.warn('[Ebooks] save notes failed', err)); }} />
              <div className="text-xs text-muted-foreground mt-2">Current page: {currentPage} / {totalPages || '...'}</div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
