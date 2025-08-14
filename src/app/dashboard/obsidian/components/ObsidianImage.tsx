'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ObsidianImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ObsidianImage({ src, alt, className = '', style = {} }: ObsidianImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const supabase = createClient();
  const imageRef = useRef<HTMLImageElement>(null);

  // Get signed URL for Supabase images
  useEffect(() => {
    const getSignedUrl = async () => {
      if (!src.startsWith('supabase://')) {
        setSignedUrl(src);
        return;
      }

      try {
        // Extract the base URL without dimensions
        const baseUrl = src.split('|')[0];
        const [bucketName, ...pathParts] = baseUrl.replace('supabase://', '').split('/');
        const filePath = pathParts.join('/');
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

        if (error) {
          console.error('[ObsidianImage] Error creating signed URL:', error);
          setHasError(true);
          return;
        }

        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
      } catch (error) {
        console.error('[ObsidianImage] Error processing URL:', src, error);
        setHasError(true);
      }
    };

    getSignedUrl();
  }, [src, supabase]);

  const handleImageError = () => {
    console.error('[ObsidianImage] Image failed to load:', src);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={`p-4 bg-gray-100 border border-gray-300 rounded text-gray-600 text-sm ${className}`}>
        <div className="flex items-center gap-2">
          <span>⚠️</span>
          <span>Image failed to load: {src}</span>
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className={`p-4 bg-gray-100 border border-gray-300 rounded text-gray-600 text-sm ${className}`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          <span>Loading image...</span>
        </div>
      </div>
    );
  }

  return (
    <img
      ref={imageRef}
      src={signedUrl}
      alt={alt}
      className={`max-w-full h-auto rounded shadow-sm ${className}`}
      style={{
        maxHeight: '500px',
        ...style
      }}
      onError={handleImageError}
      crossOrigin="anonymous"
    />
  );
}
