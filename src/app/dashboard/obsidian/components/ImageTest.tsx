'use client';

import MDEditor from '@uiw/react-md-editor';

export default function ImageTest() {
  const testContent = `# Image Test

This is a test of image rendering.

![Test Image](https://via.placeholder.com/400x300/0066cc/ffffff?text=Test+Image)

## Another Test

![Nature](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop)

## Internal Link Test

This note links to [[Another Note]] and [[Test Note]].

## Code Test

\`\`\`javascript
console.log("Hello World");
\`\`\`
`;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Markdown Editor Test</h1>
      <div className="border rounded-lg">
        <MDEditor
          value={testContent}
          preview="preview"
          height={400}
          className="border-none"
        />
      </div>
    </div>
  );
} 