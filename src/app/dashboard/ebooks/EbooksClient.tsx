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

// Minimal shape to discriminate file vs prefix
interface StorageObjectMinimal {
  name: string;
  id?: string;
  metadata?: { size?: number } | null;
}

export default function EbooksClient({ user }: { user: User }) {
  const supabase = createClient();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<EbookFile[]>([]);

  const userPrefix = useMemo(() => `${user.id}`, [user.id]);

  function isFile(entry: StorageObjectMinimal): boolean {
    return !!entry.metadata; // files have metadata; prefixes do not
  }

  async function listFiles() {
    const { data, error } = await supabase.storage.from('ebooks').list(userPrefix, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
    if (error) {
      console.warn('[Ebooks] list error', error);
      return;
    }
    if (!data) return;

    const fileEntries: EbookFile[] = [];

    // include files directly under userPrefix
    for (const raw of data as unknown as StorageObjectMinimal[]) {
      if (isFile(raw)) {
        fileEntries.push({ path: `${userPrefix}/${raw.name}`, name: raw.name, size: raw.metadata?.size });
      }
    }

    // descend into subfolders (bookId) to collect actual files
    for (const raw of data as unknown as StorageObjectMinimal[]) {
      if (!isFile(raw) && raw.name) {
        const sub = await supabase.storage.from('ebooks').list(`${userPrefix}/${raw.name}`);
        if (sub.data) {
          for (const fraw of sub.data as unknown as StorageObjectMinimal[]) {
            if (isFile(fraw)) {
              fileEntries.push({ path: `${userPrefix}/${raw.name}/${fraw.name}`, name: fraw.name, size: fraw.metadata?.size });
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
