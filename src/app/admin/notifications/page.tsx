'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Settings, 
  CheckCheck, 
  Users, 
  AlertCircle, 
  Megaphone, 
  TrendingUp,
  Activity,
  Server,
  ChevronRight,
  Badge
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { NotificationList } from '@/components/notifications/NotificationList';
import { NotificationFilters } from '@/components/notifications/NotificationFilters';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notifications';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  related_entity_id: string | null;
  related_entity_type: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

interface SystemStats {
  totalUsers: number;
  activeToday: number;
  pendingActions: number;
  systemAlerts: number;
  unreadAnnouncements: number;
  criticalAlerts: number;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeToday: 0,
    pendingActions: 0,
    systemAlerts: 0,
    unreadAnnouncements: 0,
    criticalAlerts: 0
  });

  // Navigation items for admin notification pages
  const notificationPages = [
    {
      title: 'Announcements',
      description: 'Create and manage system-wide announcements',
      href: '/admin/notifications/announcements',
      icon: Megaphone,
      color: 'bg-purple-100 text-purple-600',
      count: systemStats.unreadAnnouncements
    },
    {
      title: 'System Alerts',
      description: 'Monitor system health and critical notifications',
      href: '/admin/notifications/system',
      icon: Server,
      color: 'bg-red-100 text-red-600',
      count: systemStats.criticalAlerts
    },
    {
      title: 'User Activity',
      description: 'Track user actions and system events',
      href: '/admin/notifications/user-activity',
      icon: Activity,
      color: 'bg-blue-100 text-blue-600',
      count: null
    },
    {
      title: 'Settings',
      description: 'Configure notification preferences',
      href: '/admin/notifications/settings',
      icon: Settings,
      color: 'bg-gray-100 text-gray-600',
      count: null
    }
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchSystemStats();
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (filter === 'unread') {
          query = query.eq('is_read', false);
        } else if (filter === 'read') {
          query = query.eq('is_read', true);
        }

        if (typeFilter !== 'all') {
          query = query.eq('notification_type', typeFilter);
        }

        const { data, error } = await query.limit(20);

        if (error) throw error;
        setNotifications(data || []);
        
        const unreadAlerts = data?.filter(n => !n.is_read && n.notification_type === 'system_alert').length || 0;
        const unreadAnnouncements = data?.filter(n => !n.is_read && n.notification_type === 'announcement').length || 0;
        
        setSystemStats(prev => ({ 
          ...prev, 
          systemAlerts: unreadAlerts,
          unreadAnnouncements 
        }));
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast({
          title: 'Error',
          description: 'Failed to load notifications',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userId, filter, typeFilter, toast]);

  const fetchSystemStats = async () => {
    try {
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: criticalAlerts } = await supabase
        .from('system_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .eq('type', 'error');

      setSystemStats(prev => ({
        ...prev,
        totalUsers: usersCount || 0,
        criticalAlerts: criticalAlerts || 0
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev].slice(0, 20));
          
          if (newNotification.notification_type === 'system_alert') {
            setSystemStats(prev => ({ ...prev, systemAlerts: prev.systemAlerts + 1 }));
          } else if (newNotification.notification_type === 'announcement') {
            setSystemStats(prev => ({ ...prev, unreadAnnouncements: prev.unreadAnnouncements + 1 }));
          }
          
          toast({
            title: newNotification.title,
            description: newNotification.message,
            className: "bg-white border-blue-200",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, toast]);

  const handleMarkAsRead = async (id: string) => {
    const success = await markNotificationAsRead(id);
    if (success) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      
      const notification = notifications.find(n => n.id === id);
      if (notification?.notification_type === 'system_alert') {
        setSystemStats(prev => ({ ...prev, systemAlerts: Math.max(0, prev.systemAlerts - 1) }));
      } else if (notification?.notification_type === 'announcement') {
        setSystemStats(prev => ({ ...prev, unreadAnnouncements: Math.max(0, prev.unreadAnnouncements - 1) }));
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    
    setMarkingAll(true);
    const success = await markAllNotificationsAsRead(userId);
    if (success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setSystemStats(prev => ({ 
        ...prev, 
        systemAlerts: 0,
        unreadAnnouncements: 0 
      }));
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
        className: "bg-white border-green-200",
      });
    }
    setMarkingAll(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      
      toast({
        title: 'Success',
        description: 'Notification deleted',
        className: "bg-white border-green-200",
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Notifications</h1>
          <p className="text-gray-600 mt-1">
            Monitor system activities, user actions, and platform alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/notifications/settings">
            <Button variant="outline" className="gap-2 bg-white border-gray-300">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Button
            onClick={handleMarkAllAsRead}
            disabled={markingAll || unreadCount === 0}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-900">{systemStats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Active Today</p>
                <p className="text-2xl font-bold text-green-900">{systemStats.activeToday}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Link href="/admin/notifications/announcements" className="block">
          <Card className="bg-white border-purple-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Announcements</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {systemStats.unreadAnnouncements}
                  </p>
                </div>
                <Megaphone className="h-8 w-8 text-purple-500" />
              </div>
              {systemStats.unreadAnnouncements > 0 && (
                <p className="text-xs text-purple-600 mt-1">
                  {systemStats.unreadAnnouncements} unread
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/notifications/system" className="block">
          <Card className="bg-white border-red-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">System Alerts</p>
                  <p className="text-2xl font-bold text-red-900">{systemStats.criticalAlerts}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              {systemStats.criticalAlerts > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {systemStats.criticalAlerts} critical
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Navigation Cards */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {notificationPages.map((page) => (
          <Link key={page.href} href={page.href}>
            <Card className="border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${page.color}`}>
                    <page.icon className="h-6 w-6" />
                  </div>
                  {page.count !== null && page.count > 0 && (
                    <Badge className="bg-red-500 text-white">
                      {page.count}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mt-4 group-hover:text-blue-600 transition-colors">
                  {page.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {page.description}
                </p>
                <div className="flex items-center text-sm text-blue-600 mt-4">
                  <span>View</span>
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* System Alerts Banner */}
      {systemStats.criticalAlerts > 0 && (
        <Link href="/admin/notifications/system">
          <Card className="mb-6 border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Critical System Alerts</p>
                  <p className="text-sm text-red-600">
                    {systemStats.criticalAlerts} unresolved errors require immediate attention
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-red-600 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Filters */}
      <Card className="mb-6 border border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <NotificationFilters
            filter={filter}
            onFilterChange={setFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            totalCount={notifications.length}
            userRole="admin"
          />
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Recent Notifications</CardTitle>
            <Link href="/admin/notifications/announcements" className="text-sm text-blue-600 hover:underline">
              View all announcements →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <NotificationList
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              userRole="admin"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}