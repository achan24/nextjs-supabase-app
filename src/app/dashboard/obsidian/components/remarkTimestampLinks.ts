import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Text, Link } from 'mdast';

/**
 * remarkTimestampLinks
 * Converts timestamp patterns like [MM:SS] into clickable links
 */
export const remarkTimestampLinks: Plugin = () => (tree) => {
  visit(tree, 'text', (node: Text, index, parent) => {
    if (!parent || index === undefined) return;
    
    // Look for timestamp patterns like [MM:SS]
    const timestampRegex = /\[(\d{1,2}):(\d{2})\]/g;
    const matches = [...node.value.matchAll(timestampRegex)];
    
    if (matches.length === 0) return;
    
    // Replace the text node with a link node
    const linkNode: Link = {
      type: 'link',
      url: `#timestamp-${matches[0][1]}-${matches[0][2]}`,
      children: [
        {
          type: 'text',
          value: matches[0][0] // The full timestamp like [05:30]
        }
      ]
    };
    
    // Replace the text node with the link node
    (parent.children as any)[index] = linkNode;
  });
}; 