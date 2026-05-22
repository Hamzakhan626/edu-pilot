// components/providers/auth-provider.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Sync localStorage user to cookie for middleware
    const syncAuthState = () => {
      const user = getCurrentUser();
      
      if (user) {
        // Set cookie for middleware
        document.cookie = `currentUser=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
      } else {
        // Clear cookie
        document.cookie = 'currentUser=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    };

    syncAuthState();

    // Check auth on pathname change
    const user = getCurrentUser();
    const publicRoutes = ['/login', '/reset-password']; // Removed '/' from here
    const isPublicRoute = publicRoutes.includes(pathname);

    // Handle root route redirection
    if (pathname === '/') {
      if (user) {
        // Redirect to appropriate dashboard
        const dashboardMap: Record<string, string> = {
          admin: '/admin/dashboard',
          teacher: '/teacher/dashboard',
          student: '/student/dashboard',
          parent: '/parent/dashboard',
        };
        const dashboardPath = dashboardMap[user.role] || '/login';
        router.push(dashboardPath);
      } else {
        // Not logged in, go to login
        router.push('/login');
      }
      return; // Exit early to prevent further checks
    }

    // If not authenticated and trying to access protected route
    if (!user && !isPublicRoute) {
      router.push('/login');
    }

    // If logged in and on login page, redirect to dashboard
    if (user && pathname === '/login') {
      const dashboardMap: Record<string, string> = {
        admin: '/admin/dashboard',
        teacher: '/teacher/dashboard',
        student: '/student/dashboard',
        parent: '/parent/dashboard',
      };
      const dashboardPath = dashboardMap[user.role] || '/login';
      router.push(dashboardPath);
    }

    // Listen for storage changes (for multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUser') {
        syncAuthState();
        
        // Redirect if logged out from another tab
        if (!e.newValue && !isPublicRoute && pathname !== '/') {
          router.push('/login');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [pathname, router]);

  return <>{children}</>;
}