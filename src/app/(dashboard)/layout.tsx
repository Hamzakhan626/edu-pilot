'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { getCurrentUser, logout } from '@/lib/auth';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null); // Fix: Add type annotation
  const router = useRouter();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar with fixed positioning */}
      <div className={`fixed left-0 top-0 h-screen z-30 transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        <Sidebar 
          userRole={user.role}
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      
      {/* Main content area */}
      <div className={`flex-1 min-h-screen transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        <Topbar 
          user={user}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={handleLogout}
          notificationCount={3}
        />
        
        <main className="p-6">
          {children}
        </main>
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}