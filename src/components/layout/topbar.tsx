/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Bell, Menu, LogOut, User, Settings, HelpCircle } from 'lucide-react';
import { User as UserType, UserRole } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface TopbarProps {
  user: UserType;
  onToggleSidebar: () => void;
  onLogout: () => void;
  notificationCount?: number;
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

export function Topbar({ 
  user, 
  onToggleSidebar, 
  onLogout, 
  notificationCount = 0,
  onSearch,
  showSearch = true 
}: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const getProfileLink = () => {
    switch (user.role) {
      case 'admin':
        return '/admin/profile';
      case 'teacher':
        return '/teacher/profile';
      case 'student':
        return '/student/profile';
      case 'parent':
        return '/parent/profile';
      default:
        return '/profile';
    }
  };

  const getSettingsLink = () => {
    switch (user.role) {
      case 'admin':
        return '/admin/settings';
      case 'teacher':
        return '/teacher/settings';
      case 'student':
        return '/student/settings';
      case 'parent':
        return '/parent/settings';
      default:
        return '/settings';
    }
  };

  const getNotificationsLink = () => {
    switch (user.role) {
      case 'admin':
        return '/admin/notifications';
      case 'teacher':
        return '/teacher/notifications';
      case 'student':
        return '/student/notifications';
      case 'parent':
        return '/parent/notifications';
      default:
        return '/notifications';
    }
  };

  const getSearchPlaceholder = () => {
    switch (user.role) {
      case 'admin':
        return 'Search users, programs, or courses...';
      case 'teacher':
        return 'Search students, classes, or assignments...';
      case 'student':
        return 'Search classes, assignments, or quizzes...';
      case 'parent':
        return 'Search classes, assignments, or children...';
      default:
        return 'Search...';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left section */}
      <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Search bar */}
        {showSearch && (
          <form onSubmit={handleSearchSubmit} className="hidden sm:block flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
              <Input
                type="search"
                placeholder={getSearchPlaceholder()}
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </form>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile search button */}
        {showSearch && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="sm:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
        )}

        {/* Help button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="hidden md:flex"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          onClick={() => router.push(getNotificationsLink())}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] rounded-full p-0 flex items-center justify-center text-xs font-semibold"
            >
              {notificationCount > 99 ? '99+' : notificationCount}
            </Badge>
          )}
        </Button>

        {/* Logout Button (visible on larger screens) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          className="hidden xl:flex items-center space-x-2"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex  items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 pr-2 sm:pr-4 hover:bg-gray-100"
            >
              <Avatar className="h-8 w-8 ring-2 ring-gray-200">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white ">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild>
              <Link href={getProfileLink()} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <Link href={getSettingsLink()} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="md:hidden">
              <Link href="#" className="cursor-pointer">
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help & Support</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={onLogout} 
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}