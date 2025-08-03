'use client';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface SimpleVideoEmbedProps {
  content: string;
}

export default function SimpleVideoEmbed({ content }: SimpleVideoEmbedProps) {
  // Process YouTube links before passing to ReactMarkdown
  const processedContent = content.replace(
    /\[([^\]]*)\]\((https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11}))\)/g,
    (match, linkText, url, videoId) => {
      const isShorts = url.includes('/shorts/');
      console.log('[SimpleVideoEmbed] Processing YouTube link:', { linkText, url, videoId, isShorts });
      
      // Set dimensions based on whether it's a Shorts video
      const width = isShorts ? "315" : "560";
      const height = isShorts ? "560" : "315";
      
      return `<div class="video-container my-4" style="max-width: ${width}px;">
        <iframe
          src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0"
          width="${width}"
          height="${height}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          style="max-width: 100%; border-radius: 8px; ${isShorts ? 'aspect-ratio: 9/16;' : 'aspect-ratio: 16/9;'}"
        ></iframe>
      </div>`;
    }
  );

  console.log('[SimpleVideoEmbed] Original content:', content);
  console.log('[SimpleVideoEmbed] Processed content:', processedContent);

  return (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw]}
      onError={(error) => {
        console.error('[SimpleVideoEmbed] ReactMarkdown Error:', error);
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
} 