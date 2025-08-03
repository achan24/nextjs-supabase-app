'use client';

import { useState } from 'react';
import CustomMarkdownPreview from '../components/CustomMarkdownPreview';
import { Note } from '../types';

export default function VideoTestPage() {
  const [testContent, setTestContent] = useState(`# Video Embedding Test

This page demonstrates video embedding functionality in the Obsidian clone.

## YouTube Video (Public Domain)
[Big Buck Bunny](https://www.youtube.com/watch?v=YE7VzlLtp-4)

## YouTube Short Link
[Short YouTube Link](https://youtu.be/YE7VzlLtp-4)

## YouTube Shorts
[YouTube Shorts Video](https://www.youtube.com/shorts/tl7m1YGM1XQ)

## Regular Link (should not embed)
[Regular Website](https://example.com)

## Image (should display as image)
![Sample Image](https://picsum.photos/400/300)

## Mixed Content
Here's some text with a [YouTube video](https://www.youtube.com/watch?v=YE7VzlLtp-4) embedded in the middle of a paragraph.

### Code Example
\`\`\`javascript
// This is a code block
console.log("Hello, World!");
\`\`\`

## Multiple Videos
[Video 1](https://www.youtube.com/watch?v=YE7VzlLtp-4)
[Video 2](https://youtu.be/YE7VzlLtp-4)
`);

  const mockNotes: Note[] = [
    {
      id: '1',
      title: 'Test Note',
      content: 'This is a test note',
      user_id: 'user1',
      tags: ['test'],
      is_favorite: false,
      is_template: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString()
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Video Embedding Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Markdown Input</h2>
          <textarea
            value={testContent}
            onChange={(e) => setTestContent(e.target.value)}
            className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="Enter markdown content with video links..."
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          <div className="border border-gray-300 rounded-md h-96 overflow-y-auto">
            <CustomMarkdownPreview
              content={testContent}
              allNotes={mockNotes}
              onNoteSelect={() => {}}
            />
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-md">
        <h3 className="font-semibold mb-2">Supported Video Formats:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>YouTube:</strong> <code>[Title](https://youtube.com/watch?v=VIDEO_ID)</code> or <code>[Title](https://youtu.be/VIDEO_ID)</code></li>
          <li><strong>YouTube Shorts:</strong> <code>[Title](https://www.youtube.com/shorts/VIDEO_ID)</code></li>
          <li><strong>YouTube Embed:</strong> <code>[Title](https://www.youtube.com/embed/VIDEO_ID)</code></li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Videos are automatically embedded using the remark plugin during markdown parsing.
        </p>
      </div>
    </div>
  );
} 