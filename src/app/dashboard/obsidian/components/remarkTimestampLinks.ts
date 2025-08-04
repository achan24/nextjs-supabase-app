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
    const match = timestampRegex.exec(node.value);
    
    if (!match) return;
    
    // Replace the text node with a link node
    const linkNode: Link = {
      type: 'link',
      url: `#timestamp-${match[1]}-${match[2]}`,
      children: [
        {
          type: 'text',
          value: match[0] // The full timestamp like [05:30]
        }
      ]
    };
    
    // Replace the text node with the link node
    (parent.children as any)[index] = linkNode;
  });
}; 