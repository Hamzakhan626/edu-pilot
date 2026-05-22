'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Clock, AlertCircle, CheckCircle, Trash2, BookOpen, GraduationCap, Calendar, Settings, RefreshCw, BellOff, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/auth';


// ─── Types ─────────────────────────────────────────────────────────────────────

type NotificationType = 'assignment' | 'attendance' | 'grade' | 'reminder' | 'system' | 'announcement';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  related_entity_id: string | null;
  related_entity_type: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

// ─── Config ─────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string; dot: string }
> = {
  assignment: {
    label: 'Assignment',
    icon: <BookOpen className="w-4 h-4" />,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
  },
  attendance: {
    label: 'Attendance',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  grade: {
    label: 'Grade',
    icon: <GraduationCap className="w-4 h-4" />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  reminder: {
    label: 'Reminder',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  system: {
    label: 'System',
    icon: <Settings className="w-4 h-4" />,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
  },
  announcement: {
    label: 'Announcement',
    icon: <Bell className="w-4 h-4" />,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
};

const DEFAULT_TYPE_CONFIG = {
  label: 'Notice',
  icon: <Bell className="w-4 h-4" />,
  color: 'text-slate-600',
  bg: 'bg-slate-50',
  border: 'border-slate-200',
  dot: 'bg-slate-500',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(notifications: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  notifications.forEach(n => {
    const date = new Date(n.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    let label: string;
    if (diffDays === 0) label = 'Today';
    else if (diffDays === 1) label = 'Yesterday';
    else if (diffDays < 7) label = 'This Week';
    else label = 'Older';

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="animate-pulse flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-100 rounded-lg w-3/5" />
        <div className="h-3 bg-slate-100 rounded-lg w-4/5" />
        <div className="h-3 bg-slate-100 rounded-lg w-1/4" />
      </div>
    </div>
  );
}

// ─── Notification Card ────────────────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationCard({ notification, onMarkRead, onDelete }: NotificationCardProps) {
  const typeKey = notification.notification_type as NotificationType;
  const config = TYPE_CONFIG[typeKey] || DEFAULT_TYPE_CONFIG;
  const isUnread = !notification.is_read;

  return (
    <div
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
      className={`
        group relative flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200
        ${isUnread
          ? 'bg-white border-slate-200 shadow-sm hover:shadow-md cursor-pointer'
          : 'bg-slate-50/60 border-slate-100 hover:bg-white hover:border-slate-200'
        }
      `}
    >
      {/* Unread indicator strip */}
      {isUnread && (
        <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full ${config.dot}`} />
      )}

      {/* Icon */}
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105
        ${config.bg} ${config.color}
      `}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-sm font-semibold leading-snug ${isUnread ? 'text-slate-900' : 'text-slate-600'}`}>
              {notification.title}
            </h3>
            {isUnread && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${config.bg} ${config.color}`}>
                {config.label}
              </span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className={`text-xs mt-1 leading-relaxed line-clamp-2 ${isUnread ? 'text-slate-600' : 'text-slate-400'}`}>
          {notification.message}
        </p>
        <p className="text-[11px] text-slate-400 mt-2 font-medium">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'unread' | NotificationType;

export default function NotificationsPage() {

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  // ─── Fetch ────────────────────────────────────────────

  const fetchNotifications = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('Authentication required. Please sign in.');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        setError(`Failed to load notifications: ${fetchError.message}`);
        return;
      }

      setNotifications(data || []);
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ─── Real-time subscription ────────────────────────────

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotifications(prev => [payload.new as Notification, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev =>
                prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
              );
            } else if (payload.eventType === 'DELETE') {
              setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            }
          }
        )
        .subscribe();
    };

    setupRealtime();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [supabase]);

  // ─── Actions ──────────────────────────────────────────

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
    );
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      // Rollback
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: false, read_at: null } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!unreadIds.length) return;

    const now = new Date().toISOString();
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: now })));

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .in('id', unreadIds);

    if (error) {
      // Rollback
      setNotifications(prev =>
        prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: false, read_at: null } : n)
      );
    }
  };

  const deleteNotification = async (id: string) => {
    const backup = notifications.find(n => n.id === id);
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));

    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error && backup) {
      // Rollback
      setNotifications(prev => {
        const copy = [...prev];
        copy.push(backup);
        return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });
    }
  };

  const clearAllRead = async () => {
    const readIds = notifications.filter(n => n.is_read).map(n => n.id);
    if (!readIds.length) return;

    setNotifications(prev => prev.filter(n => !n.is_read));
    await supabase.from('notifications').delete().in('id', readIds);
  };

  // ─── Filter logic ──────────────────────────────────────

  const filtered = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !n.is_read;
    return n.notification_type === activeFilter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const grouped = groupByDate(filtered);
  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Older'];

  // ─── Count by type ────────────────────────────────────

  const typeCounts = notifications.reduce<Record<string, number>>((acc, n) => {
    acc[n.notification_type] = (acc[n.notification_type] || 0) + 1;
    return acc;
  }, {});

  const filterTabs: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    ...(Object.keys(TYPE_CONFIG) as NotificationType[])
      .filter(t => typeCounts[t] > 0)
      .map(t => ({ key: t as FilterType, label: TYPE_CONFIG[t].label, count: typeCounts[t] })),
  ];

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 ml-10">Your activity feed & alerts</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNotifications(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all hover:shadow-sm disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-all hover:shadow-md flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filterTabs.map(tab => {
            const isActive = activeFilter === tab.key;
            const typeConf = tab.key !== 'all' && tab.key !== 'unread'
              ? TYPE_CONFIG[tab.key as NotificationType]
              : null;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`
                  flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all
                  ${isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }
                `}
              >
                {typeConf && <span className={isActive ? 'text-white' : typeConf.color}>{typeConf.icon}</span>}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`
                    inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-bold
                    ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <NotificationSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-sm font-medium text-rose-700">{error}</p>
            <button
              onClick={() => fetchNotifications()}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
              <BellOff className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">
                {activeFilter === 'unread' ? 'All caught up!' : 'No notifications'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeFilter === 'unread'
                  ? "You've read everything. Nice work!"
                  : 'New notifications will appear here.'}
              </p>
            </div>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800 transition-colors"
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groupOrder
              .filter(g => grouped[g]?.length > 0)
              .map(group => (
                <div key={group}>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{group}</p>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] text-slate-400 font-medium">{grouped[group].length}</span>
                  </div>
                  <div className="space-y-2">
                    {grouped[group].map(notification => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))}
                  </div>
                </div>
              ))
            }

            {/* Footer actions */}
            {notifications.some(n => n.is_read) && (
              <div className="pt-2 text-center">
                <button
                  onClick={clearAllRead}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
                >
                  Clear all read notifications
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats footer */}
        {!loading && !error && notifications.length > 0 && (
          <div className="flex items-center justify-center gap-5 pt-2 pb-4">
            {[
              { label: 'Total', value: notifications.length, color: 'text-slate-500' },
              { label: 'Unread', value: unreadCount, color: 'text-rose-500 font-semibold' },
              { label: 'Read', value: notifications.length - unreadCount, color: 'text-emerald-600' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className={`text-sm ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}