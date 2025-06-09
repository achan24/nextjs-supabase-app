import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useSupabaseBrowser() {
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async () => {
      // Refresh the session when auth state changes
      await supabase.auth.getSession()
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [supabase])

  return supabase
}

export type { SupabaseClient } from '@supabase/supabase-js' 