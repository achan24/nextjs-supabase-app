import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Element } from 'hast';

/**
 * rehypeTimestampLinks
 * Converts timestamp links into clickable elements with proper styling
 */
export const rehypeTimestampLinks: Plugin = () => (tree) => {
  visit(tree, 'element', (node: Element) => {
    if (node.tagName === 'a' && node.properties?.href) {
      const href = node.properties.href as string;
      
      if (href.startsWith('#timestamp-')) {
        const timeMatch = href.match(/#timestamp-(\d{1,2})-(\d{2})/);
        if (timeMatch) {
          const minutes = parseInt(timeMatch[1]);
          const seconds = parseInt(timeMatch[2]);
          const totalSeconds = minutes * 60 + seconds;
          
          // Update the link properties
          node.properties.href = '#';
          node.properties.className = 'text-green-600 hover:text-green-800 underline cursor-pointer font-mono';
          node.properties.title = `Jump to ${minutes}:${seconds.toString().padStart(2, '0')}`;
          node.properties.onclick = `window.seekToTime && window.seekToTime(${totalSeconds}); return false;`;
        }
      }
    }
  });
}; 