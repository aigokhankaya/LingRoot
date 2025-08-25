import { NextRequest, NextResponse } from 'next/server';

// This middleware makes the mobile error -> login -> dashboard flow robust
// even if some parts of the app force a fallback to /welcome.
//
// Behavior:
// - On requests to /login with a ?next=... query, set a short-lived cookie
//   (postLoginTarget) carrying the desired target, and a flag (suppressWelcome=1).
// - On requests to /welcome, if the cookie exists, redirect to the stored target
//   (defaulting to /dashboard) and clear the cookie so it won't affect normal flows.
// - Normal login flows without next remain unaffected.

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Helper to decode a "next" parameter safely
  const safeDecode = (val: string | null): string => {
    if (!val) return '';
    try {
      return decodeURIComponent(val);
    } catch {
      return val;
    }
  };

  // 1) Intercept /login with next param -> set cookies
  if (pathname === '/login') {
    const nextParam = searchParams.get('next');
    if (nextParam && nextParam.trim()) {
      const nextTarget = safeDecode(nextParam);
      const res = NextResponse.next();
      // short-lived cookie for post-login redirection
      res.cookies.set('postLoginTarget', nextTarget, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: true,
        maxAge: 10 * 60, // 10 minutes
      });
      res.cookies.set('suppressWelcome', '1', {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: true,
        maxAge: 10 * 60,
      });
      return res;
    }
    return NextResponse.next();
  }

  // 2) Intercept /welcome when cookie present -> redirect to target and clear
  if (pathname === '/welcome') {
    const hasFlag = req.cookies.get('suppressWelcome')?.value === '1';
    const targetCookie = req.cookies.get('postLoginTarget')?.value || '';
    if (hasFlag && targetCookie) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      // Build absolute redirect URL to the target stored in cookie
      // If target is absolute path like /dashboard?... use as is
      const redirectTo = targetCookie.startsWith('/') ? targetCookie : '/dashboard';
      const res = NextResponse.redirect(new URL(redirectTo, req.url));
      // Clear cookies immediately
      res.cookies.set('postLoginTarget', '', { path: '/', maxAge: 0 });
      res.cookies.set('suppressWelcome', '', { path: '/', maxAge: 0 });
      return res;
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/welcome'],
};
