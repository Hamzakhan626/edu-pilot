'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  CheckCheck,
  TrendingUp,
  AlertCircle,
  FileText,
  Download,
  ChevronRight,
  Clock
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

interface FinanceStats {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  paymentRequests: number;
  pendingApprovals: number;
  feeAlerts: number;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FinanceNotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [financeStats, setFinanceStats] = useState<FinanceStats>({
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0,
    collectionRate: 0,
    paymentRequests: 0,
    pendingApprovals: 0,
    feeAlerts: 0
  });

  // Navigation items for finance notification pages
  const notificationPages = [
    {
      title: 'Fee Alerts',
      description: 'Monitor and manage student fee payments',
      href: '/finance/notifications/fee-alerts',
      icon: AlertCircle,
      color: 'bg-red-100 text-red-600',
      count: financeStats.feeAlerts
    },
    {
      title: 'Payment Receipts',
      description: 'View and verify payment transactions',
      href: '/finance/notifications/payment-receipts',
      icon: FileText,
      color: 'bg-green-100 text-green-600',
      count: financeStats.paymentRequests
    },
    {
      title: 'Budget Approvals',
      description: 'Review and approve budget requests',
      href: '/finance/notifications/budget-approvals',
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-600',
      count: financeStats.pendingApprovals
    },
    {
      title: 'Financial Reports',
      description: 'Generate and view financial reports',
      href: '/finance/notifications/financial-reports',
      icon: Download,
      color: 'bg-purple-100 text-purple-600',
      count: null
    },
    {
      title: 'Settings',
      description: 'Configure notification preferences',
      href: '/finance/notifications/settings',
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
        fetchFinanceStats();
      }
    };
    getUser();
  }, []);

  const fetchFinanceStats = async () => {
    try {
      // Get fee statistics
      const { data: fees, error } = await supabase
        .from('fees')
        .select('amount, status');

      if (error) throw error;

      const totalCollected = fees?.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0) || 0;
      const totalPending = fees?.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0) || 0;
      
      // Get overdue fees (pending and past due date)
      const today = new Date().toISOString().split('T')[0];
      const { data: overdueFees } = await supabase
        .from('fees')
        .select('amount')
        .eq('status', 'pending')
        .lt('due_date', today);

      const totalOverdue = overdueFees?.reduce((sum, f) => sum + f.amount, 0) || 0;

      // Get payment requests
      const { count: paymentRequests } = await supabase
        .from('payment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setFinanceStats({
        totalCollected,
        totalPending,
        totalOverdue,
        collectionRate: totalCollected + totalPending > 0 
          ? (totalCollected / (totalCollected + totalPending)) * 100 
          : 0,
        paymentRequests: paymentRequests || 0,
        pendingApprovals: 2, // This would come from budget approvals table
        feeAlerts: overdueFees?.length || 0
      });
    } catch (error) {
      console.error('Error fetching finance stats:', error);
    }
  };

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

  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel('finance-notifications')
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
          <h1 className="text-3xl font-bold text-gray-900">Finance Notifications</h1>
          <p className="text-gray-600 mt-1">
            Track fee payments, due dates, and financial updates
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/finance/notifications/settings">
            <Button variant="outline" className="gap-2 bg-white border-gray-300">
              <Settings className="h-4 w-4" />
              Preferences
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
        <Card className="bg-white border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Collected</p>
                <p className="text-2xl font-bold text-green-900">
                  ₹{(financeStats.totalCollected / 100000).toFixed(1)}L
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">
                  ₹{(financeStats.totalPending / 100000).toFixed(1)}L
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Link href="/finance/notifications/fee-alerts" className="block">
          <Card className="bg-white border-red-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-900">
                    ₹{(financeStats.totalOverdue / 100000).toFixed(1)}L
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              {financeStats.feeAlerts > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {financeStats.feeAlerts} overdue payments
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Card className="bg-white border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Collection Rate</p>
                <p className="text-2xl font-bold text-purple-900">
                  {financeStats.collectionRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection Progress */}
      <Card className="mb-6 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Collection Progress</p>
            <span className="text-sm text-gray-600">{financeStats.collectionRate.toFixed(1)}%</span>
          </div>
          <Progress value={financeStats.collectionRate} className="h-2" />
        </CardContent>
      </Card>

      {/* Quick Navigation Cards */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

      {/* Overdue Alert */}
      {financeStats.feeAlerts > 0 && (
        <Link href="/finance/notifications/fee-alerts">
          <Card className="mb-6 border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">Overdue Payments</p>
                  <p className="text-sm text-red-600">
                    {financeStats.feeAlerts} students have overdue payments. Send reminders.
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-red-600" />
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
            userRole="finance"
          />
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Recent Notifications</CardTitle>
            <Link href="/finance/notifications/fee-alerts" className="text-sm text-blue-600 hover:underline">
              View all fee alerts →
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
              userRole="finance"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}