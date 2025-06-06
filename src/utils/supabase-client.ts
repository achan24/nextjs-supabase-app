// utils/supabase-client.ts
import { createBrowserClient } from "@supabase/ssr";   // ← browser-only
import { createServerClient }  from "@supabase/ssr";   // ← server-only
import { Database } from '@/lib/database.types';

declare global {
  var supabaseServer: ReturnType<typeof createServerClient<Database>> | undefined;
}

// In the **browser** we cache the instance on window
export const getBrowserSupabase = () => {
  if (!("supabase" in globalThis)) {
    (globalThis as any).supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return (globalThis as any).supabase;
};

// On the **server** we cache on global
export const getServerSupabase = (cookies: () => Headers) => {
  if (!globalThis.supabaseServer) {
    globalThis.supabaseServer = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies }
    );
  }
  return globalThis.supabaseServer;
}; 