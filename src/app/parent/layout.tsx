/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '@/lib/auth';
import { Topbar } from '@/components/layout/topbar';
import { Sidebar } from '@/components/layout/sidebar';
import { cn } from '@/lib/utils';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Mock user data - replace with your actual auth logic
    const user: User = {
      id: '1',
      name: 'John Parent',
      email: 'john.parent@example.com',
      role: 'parent' as UserRole,
      avatar: '/avatars/parent.jpg'
    };
    setCurrentUser(user);
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleLogout = () => {
    // Add your logout logic here
    console.log('Logging out...');
    router.push('/login');
  };

  const handleSearch = (query: string) => {
    // Add your search logic here
    console.log('Searching for:', query);
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  function handleToggle(): void {
    throw new Error('Function not implemented.');
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
          onToggleSidebar={handleToggle}
          onLogout={handleLogout}
          notificationCount={3} // You can make this dynamic based on actual notifications
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}