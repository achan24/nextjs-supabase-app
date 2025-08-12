'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EbookViewerClient({ signedUrl }: { signedUrl: string }) {
  const router = useRouter();
  const [zoom, setZoom] = useState<string>('page-width');
  const containerRef = useRef<HTMLDivElement>(null);

  const iframeSrc = useMemo(() => {
    const hash = `#zoom=${encodeURIComponent(zoom)}`;
    return `${signedUrl}${signedUrl.includes('#') ? '' : hash}`;
  }, [signedUrl, zoom]);

  function handleFullscreen() {
    const elem = containerRef.current;
    if (elem && elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => router.push('/dashboard/ebooks')}>Back</Button>
        <a href={signedUrl} target="_blank" rel="noreferrer">
          <Button variant="outline">Open in new tab</Button>
        </a>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zoom</span>
          <Select value={zoom} onValueChange={setZoom}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Zoom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page-width">Fit width</SelectItem>
              <SelectItem value="page-fit">Fit page</SelectItem>
              <SelectItem value="100">100%</SelectItem>
              <SelectItem value="125">125%</SelectItem>
              <SelectItem value="150">150%</SelectItem>
              <SelectItem value="200">200%</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handleFullscreen}>Fullscreen</Button>
      </div>

      <div ref={containerRef} className="border rounded">
        <iframe src={iframeSrc} className="w-full h-[80vh]" />
      </div>
    </div>
  );
}
