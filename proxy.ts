import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const token = req.cookies.get('authToken')?.value
  const { pathname } = req.nextUrl

  // Redirect logged-in users away from login page
  if (pathname === '/login') {
    if (token) return NextResponse.redirect(new URL('/', req.url))
    return NextResponse.next()
  }

  // Protect app routes — redirect unauthenticated users to login
  const protectedRoutes = ['/clients', '/create', '/reports']
  if (protectedRoutes.some(r => pathname === r || pathname.startsWith(r + '/')) && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
