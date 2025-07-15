'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Import PDF.js legacy build for better compatibility
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import 'pdfjs-dist/web/pdf_viewer.css';

// Set worker path - using local worker file
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

interface PDFInlineViewerProps {
  url: string;
  height?: number;
}

export function PDFInlineViewer({ url, height = 300 }: PDFInlineViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function renderPDF() {
      if (typeof window === 'undefined') return; // Skip on server-side

      setLoading(true);
      setError(null);
      try {
        let pdfUrl = url;

        // If it's a Supabase storage URL, get a signed URL
        if (url.startsWith('supabase://')) {
          const [bucketName, ...pathParts] = url.replace('supabase://', '').split('/');
          const filePath = pathParts.join('/');
          
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

          if (signedUrlError) throw signedUrlError;
          if (!signedUrlData?.signedUrl) throw new Error('Failed to get signed URL');
          
          pdfUrl = signedUrlData.signedUrl;
        }

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        
        if (cancelled) return;

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const context = canvas.getContext('2d');
        if (!context) throw new Error('Failed to get canvas context');

        // Set canvas dimensions based on the specified height
        const scale = height / viewport.height;
        canvas.height = height;
        canvas.width = viewport.width * scale;

        const scaledViewport = page.getViewport({ scale });

        await page.render({
          canvasContext: context,
          viewport: scaledViewport
        }).promise;

      } catch (err: any) {
        console.error('PDF rendering error:', err);
        if (!cancelled) setError(err.message || 'Failed to render PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderPDF();

    return () => {
      cancelled = true;
    };
  }, [url, height, supabase]);

  if (error) return (
    <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
      Failed to load PDF: {error}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-[300px] bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
    </div>
  );

  return (
    <div className="relative w-full overflow-hidden rounded-lg shadow-sm">
      <canvas 
        ref={canvasRef} 
        className="w-full" 
        style={{ height }}
      />
    </div>
  );
} 