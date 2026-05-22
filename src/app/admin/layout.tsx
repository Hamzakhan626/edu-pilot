/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import LogoutButton from '@/components/auth/logout-button';
import { getCurrentUser, type User } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layout/sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Component */}
      <Sidebar 
        userRole="admin" 
        isCollapsed={isCollapsed} 
        onToggle={handleToggle}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-auto">
        {/* Top Bar - Sticky */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200 h-16 flex items-center justify-between px-6 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className="lg:hidden"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open Menu</span>
          </Button>
          
          <div className="flex items-center space-x-4 ml-auto">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {currentUser?.name.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">{currentUser?.name || 'Admin'}</span>
                <span className="text-xs text-gray-500">{currentUser?.email || ''}</span>
              </div>
            </div>
            
            {/* Logout Button */}
            <div className="hidden md:block">
              <LogoutButton variant="outline" showText={true} />
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Mobile Logout Button - Bottom of page */}
        <div className="md:hidden p-4 border-t border-gray-200 bg-white">
          <LogoutButton variant="outline" className="w-full" showText={true} />
        </div>
      </div>
    </div>
  );
}