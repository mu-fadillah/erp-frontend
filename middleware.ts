import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;

  // 1. Jika user BELUM login dan mencoba akses root ('/') atau area '/dashboard'
  if (!token && (path.startsWith('/dashboard'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Jika user SUDAH login tapi mencoba akses halaman '/login' atau root ('/')
  if (token && (path === '/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Pastikan '/' masuk ke dalam matcher agar diawasi oleh middleware
  matcher: ['/dashboard/:path*', '/login', '/'],
};