import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';

  if (!isAdminRoute) return NextResponse.next();

  const session = await auth();
  if (!session?.user) {
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
