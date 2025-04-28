import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export function middleware(request: NextRequest) {
  return updateSession(request)          // ⬅️ returns a NextResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 