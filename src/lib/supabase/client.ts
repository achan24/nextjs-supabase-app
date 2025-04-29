import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

export const createClient = () => {
  return createClientComponentClient()
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