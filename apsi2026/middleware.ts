import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname from the request URL
  const { pathname } = request.nextUrl;

  // Public routes yang tidak perlu auth
  if (pathname === '/' || pathname === '/api/') {
    return NextResponse.next();
  }

  // Check if the request is for a dashboard route
  if (pathname.startsWith('/dashboard/')) {
    // Dashboard routes akan dihandle oleh client-side auth guard di setiap page component
    // Server-side middleware di sini hanya untuk basic routing
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
