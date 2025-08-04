'use client';

import { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
import MDEditor from '@uiw/react-md-editor';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { remarkYoutubeEmbed } from './remarkYoutubeEmbed';
import { remarkTimestampLinks } from './remarkTimestampLinks';
import { rehypeTimestampLinks } from './rehypeTimestampLinks';
import { useYouTube } from './useYouTube';

interface HybridEditorProps {
  content: string;
  onChange: (content: string) => void;
  allNotes?: Note[];
  onNoteSelect?: (note: Note) => void;
  onGetVideoTime?: () => number | null;
}

export default function HybridEditor({ content, onChange, allNotes = [], onNoteSelect, onGetVideoTime }: HybridEditorProps) {
  const [hasVideo, setHasVideo] = useState(false);
  const [videoHeight, setVideoHeight] = useState(0);
  const { register, seekTo } = useYouTube();

  // Check if content contains video links
  useEffect(() => {
    const videoRegex = /\[.*?\]\((https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.*?)\)/g;
    const hasVideoContent = videoRegex.test(content);
    setHasVideo(hasVideoContent);
    
    // Set video height based on whether video is present
    if (hasVideoContent) {
      // Calculate height based on actual video dimensions from remarkYoutubeEmbed plugin
      const videoMatches = content.match(videoRegex);
      const videoCount = videoMatches ? videoMatches.length : 0;
      
      // Check if any videos are shorts (9:16 aspect ratio)
      const hasShorts = content.includes('/shorts/');
      
      // Regular videos: 315px height, Shorts: 560px height
      const videoHeight = hasShorts ? 560 : 315;
      const calculatedHeight = Math.max(videoHeight, videoCount * videoHeight);
      
      setVideoHeight(calculatedHeight);
    } else {
      setVideoHeight(0);
    }
  }, [content]);

  // Extract video content for display
  const extractVideoContent = () => {
    const videoRegex = /\[.*?\]\((https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.*?)\)/g;
    const matches: string[] = [];
    let match;
    
    while ((match = videoRegex.exec(content)) !== null) {
      matches.push(match[0]);
    }
    
    if (matches.length === 0) return null;

    // Create a markdown string with just the video content
    let videoContent = '';
    matches.forEach(match => {
      videoContent += match + '\n\n';
    });

    return videoContent;
  };

  const videoContent = extractVideoContent();

  // Register YouTube players when videos are present
  useEffect(() => {
    if (hasVideo && videoContent) {
      // Extract video IDs and register them
      const videoRegex = /\[.*?\]\((https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.*?)\)/g;
      const matches: string[] = [];
      let match;
      
      while ((match = videoRegex.exec(content)) !== null) {
        const url = match[1];
        const videoIdMatch = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/.exec(url);
        if (videoIdMatch) {
          const videoId = videoIdMatch[1];
          const iframeId = `yt-${videoId}`;
          register(iframeId);
        }
      }
    }
  }, [hasVideo, videoContent, content, register]);

  // Expose seekTo function globally for onclick handlers
  useEffect(() => {
    (window as any).seekToTime = seekTo;
    return () => {
      delete (window as any).seekToTime;
    };
  }, [seekTo]);

  return (
    <div className="h-full flex flex-col">
      {/* Video Section - only shown if video is present */}
      {hasVideo && videoContent && (
        <div 
          className="bg-gray-100 border-b border-gray-200 overflow-hidden"
          style={{ height: `${videoHeight}px`, minHeight: `${videoHeight}px` }}
        >
          <div className="h-full overflow-y-auto flex items-center justify-center">
            <div className="prose prose-sm max-w-none" style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <ReactMarkdown
                remarkPlugins={[remarkYoutubeEmbed]}
                rehypePlugins={[rehypeRaw]}
              >
                {videoContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Editor Section */}
      <div className="flex-1 min-h-0">
        <MDEditor
          value={content}
          onChange={(value) => onChange(value || '')}
          preview="edit"
          height="100%"
          className="border-none"
          previewOptions={{
            remarkPlugins: [remarkGfm, remarkYoutubeEmbed, remarkTimestampLinks],
            rehypePlugins: [rehypeRaw, rehypeTimestampLinks],
          }}
          textareaProps={{
            placeholder: 'Start writing your note...\n\nUse [[Note Title]] to link to other notes.\n\nAdd videos: [Video Title](https://youtube.com/watch?v=VIDEO_ID)',
            style: {
              fontSize: '14px',
              lineHeight: '1.6'
            }
          }}
        />
      </div>
    </div>
  );
} 