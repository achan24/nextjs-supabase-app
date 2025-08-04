// remarkYoutubeEmbed.ts
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Link, HTML } from 'mdast';

/**
 * remarkYoutubeEmbed
 * Converts markdown links that point to YouTube into <iframe> nodes.
 *
 * Patterns handled:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 */
export const remarkYoutubeEmbed: Plugin = () => (tree) => {
  console.log('[Remark Plugin] Processing tree:', tree);
  
  visit(tree, 'link', (node: Link, index, parent) => {
    console.log('[Remark Plugin] Found link:', node);
    const url = node.url;

    // Extract a YouTube video ID if present
    const match =
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/.exec(
        url
      );

    if (!match) {
      console.log('[Remark Plugin] Not a YouTube link:', url);
      return; // not a YouTube link
    }

    const videoId = match[1];
    const isShorts = url.includes('/shorts/');
    console.log('[Remark Plugin] Found YouTube video ID:', videoId, 'isShorts:', isShorts);

    // Set dimensions based on whether it's a Shorts video
    const width = isShorts ? "315" : "560";
    const height = isShorts ? "560" : "315";
    const aspectRatio = isShorts ? "aspect-[9/16]" : "aspect-video";

    // Replace the <link> node with an HTML (iframe) node
    const iframeNode: HTML = {
      type: 'html',
      value: `<div class="video-container my-4" style="max-width: ${width}px;">
        <iframe
          src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&playsinline=1&modestbranding=1&rel=0&showinfo=0"
          width="${width}"
          height="${height}"
          frameborder="0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowfullscreen
          style="max-width: 100%; border-radius: 8px; ${isShorts ? 'aspect-ratio: 9/16;' : 'aspect-ratio: 16/9;'}"
          id="yt-${videoId}"
          data-yt-player
        ></iframe>
      </div>`,
    };

    console.log('[Remark Plugin] Created iframe node:', iframeNode);

    // @ts-ignore — parent is defined because we're in a visitor
    parent.children[index] = iframeNode;
  });
}; 