import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  try {
    // Create Supabase client with middleware helper
    const supabase = createMiddlewareClient({ req, res })
    
    // This refreshes the session if needed and sets fresh cookies
    await supabase.auth.getSession()

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return res
  }
}

// Simplified matcher that avoids capturing groups
export const config = {
  matcher: [
    '/dashboard/:path*'  // Protect all dashboard routes
  ]
} 