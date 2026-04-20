import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const token = req.cookies.get('authToken')?.value
  const { pathname } = req.nextUrl

  if (pathname === '/' && !token) {
    return NextResponse.next()
  }

  if (pathname === '/login') {
    if (token) return NextResponse.redirect(new URL('/', req.url))
    return NextResponse.next()
  }

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
