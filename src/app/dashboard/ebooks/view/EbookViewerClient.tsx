'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
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

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function EbookViewerClient({ signedUrl, storagePath }: Props) {
  const router = useRouter();
  
  // Detect file type from storage path
  const fileExtension = useMemo(() => {
    const path = storagePath.toLowerCase();
    if (path.endsWith('.pdf')) return 'pdf';
    if (path.endsWith('.epub')) return 'epub';
    return 'pdf'; // default to PDF
  }, [storagePath]);

  const [zoom, setZoom] = useState<string>(fileExtension === 'epub' ? '16' : 'page-width');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
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
  
  // AI Reading Assistant state
  const [selectedText, setSelectedText] = useState<string>('');
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

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
  const viewerBase = fileExtension === 'epub' ? '/epub-viewer.html' : '/pdfjs-viewer.html';
  const fileUrl = useMemo(() => {
    return signedUrl;
  }, [signedUrl]);
  const viewerSrc = useMemo(() => `${viewerBase}?file=${encodeURIComponent(fileUrl)}`, [viewerBase, fileUrl]);

  const externalHref = useMemo(() => {
    const hashParam = fileExtension === 'epub' 
      ? `chapter=${currentPage}&fontSize=${zoom}` 
      : `page=${currentPage}&zoom=${encodeURIComponent(zoom)}`;
    return `${viewerBase}?file=${encodeURIComponent(fileUrl)}#${hashParam}`;
  }, [viewerBase, fileUrl, currentPage, zoom, fileExtension]);

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

  // Listen for text selection
  useEffect(() => {
    function handleSelectionChange() {
      handleTextSelection();
    }
    
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + B for quick bookmark
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        if (ebookId && currentPage) {
          const n = currentPage;
          const label = fileExtension === 'epub' ? `Chapter ${n}` : `Page ${n}`;
          addBookmarkSql(ebookId, n, label)
            .then((row) => {
              setBookmarks((prev) => [{ id: row.id, page: row.page, label: row.label, createdAt: Date.parse(row.created_at) }, ...prev]);
              toast.success(`Bookmarked ${fileExtension === 'epub' ? 'chapter' : 'page'} ${n}`);
            })
            .catch((e) => {
              console.warn('[Ebooks] add bookmark failed', e);
              toast.error('Failed to add bookmark');
            });
        }
      }

      // Ctrl/Cmd + L for go to last read
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        if (currentPage) {
          sendToViewer({ type: 'ebook:go', page: currentPage });
          toast.success(`Jumped to ${fileExtension === 'epub' ? 'chapter' : 'page'} ${currentPage}`);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ebookId, currentPage, fileExtension]);

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
      // Set zoom and navigate to saved position
      sendToViewer({ type: 'ebook:setZoom', zoom });
      sendToViewer({ type: 'ebook:go', page: currentPage });
    };
    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedUrl, currentPage, zoom]);

  function handleFullscreen() {
    const elem = containerRef.current;
    if (elem && elem.requestFullscreen) { elem.requestFullscreen().catch(() => {}); }
  }

  function addBookmark() {
    if (!ebookId) return;
    const n = currentPage;
    const label = fileExtension === 'epub' ? `Chapter ${n}` : `Page ${n}`;
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

  // AI Reading Assistant functions
  async function sendAIMessage() {
    if (!aiInput.trim() || isAiLoading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: aiInput,
      timestamp: new Date(),
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      // Prepare context with selected text and book info
      const context = selectedText ? `Selected text from the book: "${selectedText}"\n\n` : '';
      const bookContext = `Book: ${storagePath.split('/').pop()}\nCurrent page: ${currentPage}\n\n`;
      
      const messages = [
        {
          role: 'system',
          content: `You are an AI reading assistant helping the user understand and discuss a book. ${context}${bookContext}Provide thoughtful, helpful responses about the content.`
        },
        ...aiMessages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: aiInput }
      ];

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  aiResponse += parsed.content;
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }
      }

      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setAiMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[AI] Error:', error);
      toast.error('Failed to get AI response');
    } finally {
      setIsAiLoading(false);
    }
  }

  function handleTextSelection() {
    // Listen for text selection from the iframe
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      toast.success('Text selected! You can now discuss it with AI.');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" onClick={() => router.push('/dashboard/ebooks')}>Back</Button>
        <a href={externalHref} target="_blank" rel="noreferrer"><Button variant="outline">Open in new tab</Button></a>
        {isMobile && (<Button onClick={() => window.open(externalHref, '_blank')}>Open Externally</Button>)}



        {totalPages > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Progress:</span>
            <span className="font-medium">
              {fileExtension === 'epub' ? `Chapter ${currentPage}` : `Page ${currentPage} of ${totalPages}`}
            </span>
            {fileExtension === 'pdf' && (
              <span className="text-xs">
                ({Math.round((currentPage / totalPages) * 100)}%)
              </span>
            )}
          </div>
        )}

        <Button variant="outline" onClick={addBookmark}>Add Bookmark</Button>

        <Button 
          variant="default" 
          onClick={() => {
            sendToViewer({ type: 'ebook:go', page: currentPage });
            toast.success(`Jumped to ${fileExtension === 'epub' ? 'chapter' : 'page'} ${currentPage}`);
          }}
          disabled={!currentPage}
        >
          📖 Go to Last Read
        </Button>
        <Button variant="outline" onClick={() => setLeftOpen((v) => !v)} className="hidden md:inline-flex">{leftOpen ? 'Hide TOC' : 'Show TOC'}</Button>
        <Button variant="outline" onClick={() => setRightOpen((v) => !v)} className="hidden md:inline-flex">{rightOpen ? 'Hide Notes' : 'Show Notes'}</Button>
        <Button variant="outline" onClick={() => setAiOpen((v) => !v)} className="hidden md:inline-flex">{aiOpen ? 'Hide AI' : 'Show AI'}</Button>
        <Button variant="outline" onClick={handleFullscreen} className="hidden md:inline-flex" title="Fullscreen">⛶</Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => toast.info('Keyboard shortcuts: Ctrl+B (bookmark), Ctrl+L (go to last read)')}
          className="text-xs"
        >
          ⌨️
        </Button>
      </div>

      <div className="flex gap-3">
        {leftOpen && (
          <aside className="w-64 shrink-0 border rounded p-2 h-[80vh] overflow-auto hidden md:block">
            <div className="text-sm font-medium mb-2">Table of Contents</div>
            <div className="text-xs text-muted-foreground">TOC not implemented yet (requires PDF.js/ePub.js). Coming next.</div>
          </aside>
        )}

        <div ref={containerRef} className="flex-1 border rounded md:h-[80vh] h-[calc(100vh-160px)] overflow-auto" style={{ WebkitOverflowScrolling: 'touch' as any }}>
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
              <textarea className="flex-1 w-full resize-none border rounded p-2 text-sm" placeholder={`Write notes here. Use [${fileExtension === 'epub' ? 'ch.5' : 'p.123'}] to reference content.`} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => { if (ebookId) saveNotesSql(ebookId, notes).catch((err) => console.warn('[Ebooks] save notes failed', err)); }} />
              <div className="text-xs text-muted-foreground mt-2">Current {fileExtension === 'epub' ? 'chapter' : 'page'}: {currentPage} / {totalPages || '...'}</div>
            </div>
          </aside>
        )}

        {aiOpen && (
          <aside className="w-96 shrink-0 border rounded p-2 h-[80vh] flex-col gap-3 hidden md:flex">
            <div className="text-sm font-medium mb-2">AI Reading Assistant</div>
            
            {selectedText && (
              <div className="text-xs bg-blue-50 p-2 rounded mb-2">
                <div className="font-medium text-blue-800">Selected Text:</div>
                <div className="text-blue-700 mt-1">"{selectedText}"</div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setSelectedText('')}
                  className="mt-2 text-xs"
                >
                  Clear Selection
                </Button>
              </div>
            )}

            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-auto space-y-2 mb-2">
                {aiMessages.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Select text from the book and ask me anything about it!
                  </div>
                ) : (
                  aiMessages.map((msg) => (
                    <div key={msg.id} className={`text-sm p-2 rounded ${msg.role === 'user' ? 'bg-blue-100 ml-4' : 'bg-gray-100 mr-4'}`}>
                      <div className="font-medium text-xs mb-1">{msg.role === 'user' ? 'You' : 'AI'}</div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))
                )}
                {isAiLoading && (
                  <div className="text-sm p-2 rounded bg-gray-100 mr-4">
                    <div className="font-medium text-xs mb-1">AI</div>
                    <div className="text-muted-foreground">Thinking...</div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask about the selected text..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendAIMessage();
                    }
                  }}
                  disabled={isAiLoading}
                />
                <Button 
                  onClick={sendAIMessage} 
                  disabled={isAiLoading || !aiInput.trim()}
                  size="sm"
                >
                  Send
                </Button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
