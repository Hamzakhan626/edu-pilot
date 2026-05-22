/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole, getCurrentUser, logout, initializeAuth } from '@/lib/auth';
import { Topbar } from '@/components/layout/topbar';
import { Sidebar } from '@/components/layout/sidebar';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize auth to check for existing session
        await initializeAuth();
        
        // Get the current user from auth
        const user = getCurrentUser();
        
        if (!user) {
          // No user found, redirect to login
          router.push('/login');
          return;
        }
        
        // Verify user has student role
        if (user.role !== 'student') {
          // Wrong role, redirect to appropriate dashboard
          router.push(`/${user.role}`);
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

    initAuth();
  }, [router]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      router.push('/login');
    }
  };

  const handleSearch = (query: string) => {
    // Add your search logic here
    console.log('Searching for:', query);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if no user (will redirect)
  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        userRole={currentUser.role}
        isCollapsed={isSidebarCollapsed}
        onToggle={handleToggleSidebar}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-auto">
        {/* Topbar Component */}
        <Topbar 
          user={currentUser}
          onToggleSidebar={handleToggleSidebar}
          onLogout={handleLogout}
          notificationCount={3}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}