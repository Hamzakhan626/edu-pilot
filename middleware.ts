// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Supabase client for edge/middleware (no session persistence or auto refresh)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  // Get session tokens from cookies – MUST match what auth.ts sets
  const accessToken = request.cookies.get('sb-access-token')?.value;
  const refreshToken = request.cookies.get('sb-refresh-token')?.value;

  let session = null as Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >['data']['session'] | null;

  if (accessToken && refreshToken) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (!error && data.session) {
        session = data.session;
      }
    } catch (error) {
      console.error('Middleware session error:', error);
    }
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/', '/api/auth/callback', '/auth/callback'];

  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/');

  // If not authenticated and trying to access protected route
  if (!session && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If no session but public route, just continue
  if (!session) {
    return NextResponse.next();
  }

  // If authenticated: load profile and apply role logic
  try {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error in middleware:', profileError);
    }

    const role: string | undefined = profile?.role;
    const userEmail = session.user.email ?? '';

    // Redirect from login to appropriate dashboard
    if (pathname === '/login') {
      if (role === 'admin' || userEmail === 'admin@gmail.com') {
        return NextResponse.redirect(
          new URL('/admin/dashboard', request.url)
        );
      }
      if (role === 'teacher') {
        return NextResponse.redirect(
          new URL('/teacher/dashboard', request.url)
        );
      }
      if (role === 'student') {
        return NextResponse.redirect(
          new URL('/student/dashboard', request.url)
        );
      }
      if (role === 'parent') {
        return NextResponse.redirect(
          new URL('/parent/dashboard', request.url)
        );
      }
      if (role === 'hr') {
        return NextResponse.redirect(new URL('/hr/dashboard', request.url));
      }
      if (role === 'hod') {
        return NextResponse.redirect(new URL('/hod/dashboard', request.url));
      }
      if (role === 'finance') {
        return NextResponse.redirect(
          new URL('/finance/dashboard', request.url)
        );
      }
      if (role === 'staff') {
        return NextResponse.redirect(
          new URL('/staff/dashboard', request.url)
        );
      }

      // Fallback
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based route protection
    if (role) {
      // Admin area
      if (
        pathname.startsWith('/admin') &&
        role !== 'admin' &&
        userEmail !== 'admin@gmail.com'
      ) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Teacher area: allow teacher, admin, HoD
      if (
        pathname.startsWith('/teacher') &&
        !['teacher', 'admin', 'hod'].includes(role)
      ) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Student area
      if (
        pathname.startsWith('/student') &&
        !['student', 'admin'].includes(role)
      ) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Parent area
      if (
        pathname.startsWith('/parent') &&
        !['parent', 'admin'].includes(role)
      ) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // HR area
      if (pathname.startsWith('/hr') && !['hr', 'admin'].includes(role)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // HoD area
      if (pathname.startsWith('/hod') && !['hod', 'admin'].includes(role)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Finance area
      if (
        pathname.startsWith('/finance') &&
        !['finance', 'admin'].includes(role)
      ) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Staff area – allow staff, admin, and optionally HR
      if (
        pathname.startsWith('/staff') &&
        !['staff', 'admin', 'hr'].includes(role)
      ) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
