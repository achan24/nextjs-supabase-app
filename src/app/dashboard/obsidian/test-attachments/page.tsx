'use client';

import { useState } from 'react';
import { Note, EditorState } from '../types';
import MarkdownEditor from '../components/MarkdownEditor';
import { FileAttachmentExample } from '../components/FileAttachmentExample';

export default function TestAttachmentsPage() {
  const [editorState, setEditorState] = useState<EditorState>({
    mode: 'edit',
    isFullScreen: false,
    autoSave: true,
    wordCount: 0,
    lastSaved: null
  });

  const [testNote, setTestNote] = useState<Note>({
    id: 'test-note',
    title: 'Test Note with Attachments',
    content: `# Test Note with File Attachments

This is a test note to demonstrate how file attachments work in Obsidian.

## How to Add Attachments

1. Click the 📎 (paperclip) button in the toolbar
2. Enter a file URL (like a PDF, image, etc.)
3. Optionally provide a display name
4. Click "Add Attachment"

The file will be downloaded and cached locally, so it won't need to be re-downloaded next time.

## Example Content

You can write your note content here, and then add attachments that will be cached locally for offline access.

`,
    user_id: 'test-user',
    tags: ['test', 'attachments'],
    is_favorite: false,
    is_template: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_accessed_at: new Date().toISOString()
  });

  const handleUpdateNote = (noteId: string, updates: Partial<Note>) => {
    setTestNote(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-gray-100 border-b p-4">
        <h1 className="text-2xl font-bold mb-2">File Attachment Test</h1>
        <p className="text-gray-600">
          This page demonstrates how to attach files to your Obsidian notes. 
          Files are cached locally for offline access.
        </p>
      </div>
      
      <div className="flex-1 flex">
        {/* Editor Section */}
        <div className="flex-1">
          <MarkdownEditor
            note={testNote}
            onUpdate={handleUpdateNote}
            editorState={editorState}
            onEditorStateChange={setEditorState}
            allNotes={[]}
          />
        </div>
        
        {/* Attachment Manager Section */}
        <div className="w-96 border-l bg-gray-50 p-4 overflow-y-auto">
          <FileAttachmentExample />
        </div>
      </div>
    </div>
  );
} 