'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface EbookFile {
  path: string;
  name: string;
  size?: number;
}

export default function EbooksClient({ user }: { user: User }) {
  const supabase = createClient();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<EbookFile[]>([]);

  const userPrefix = useMemo(() => `${user.id}`, [user.id]);

  async function listFiles() {
    const { data, error } = await supabase.storage.from('ebooks').list(userPrefix, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
    if (error) {
      console.warn('[Ebooks] list error', error);
      return;
    }
    if (!data) return;

    const fileEntries: EbookFile[] = [];

    // include files directly under userPrefix
    for (const entry of data) {
      // If entry has metadata, it's a file directly under the user folder
      // If metadata is null/undefined, treat as a subfolder (bookId)
      // Supabase Storage returns prefixes with no metadata
      // Handle top-level files
      // @ts-expect-error metadata may not exist on prefix
      if (entry?.metadata) {
        // @ts-expect-error metadata type
        fileEntries.push({ path: `${userPrefix}/${entry.name}`, name: entry.name, size: entry.metadata?.size });
      }
    }

    // descend into subfolders (bookId) to collect actual files
    for (const entry of data) {
      // prefixes have no metadata
      // @ts-expect-error metadata may not exist on prefix
      if (!entry?.metadata && entry.name) {
        const sub = await supabase.storage.from('ebooks').list(`${userPrefix}/${entry.name}`);
        if (sub.data) {
          for (const f of sub.data) {
            // only include files (not further prefixes)
            // @ts-expect-error metadata present only for files
            if (f?.metadata) {
              // @ts-expect-error metadata type
              fileEntries.push({ path: `${userPrefix}/${entry.name}/${f.name}`, name: f.name, size: f.metadata?.size });
            }
          }
        }
      }
    }

    // newest first
    setFiles(fileEntries.reverse());
  }

  useEffect(() => {
    listFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(0);

    const bookId = crypto.randomUUID();
    const path = `${userPrefix}/${bookId}/${file.name}`;

    const { error } = await supabase.storage.from('ebooks').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      console.error('[Ebooks upload] error', error);
      toast.error(error.message);
      setIsUploading(false);
      return;
    }

    setProgress(100);
    setIsUploading(false);
    // refresh list to include newly uploaded file
    listFiles();
    toast.success(`Uploaded ${file.name}`);
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ebook Reader</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" onChange={handleUpload} disabled={isUploading} />
            {isUploading && <Progress value={progress} />}
            <p className="text-sm text-muted-foreground">Files are uploaded to Supabase Storage bucket `ebooks/`. We’ll add metadata extraction and covers next.</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Library</CardTitle>
            <Button variant="outline" size="sm" onClick={listFiles}>Refresh</Button>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No books yet. Upload a PDF or EPUB to get started.</p>
            ) : (
              <ul className="divide-y">
                {files.map((f) => (
                  <li key={f.path} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground break-all">{f.path}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/ebooks/view?path=${encodeURIComponent(f.path)}`)}>Open</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
