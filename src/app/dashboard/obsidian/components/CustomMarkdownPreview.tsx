'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Note } from '../types';
import { remarkYoutubeEmbed } from './remarkYoutubeEmbed';
import { useYouTube } from './useYouTube';

interface CustomMarkdownPreviewProps {
  content: string;
  allNotes: Note[];
  onNoteSelect: (note: Note) => void;
}



export default function CustomMarkdownPreview({ 
  content, 
  allNotes, 
  onNoteSelect 
}: CustomMarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { seekTo } = useYouTube();

  // Process double bracket links and timestamps before passing to react-markdown
  const processedContent = content
    .replace(/\[\[([^\]]+)\]\]/g, (match, noteTitle) => {
      const targetNote = allNotes.find(n => 
        n.title.toLowerCase() === noteTitle.toLowerCase()
      );
      
      if (targetNote) {
        return `[${noteTitle}](#note-${targetNote.id})`;
      } else {
        return `*${noteTitle}*`;
      }
    })
    .replace(/\[(\d{1,2}):(\d{2})\]/g, (match, minutes, seconds) => {
      // Convert timestamp to clickable link
      return `[${match}](#timestamp-${minutes}-${seconds})`;
    });

  console.log('[CustomMarkdownPreview] Processed content:', processedContent);

  const handleNoteClick = (noteId: string) => {
    const targetNote = allNotes.find(n => n.id === noteId);
    if (targetNote) {
      onNoteSelect(targetNote);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="prose prose-sm max-w-none p-4 overflow-y-auto h-full"
      style={{
        fontSize: '14px',
        lineHeight: '1.6'
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkYoutubeEmbed]}
        components={{
          a: ({ href, children, ...props }) => {
            // Handle note links
            if (href?.startsWith('#note-')) {
              const noteId = href.replace('#note-', '');
              return (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNoteClick(noteId);
                  }}
                  className="text-purple-600 hover:text-purple-800 underline cursor-pointer"
                  {...props}
                >
                  {children}
                </a>
              );
            }
            // Handle timestamp links
            if (href?.startsWith('#timestamp-')) {
              const timeMatch = href.match(/#timestamp-(\d{1,2})-(\d{2})/);
              if (timeMatch) {
                const minutes = parseInt(timeMatch[1]);
                const seconds = parseInt(timeMatch[2]);
                const totalSeconds = minutes * 60 + seconds;
                
                return (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      seekTo(totalSeconds);
                    }}
                    className="text-green-600 hover:text-green-800 underline cursor-pointer font-mono"
                    title={`Jump to ${minutes}:${seconds.toString().padStart(2, '0')}`}
                    {...props}
                  >
                    {children}
                  </a>
                );
              }
            }
            // Regular links
            return (
              <a
                href={href}
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => (
            <div>
              <img
                src={src}
                alt={alt}
                className="max-w-full h-auto rounded"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const errorDiv = target.nextElementSibling as HTMLDivElement;
                  if (errorDiv) {
                    errorDiv.style.display = 'block';
                  }
                }}
                {...props}
              />
              <div
                style={{ display: 'none' }}
                className="p-2 bg-gray-100 border border-gray-300 rounded text-gray-600 text-sm"
              >
                Image failed to load: {src}
              </div>
            </div>
          ),
        }}
        rehypePlugins={[rehypeRaw]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
} 