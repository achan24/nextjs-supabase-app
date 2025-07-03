import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from './dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface DocumentViewerProps {
  url: string;
  type: string;
  name: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentViewer({ url, type, name, isOpen, onClose }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  const renderContent = () => {
    // For PDFs, we can use the native PDF viewer
    if (type === 'application/pdf') {
      return (
        <iframe 
          src={`${url}#toolbar=0`}
          className="w-full h-[80vh]"
          onLoad={() => setIsLoading(false)}
          title={`PDF viewer for ${name}`}
        />
      );
    }
    
    // For Office documents, use Microsoft's Office Online viewer
    if (type.includes('word') || type.includes('powerpoint')) {
      // Ensure the URL is properly encoded
      const encodedUrl = encodeURIComponent(url);
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
      
      return (
        <iframe 
          src={viewerUrl}
          className="w-full h-[80vh]"
          onLoad={() => setIsLoading(false)}
          title={`Office viewer for ${name}`}
          allow="fullscreen"
        />
      );
    }

    // For unsupported types, show download button
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="mb-4">Preview not available for this file type.</p>
        <a 
          href={url}
          download={name}
          className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600"
          aria-label={`Download ${name}`}
        >
          Download File
        </a>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0" aria-describedby="viewer-description">
        <DialogTitle asChild>
          <VisuallyHidden>Document Viewer - {name}</VisuallyHidden>
        </DialogTitle>
        <div id="viewer-description" className="sr-only">
          Document viewer for {name}. Press Escape to close.
        </div>
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
            </div>
          )}
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
} 