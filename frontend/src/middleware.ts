import { NextResponse, type NextRequest } from 'next/server';

// JWT token decode function
function decodeJWT(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    return null;
  }
}

// Check if token is expired
function isTokenExpired(token: string, rememberMe: boolean = false): boolean {
  const payload = decodeJWT(token);
  if (!payload) return true;
  
  const currentTime = Date.now() / 1000;
  
  // Check JWT expiration first
  if (payload.exp < currentTime) {
    return true;
  }
  
  // If "remember me" is not selected, check 1-hour idle timeout
  if (!rememberMe) {
    const tokenAge = currentTime - payload.iat;
    const oneHour = 60 * 60; // 1 hour in seconds
    
    if (tokenAge > oneHour) {
      return true;
    }
  }
  
  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminLoginPage = pathname === '/admin/login';
  const isPublicRoute = ['/', '/login', '/register', '/about', '/contact', '/terms', '/privacy', '/features', '/how-it-works', '/tips', '/nasil-calisir', '/ozellikler'].includes(pathname);

  // Get token from cookie or localStorage (we'll use a cookie approach for server-side)
  const token = request.cookies.get('lingroot_token')?.value;
  const rememberMe = request.cookies.get('lingroot_remember_me')?.value === 'true';

  // For admin routes
  if (isAdminRoute) {
    // If accessing admin login page
    if (isAdminLoginPage) {
      // If user already has valid admin token, redirect to dashboard
      if (token && !isTokenExpired(token, rememberMe)) {
        const payload = decodeJWT(token);
        if (payload?.role === 'admin') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      }
      // Let them access login page
      return NextResponse.next();
    }
    
    // For other admin routes, check authentication and authorization
    if (!token || isTokenExpired(token, rememberMe)) {
      console.log('Middleware: No valid token for admin route, redirecting to login');
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      // Clear expired tokens
      response.cookies.delete('lingroot_token');
      response.cookies.delete('lingroot_remember_me');
                 return response;
            }

    // Check if user is admin
    const payload = decodeJWT(token);
    if (payload?.role !== 'admin') {
      console.log('Middleware: User is not admin, redirecting to login');
      const response = NextResponse.redirect(new URL('/admin/login?error=not_admin', request.url));
      response.cookies.delete('lingroot_token');
      response.cookies.delete('lingroot_remember_me');
                return response;
            }
    
    // User is authenticated admin, allow access
    return NextResponse.next();
  }

  // For protected user routes (dashboard, profile, etc.)
  const isProtectedRoute = ['/dashboard', '/profile', '/welcome', '/vocabulary', '/pronunciation'].includes(pathname);
  
  if (isProtectedRoute) {
    if (!token || isTokenExpired(token, rememberMe)) {
      console.log('Middleware: No valid token for protected route, redirecting to login');
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('lingroot_token');
      response.cookies.delete('lingroot_remember_me');
            return response;
    }
    
    // User is authenticated, allow access
    return NextResponse.next();
  }

  // For login/register pages, redirect authenticated users to dashboard
  if (['/login', '/register'].includes(pathname)) {
    if (token && !isTokenExpired(token, rememberMe)) {
      console.log('Middleware: User already authenticated, redirecting to welcome');
      return NextResponse.redirect(new URL('/welcome', request.url));
    }
  }

  // Allow access to public routes
  return NextResponse.next();
}

export const config = {
    matcher: [
    // Admin routes
        '/admin/:path*',
    // Protected user routes
    '/dashboard/:path*',
    '/profile/:path*',
    '/welcome/:path*',
    '/vocabulary/:path*',
    '/pronunciation/:path*',
    // Auth routes
    '/login',
    '/register'
    ],
};

