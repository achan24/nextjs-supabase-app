import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

export function remarkImageFix() {
  return function (tree: Root) {
    visit(tree, 'image', (node: any) => {
      // Ensure the image node has proper url and alt properties
      if (node.url && node.alt) {
        console.log('[RemarkImageFix] Processing image:', node.url, node.alt);
        
        // Transform supabase:// URLs by adding a custom data attribute
        if (node.url.startsWith('supabase://')) {
          // Store the original URL in a custom data attribute
          node.data = node.data || {};
          node.data.hProperties = node.data.hProperties || {};
          node.data.hProperties['data-supabase-url'] = node.url;
          
          // Use a placeholder URL that ReactMarkdown will accept
          node.url = 'https://placeholder-for-supabase-image.com/image.png';
          console.log('[RemarkImageFix] Added data-supabase-url:', node.data.hProperties['data-supabase-url']);
        }
      }
    });
  };
}
