import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes publiques (pas besoin d'auth)
const PUBLIC_ROUTES = ['/login', '/_next', '/favicon.ico', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer les routes publiques
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Laisser passer toutes les routes — la protection auth est gérée côté client
  // par le CompanyProvider dans le layout (app)
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
