import { visit } from 'unist-util-visit';
import type { Element } from 'hast';

export function rehypeSupabaseImages() {
  return function (tree: any) {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'img' && node.properties) {
        const src = node.properties.src as string;
        if (src && src.startsWith('supabase://')) {
          console.log('[RehypeSupabaseImages] Found supabase image:', src);
          // Store the original URL in a data attribute
          node.properties['data-supabase-url'] = src;
          // Use a placeholder URL
          node.properties.src = 'https://placeholder-supabase-image.com/image.png';
          console.log('[RehypeSupabaseImages] Added data-supabase-url:', node.properties['data-supabase-url']);
        }
      }
    });
  };
}
