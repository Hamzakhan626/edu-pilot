'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
}

export default function LogoutButton({ 
  variant = 'outline', 
  size = 'default',
  className = '',
  showIcon = true,
  showText = true
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to logout';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {showIcon && <LogOut className={cn("h-4 w-4", showText && "mr-2")} />}
      {showText && (loading ? 'Logging out...' : 'Logout')}
    </Button>
  );
}