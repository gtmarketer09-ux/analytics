import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Web Crypto HMAC using SubtleCrypto (Edge Runtime compatible)
async function hmacSHA256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'gt-analytics-secure-session-key-2024-xK9mP';

async function isValidSession(cookieValue: string): Promise<boolean> {
  try {
    const decoded = atob(cookieValue);
    const lastColon = decoded.lastIndexOf(':');
    if (lastColon === -1) {
      console.log('[auth] invalid session: no colon in payload');
      return false;
    }

    const payload = decoded.substring(0, lastColon);
    const sig = decoded.substring(lastColon + 1);

    const expectedSig = await hmacSHA256(SESSION_SECRET, payload);

    if (sig !== expectedSig) {
      console.log('[auth] invalid session: signature mismatch. Expected:', expectedSig, 'Got:', sig);
      return false;
    }

    const parts = payload.split(':');
    const ts = parseInt(parts[parts.length - 1], 10);
    if (isNaN(ts) || (Date.now() - ts) > 8 * 60 * 60 * 1000) {
      console.log('[auth] invalid session: expired');
      return false;
    }

    return true;
  } catch (e) {
    console.log('[auth] session decode error:', e);
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow: static assets
  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/public/')
  ) {
    return NextResponse.next();
  }

  // Always allow: login page itself
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    // If already authenticated, redirect to dashboard
    const session = request.cookies.get('auth_session');
    if (session && await isValidSession(session.value)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Always allow: auth API routes (login/logout)
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/logout')) {
    return NextResponse.next();
  }

  // Always allow: cron API routes (internal jobs must not be blocked)
  if (pathname.startsWith('/api/cron/')) {
    return NextResponse.next();
  }

  // Always allow: OAuth callback routes
  if (pathname.startsWith('/api/auth/admob') || pathname.startsWith('/auth/google')) {
    return NextResponse.next();
  }

  // All other routes: require valid session
  const session = request.cookies.get('auth_session');
  const valid = session ? await isValidSession(session.value) : false;

  if (!session || !valid) {
    console.log(`[auth] REDIRECTING to /login from ${pathname} (cookie: ${session ? 'present' : 'none'}, valid: ${valid})`);
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    return response;
  }

  // Valid session — allow, but add cache-control headers to prevent browser caching
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
