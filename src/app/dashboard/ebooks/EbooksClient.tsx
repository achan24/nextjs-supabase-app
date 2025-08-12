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

    // If user root contains folders, descend one level and list contents
    const fileEntries: EbookFile[] = [];
    for (const entry of data) {
      if (entry.name && entry.id) {
        const sub = await supabase.storage.from('ebooks').list(`${userPrefix}/${entry.name}`);
        if (sub.data) {
          for (const f of sub.data) {
            if (f.id) fileEntries.push({ path: `${userPrefix}/${entry.name}/${f.name}`, name: f.name, size: f.metadata?.size });
          }
        }
      }
    }
    setFiles(fileEntries);
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
    setFiles((prev) => [{ path, name: file.name, size: file.size }, ...prev]);
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
          <CardHeader>
            <CardTitle>Library</CardTitle>
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
