'use client';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { remarkYoutubeEmbed } from '../components/remarkYoutubeEmbed';

export default function SimpleVideoTest() {
  const testMarkdown = `# Simple Video Test

This is a simple test of YouTube video embedding.

## YouTube Video
[Test Video](https://www.youtube.com/watch?v=YE7VzlLtp-4)

## Another Test
[Another Video](https://youtu.be/YE7VzlLtp-4)

## Regular Link
[Regular Link](https://example.com)
`;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Simple Video Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Markdown Input</h2>
          <pre className="w-full p-4 border border-gray-300 rounded-md bg-gray-50 text-sm overflow-auto">
            {testMarkdown}
          </pre>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">ReactMarkdown Output</h2>
          <div className="border border-gray-300 rounded-md p-4 min-h-[200px]">
            <ReactMarkdown
              remarkPlugins={[remarkYoutubeEmbed]}
              rehypePlugins={[rehypeRaw]}
            >
              {testMarkdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <p className="text-sm">Check the browser console for debug logs from the remark plugin.</p>
      </div>
    </div>
  );
} 