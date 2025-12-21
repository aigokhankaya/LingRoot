import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    const { data: { session } } = await supabase.auth.getSession();

    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
    const isLoginPage = request.nextUrl.pathname === '/admin/login';

    // If accessing admin routes (excluding login) without a session, redirect to login
    if (isAdminRoute && !isLoginPage && !session) {
        console.log('Middleware: No session, redirecting to admin login.');
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // If accessing admin routes (excluding login) with a session, check role
    if (isAdminRoute && !isLoginPage && session) {
        console.log('Middleware: Session found, checking admin role for user:', session.user.id);
        try {
            // IMPORTANT: getUserRole needs to be adapted for server-side Supabase client
            // Or, store role in JWT claims during login if possible for faster checks.
            // For now, assuming getUserRole can work with the server client implicitly or needs adjustment.

            // Let's modify getUserRole to accept the server client instance
            const { data: profileData, error: profileError } = await supabase
                .from('profiles') // Adjust if your table name is different
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (profileError) {
                console.error('Middleware: Error fetching user profile:', profileError.message);
                // Log out and redirect to login on error fetching profile
                await supabase.auth.signOut();
                response = NextResponse.redirect(new URL('/admin/login?error=role_check_failed', request.url));
                // Clear the cookie manually as redirect might happen before Supabase client updates it
                response.cookies.delete('sb-access-token'); // Adjust cookie name if needed
                response.cookies.delete('sb-refresh-token'); // Adjust cookie name if needed
                return response;
            }

            const userRole = profileData?.role;
            console.log('Middleware: User role is:', userRole);

            if (userRole !== 'admin') {
                console.log('Middleware: User is not admin, redirecting to login.');
                // Log out the user if they somehow have a session but aren't admin
                await supabase.auth.signOut();
                response = NextResponse.redirect(new URL('/admin/login?error=not_admin', request.url));
                // Clear the cookie manually
                response.cookies.delete('sb-access-token'); // Adjust cookie name if needed
                response.cookies.delete('sb-refresh-token'); // Adjust cookie name if needed
                return response;
            }
            // User is admin, allow access
            console.log('Middleware: Admin access granted.');
        } catch (err) {
            console.error('Middleware: Unexpected error during role check:', err);
            await supabase.auth.signOut();
            response = NextResponse.redirect(new URL('/admin/login?error=unexpected', request.url));
            response.cookies.delete('sb-access-token'); // Adjust cookie name if needed
            response.cookies.delete('sb-refresh-token'); // Adjust cookie name if needed
            return response;
        }
    }

    // If accessing login page with an active admin session, redirect to dashboard
    if (isLoginPage && session) {
        // Check role again just to be sure before redirecting away from login
        const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
        if (profileData?.role === 'admin') {
            console.log('Middleware: Admin already logged in, redirecting to dashboard.');
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
        // If session exists but not admin, sign out and let them stay on login
        await supabase.auth.signOut();
    }

    // Refresh session if needed
    await supabase.auth.getSession();

    return response;
}

export const config = {
    matcher: [
        // Admin routes only
        '/admin/:path*',
    ],
};

