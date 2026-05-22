'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout, type User } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const user = getCurrentUser();
        
        // Check if user exists
        if (!user) {
          router.push('/login');
          return;
        }
        
        // Verify user is a teacher
        if (user.role !== 'teacher') {
          // Redirect to appropriate dashboard based on role
          switch (user.role) {
            case 'admin':
              router.push('/admin/dashboard');
              break;
            case 'student':
              router.push('/student/dashboard');
              break;
            case 'parent':
              router.push('/parent/dashboard');
              break;
            case 'hr':
              router.push('/hr/dashboard');
              break;
            case 'hod':
              router.push('/hod/dashboard');
              break;
            case 'finance':
              router.push('/finance/dashboard');
              break;
            case 'staff':
              router.push('/staff/dashboard');
              break;
            default:
              router.push('/login');
          }
          return;
        }
        
        setCurrentUser(user);
      } catch (error) {
        console.error('Auth initialization error:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [router]);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Show loading state while authenticating
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-lg font-semibold text-gray-700">Loading Teacher Portal...</p>
            <p className="text-sm text-gray-500">Verifying credentials</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if no user (will redirect)
  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Component - Pass "teacher" as userRole */}
      <Sidebar 
        userRole="teacher"  /* This ensures teacher navigation is shown */ 
        isCollapsed={isCollapsed} 
        onToggle={handleToggle} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar Component */}
        <Topbar 
          user={currentUser}
          onToggleSidebar={handleToggle}
          onLogout={handleLogout}
          notificationCount={5} // You can make this dynamic
          showSearch={true}
        />

        {/* Page Content with proper scrolling */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}