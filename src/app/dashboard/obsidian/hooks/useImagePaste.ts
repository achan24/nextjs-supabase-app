'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface UseImagePasteProps {
  noteId: string;
  userId: string;
  onImageInserted?: (markdown: string) => void;
}

export function useImagePaste({ noteId, userId, onImageInserted }: UseImagePasteProps) {
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    console.log('[Obsidian Image Paste] Paste event triggered');
    console.log('[Obsidian Image Paste] Clipboard items:', Array.from(e.clipboardData.items).map(item => ({ type: item.type, kind: item.kind })));
    
    const items = e.clipboardData.items;
    const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));
    
    console.log('[Obsidian Image Paste] Found image item:', imageItem?.type);
    if (!imageItem || !noteId) {
      console.log('[Obsidian Image Paste] No image item found or no note selected');
      return; // Not an image or no note selected
    }

    e.preventDefault();
    setIsUploading(true);

    try {
      const file = imageItem.getAsFile();
      if (!file) throw new Error('Failed to get image file from clipboard');

      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `note-images/${userId}/${noteId}/${timestamp}-${file.name || 'clipboard-image.png'}`;
      console.log('[Obsidian Image Paste] Generated filename:', filename);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('obsidian-notes')
        .upload(filename, file);

      if (error) {
        console.error('[Obsidian Image Paste] Upload error:', error);
        throw error;
      }
      console.log('[Obsidian Image Paste] Upload successful:', data);

      // Store canonical URL format instead of signed URL
      const canonicalUrl = `supabase://obsidian-notes/${filename}`;
      console.log('[Obsidian Image Paste] Generated canonical URL:', canonicalUrl);

      // Test if URL is accessible via signed URL (for immediate feedback)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('obsidian-notes')
        .createSignedUrl(filename, 60 * 60); // 1 hour for testing

      if (signedUrlError) {
        console.error('[Obsidian Image Paste] Signed URL error:', signedUrlError);
        throw signedUrlError;
      }

      // Test accessibility
      try {
        const response = await fetch(signedUrlData.signedUrl, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`Image not accessible: ${response.status}`);
        }
      } catch (fetchError) {
        console.error('[Obsidian Image Paste] Image accessibility test failed:', fetchError);
        // Continue anyway, the image might still be accessible
      }

      // Generate markdown for the image
      const markdown = `![Pasted Image](${canonicalUrl})`;
      console.log('[Obsidian Image Paste] Generated markdown:', markdown);

      // Call the callback to insert the markdown
      onImageInserted?.(markdown);

      toast.success('Image pasted successfully!');
    } catch (error) {
      console.error('[Obsidian Image Paste] Error pasting image:', error);
      toast.error('Failed to paste image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [noteId, userId, onImageInserted, supabase]);

  return {
    handlePaste,
    isUploading
  };
}
