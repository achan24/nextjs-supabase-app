'use client';

import { useState, useEffect, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Note, EditorState } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Maximize, Minimize, Save, Star, StarOff, Tag, X, Video, Clock } from 'lucide-react';
import { useYouTube } from './useYouTube';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import CustomMarkdownPreview from './CustomMarkdownPreview';
import HybridEditor from './HybridEditor';
import { remarkYoutubeEmbed } from './remarkYoutubeEmbed';
import { remarkTimestampLinks } from './remarkTimestampLinks';
import { rehypeTimestampLinks } from './rehypeTimestampLinks';

interface MarkdownEditorProps {
  note: Note;
  onUpdate: (noteId: string, updates: Partial<Note>) => void;
  editorState: EditorState;
  onEditorStateChange: (state: EditorState) => void;
  onNoteSelect?: (note: Note) => void;
  allNotes?: Note[];
}

export default function MarkdownEditor({
  note,
  onUpdate,
  editorState,
  onEditorStateChange,
  onNoteSelect,
  allNotes = []
}: MarkdownEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags.join(', '));
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState(note.content);
  const [lastSavedTitle, setLastSavedTitle] = useState(note.title);
  const [lastSavedTags, setLastSavedTags] = useState(note.tags.join(', '));
  const { getActiveTime, seekTo } = useYouTube();

  // Process content to make timestamps clickable
  const processedContent = content.replace(/\[(\d{1,2}):(\d{2})\]/g, (match, minutes, seconds) => {
    // Convert timestamp to clickable link
    return `[${match}](#timestamp-${minutes}-${seconds})`;
  });

  const saveNote = useCallback(() => {
    console.log('[Obsidian Auto-Save] Saving note:', note.id, 'Title:', title);
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    onUpdate(note.id, {
      title,
      content,
      tags: tagArray,
      last_accessed_at: new Date().toISOString()
    });
    const saveTime = new Date().toISOString();
    setLastSaved(saveTime);
    onEditorStateChange({
      ...editorState,
      lastSaved: saveTime
    });
    console.log('[Obsidian Auto-Save] Note saved at:', saveTime);
  }, [title, content, tags, note.id, onUpdate, editorState, onEditorStateChange]);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags.join(', '));
  }, [note]);

  // Track if note has been loaded and user has made changes
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [hasUserChanges, setHasUserChanges] = useState(false);

  // Mark note as loaded when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags.join(', '));
    setNoteLoaded(true);
    setHasUserChanges(false);
    console.log('[Obsidian Auto-Save] Note loaded:', note.title);
  }, [note]);

  // Track user changes (not initial load)
  useEffect(() => {
    if (!noteLoaded) return; // Don't track changes during initial load
    
    const titleChanged = title !== note.title;
    const contentChanged = content !== note.content;
    const tagsChanged = tags !== note.tags.join(', ');
    
    const hasChanges = titleChanged || contentChanged || tagsChanged;
    setHasUserChanges(hasChanges);
    
    console.log('[Obsidian Auto-Save] User changes detected:', {
      titleChanged,
      contentChanged,
      tagsChanged,
      hasChanges
    });
  }, [title, content, tags, note.title, note.content, note.tags, noteLoaded]);

  // Debounced auto-save effect - only trigger when user makes changes
  useEffect(() => {
    if (!editorState.autoSave || !noteLoaded || !hasUserChanges) return;

    console.log('[Obsidian Auto-Save] Debounced auto-save triggered');
    
    const handler = setTimeout(() => {
      console.log('[Obsidian Auto-Save] Auto-save timeout triggered - user stopped editing');
      saveNote();
      setHasUserChanges(false); // Reset after saving
    }, 2000); // 2 seconds after last change

    return () => {
      clearTimeout(handler); // Cancel previous timeout on change
    };
  }, [hasUserChanges, editorState.autoSave, saveNote, noteLoaded]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  const handleTagsSave = () => {
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    onUpdate(note.id, { tags: tagArray });
    setIsEditingTags(false);
    setLastSaved(new Date().toISOString());
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    const newTags = currentTags.filter(tag => tag !== tagToRemove);
    setTags(newTags.join(', '));
    onUpdate(note.id, { tags: newTags });
  };

  // Process double bracket links
  const processDoubleBracketLinks = (text: string) => {
    if (editorState.mode !== 'preview') return text;
    
    return text.replace(/\[\[([^\]]+)\]\]/g, (match, noteTitle) => {
      const targetNote = allNotes.find(n => 
        n.title.toLowerCase() === noteTitle.toLowerCase() && n.id !== note.id
      );
      
      if (targetNote && onNoteSelect) {
        return `<a href="#" onclick="event.preventDefault(); window.dispatchEvent(new CustomEvent('noteSelect', {detail: '${targetNote.id}'}));" class="text-purple-600 hover:text-purple-800 underline cursor-pointer">${noteTitle}</a>`;
      } else {
        return `<span class="text-gray-500 italic">${noteTitle}</span>`;
      }
    });
  };

  // Handle note selection from custom event
  useEffect(() => {
    const handleNoteSelect = (event: CustomEvent) => {
      const noteId = event.detail;
      const targetNote = allNotes.find(n => n.id === noteId);
      if (targetNote && onNoteSelect) {
        onNoteSelect(targetNote);
      }
    };

    window.addEventListener('noteSelect', handleNoteSelect as EventListener);
    return () => {
      window.removeEventListener('noteSelect', handleNoteSelect as EventListener);
    };
  }, [allNotes, onNoteSelect]);

  const toggleFavorite = () => {
    onUpdate(note.id, { is_favorite: !note.is_favorite });
  };

  const toggleFullScreen = () => {
    onEditorStateChange({
      ...editorState,
      isFullScreen: !editorState.isFullScreen
    });
  };

  const toggleMode = () => {
    // Cycle through edit -> preview -> hybrid -> edit
    const modeCycle = ['edit', 'preview', 'hybrid'] as const;
    const currentIndex = modeCycle.indexOf(editorState.mode);
    const nextIndex = (currentIndex + 1) % modeCycle.length;
    const newMode = modeCycle[nextIndex];
    
    onEditorStateChange({
      ...editorState,
      mode: newMode
    });
  };

  const showVideoHelp = () => {
    const videoHelp = `Video Embedding Examples:

YouTube: [Video Title](https://youtube.com/watch?v=VIDEO_ID)
Short: [Video Title](https://youtu.be/VIDEO_ID)
Shorts: [Video Title](https://youtube.com/shorts/VIDEO_ID)

Just paste a YouTube URL and it will be automatically embedded!`;
    
    alert(videoHelp);
  };

  const toMMSS = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const seekToTime = (timestamp: string) => {
    // Extract MM:SS from [MM:SS] format
    const timeMatch = timestamp.match(/\[(\d{1,2}):(\d{2})\]/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      const totalSeconds = minutes * 60 + seconds;
      
      // Use the seekTo function from YouTube context
      seekTo(totalSeconds);
    }
  };

  const insertTimestamp = () => {
    const t = getActiveTime();
    if (t == null) {
      // Fallback to manual input if player not ready
      promptForManualTime();
      return;
    }
    
    const timestamp = `[${toMMSS(t)}] `;
    const newContent = content + '\n' + timestamp;
    setContent(newContent);
  };

  const promptForManualTime = () => {
    // Show a more helpful prompt with instructions
    const manualTime = prompt(
      'Enter the current video time (MM:SS format):\n\n' +
      'Tip: You can copy the time from the video player.\n' +
      'Example: 05:30 for 5 minutes 30 seconds',
      '00:00'
    );
    
    if (manualTime) {
      // Validate time format
      const timeRegex = /^(\d{1,2}):(\d{2})$/;
      const match = manualTime.match(timeRegex);
      
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        
        if (seconds < 60) {
          const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          const timestamp = `[${formattedTime}] `;
          const newContent = content + '\n' + timestamp;
          setContent(newContent);
        } else {
          alert('Invalid time format. Use MM:SS (e.g., 05:30)');
        }
      } else {
        alert('Invalid time format. Use MM:SS (e.g., 05:30)');
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${editorState.isFullScreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveNote}
            className="text-lg font-semibold"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFavorite}
            className={note.is_favorite ? 'text-yellow-500' : 'text-gray-400'}
          >
            {note.is_favorite ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
          </Button>
          
          {/* Tags */}
          <div className="flex items-center gap-2 ml-4">
            <Tag className="h-4 w-4 text-gray-400" />
            {isEditingTags ? (
              <div className="flex items-center gap-1">
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTagsSave();
                    if (e.key === 'Escape') {
                      setTags(note.tags.join(', '));
                      setIsEditingTags(false);
                    }
                  }}
                  onBlur={handleTagsSave}
                  placeholder="Add tags..."
                  className="w-48 text-sm"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {note.tags.length > 0 ? (
                  note.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">No tags</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingTags(true)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Tag className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleMode}
            title={
              editorState.mode === 'edit' ? 'Switch to Preview' : 
              editorState.mode === 'preview' ? 'Switch to Hybrid' : 
              'Switch to Edit'
            }
          >
            {editorState.mode === 'edit' ? <Eye className="h-4 w-4" /> : 
             editorState.mode === 'preview' ? <EyeOff className="h-4 w-4" /> : 
             <Eye className="h-4 w-4" />}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={showVideoHelp}
            title="Video Embedding Help"
          >
            <Video className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={insertTimestamp}
            title="Insert Timestamp"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullScreen}>
            {editorState.isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={saveNote}>
            <Save className="h-4 w-4" />
          </Button>

        </div>
      </div>



      {/* Status Bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-1 text-xs text-gray-500 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
        <div className="flex items-center gap-2 md:gap-4">
          <span>Words: {content.split(/\s+/).filter(word => word.length > 0).length}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            editorState.mode === 'edit' 
              ? 'bg-blue-100 text-blue-700' 
              : editorState.mode === 'preview'
              ? 'bg-green-100 text-green-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {editorState.mode === 'edit' ? 'Edit Mode' : 
             editorState.mode === 'preview' ? 'Preview Mode' : 
             'Hybrid Mode'}
          </span>
          {editorState.lastSaved && (
            <span>Last saved: {new Date(editorState.lastSaved).toLocaleTimeString()}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editorState.autoSave && (
            <span className="text-green-600">
              {lastSaved ? `Auto-saved at ${new Date(lastSaved).toLocaleTimeString()}` : 'Auto-save enabled'}
            </span>
          )}

        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {editorState.mode === 'preview' ? (
          <div className="h-full overflow-y-auto">
            <CustomMarkdownPreview
              content={content}
              allNotes={allNotes}
              onNoteSelect={onNoteSelect || (() => {})}
            />
          </div>
        ) : editorState.mode === 'hybrid' ? (
          <HybridEditor
            content={content}
            onChange={(value) => setContent(value || '')}
            allNotes={allNotes}
            onNoteSelect={onNoteSelect || (() => {})}
          />
        ) : (
          <MDEditor
            value={content}
            onChange={(value) => setContent(value || '')}
            preview="edit"
            height="100%"
            className="border-none"
            previewOptions={{
              remarkPlugins: [remarkGfm, remarkYoutubeEmbed, remarkTimestampLinks],
              rehypePlugins: [rehypeRaw, rehypeTimestampLinks],
            }}
            textareaProps={{
              placeholder: 'Start writing your note...\n\nUse [[Note Title]] to link to other notes.',
              style: {
                fontSize: '14px',
                lineHeight: '1.6'
              }
            }}
          />
        )}
      </div>
    </div>
  );
} 