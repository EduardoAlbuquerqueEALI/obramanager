import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const AUTH_PAGES = ['/login', '/signup', '/reset-password']
const PUBLIC_PREFIXES = ['/api/', '/_next/', '/favicon', '/cliente/']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let API routes and Next.js internals pass through
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request })
  }

  const { supabaseResponse, user } = await updateSession(request)

  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )

  // No user on a protected page → redirect to /login
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Has user on an auth page → redirect based on role
  if (user && isAuthPage) {
    const role = (user.app_metadata?.role as string | undefined) ?? 'member'
    const url = request.nextUrl.clone()
    url.pathname = role === 'admin' ? '/admin' : '/app'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Has user on root "/" → redirect based on role
  if (user && pathname === '/') {
    const role = (user.app_metadata?.role as string | undefined) ?? 'member'
    const url = request.nextUrl.clone()
    url.pathname = role === 'admin' ? '/admin' : '/app'
    return NextResponse.redirect(url)
  }

  // Has user trying to access /admin/* without admin role → redirect to /app
  if (user && pathname.startsWith('/admin')) {
    const role = (user.app_metadata?.role as string | undefined) ?? 'member'
    if (role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/app'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
