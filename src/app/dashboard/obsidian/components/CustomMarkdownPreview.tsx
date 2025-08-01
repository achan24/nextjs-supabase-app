'use client';

import { useEffect, useRef } from 'react';
import { Note } from '../types';

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

  useEffect(() => {
    if (!containerRef.current) return;

    // Process double bracket links
    const processedContent = content.replace(/\[\[([^\]]+)\]\]/g, (match, noteTitle) => {
      const targetNote = allNotes.find(n => 
        n.title.toLowerCase() === noteTitle.toLowerCase()
      );
      
      if (targetNote) {
        return `<a href="#" data-note-id="${targetNote.id}" class="text-purple-600 hover:text-purple-800 underline cursor-pointer">${noteTitle}</a>`;
      } else {
        return `<span class="text-gray-500 italic">${noteTitle}</span>`;
      }
    });

    // Convert markdown to HTML (basic conversion)
    const htmlContent = processedContent
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img alt="$1" src="$2" class="max-w-full h-auto rounded" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
      .replace(/\n/gim, '<br />');

    containerRef.current.innerHTML = htmlContent;

    // Add click handlers for note links
    const noteLinks = containerRef.current.querySelectorAll('[data-note-id]');
    noteLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const noteId = (e.target as HTMLElement).getAttribute('data-note-id');
        if (noteId) {
          const targetNote = allNotes.find(n => n.id === noteId);
          if (targetNote) {
            onNoteSelect(targetNote);
          }
        }
      });
    });

    return () => {
      // Cleanup event listeners
      noteLinks.forEach(link => {
        link.removeEventListener('click', () => {});
      });
    };
  }, [content, allNotes, onNoteSelect]);

  return (
    <div 
      ref={containerRef}
      className="prose prose-sm max-w-none p-4"
      style={{
        fontSize: '14px',
        lineHeight: '1.6'
      }}
    />
  );
} 