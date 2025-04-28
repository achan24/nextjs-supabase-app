'use client';

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

export default function AuthComponent() {
  const supabase = createClient()
  const router = useRouter()
  const [message, setMessage] = useState('')
  const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : ''

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setMessage('Login successful! Redirecting...')
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 1000)
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase])

  return (
    <div className="w-full max-w-[400px] mx-auto p-4">
      {message && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
          {message}
        </div>
      )}
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        theme="light"
        showLinks={false}
        providers={[]}
        redirectTo={redirectUrl}
        view="sign_in"
      />
    </div>
  )
} 