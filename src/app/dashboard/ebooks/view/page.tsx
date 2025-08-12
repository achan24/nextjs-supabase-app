export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import EbookViewerClient from './EbookViewerClient';

async function getSignedUrl(path: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data, error } = await supabase.storage.from('ebooks').createSignedUrl(path, 60 * 60);
  if (error) {
    return null;
  }
  return data?.signedUrl ?? null;
}

export default async function EbookViewPage({ searchParams }: { searchParams: { path?: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect('/login');
  }

  const path = searchParams.path;
  if (!path) {
    redirect('/dashboard/ebooks');
  }

  const signedUrl = await getSignedUrl(path);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-semibold mb-4">Ebook Viewer</h1>
      {!signedUrl ? (
        <div className="text-sm text-red-600">Failed to open file.</div>
      ) : (
        <EbookViewerClient signedUrl={signedUrl} storagePath={path} />
      )}
    </div>
  );
}
