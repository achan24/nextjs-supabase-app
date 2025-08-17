import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { Database } from "@/lib/database.types";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Automatically refresh the JWT when needed
  if (session) {
    const { data, error } = await supabase.auth.getSession();
    if (data.session?.access_token && !error) {
      const {
        access_token,
        refresh_token,
        expires_in,
        expires_at,
      } = data.session;
      res.cookies.set("sb-access-token", access_token, {
        httpOnly: true,
        maxAge: expires_in,
        path: "/",
      });
      res.cookies.set("sb-refresh-token", refresh_token, {
        httpOnly: true,
        expires: new Date(expires_at! * 1000),
        path: "/",
      });
    }
  } else if (!req.nextUrl.pathname.startsWith('/login') && !req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 