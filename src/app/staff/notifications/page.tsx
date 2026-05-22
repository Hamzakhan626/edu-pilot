/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bell,
  AlertCircle,
  CheckCircle,
  ClipboardCheck,
  Megaphone,
  MessageCircle,
  Calendar,
  Search,
  Filter,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/auth';



// ─── Types ───────────────────────────────────────────────────────────────────
type NotifType = 'Ticket' | 'Task' | 'Announcement' | 'System';
type Severity  = 'Info' | 'Success' | 'Warning' | 'Critical';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: NotifType;
  severity: Severity;
  isRead: boolean;
  sourceTable: 'service_tickets' | 'staff_tasks' | 'notifications';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatShort(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const day     = String(dt.getDate()).padStart(2, '0');
  const month   = String(dt.getMonth() + 1).padStart(2, '0');
  const hours   = String(dt.getHours()).padStart(2, '0');
  const minutes = String(dt.getMinutes()).padStart(2, '0');
  return `${day}-${month} ${hours}:${minutes}`;
}

function mapSeverity(raw: string | null | undefined): Severity {
  const s = (raw ?? '').toLowerCase();
  if (s === 'critical') return 'Critical';
  if (s === 'warning' || s === 'medium') return 'Warning';
  if (s === 'success') return 'Success';
  return 'Info';
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function StaffNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filters
  const [selectedType,     setSelectedType]     = useState<'all' | NotifType>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | Severity>('all');
  const [showUnreadOnly,   setShowUnreadOnly]   = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');

  // ── 1. Get logged-in user from public.users (synced with auth) ─────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not authenticated'); setLoading(false); return; }

      // Use public.users table (synced with auth.users)
      const { data: publicUser, error: userErr } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)       // public.users.id mirrors auth.users.id
        .single();

      if (userErr || !publicUser) {
        setError('Could not resolve staff user.');
        setLoading(false);
        return;
      }
      setCurrentUserId(publicUser.id);
    })();
  }, []);

  // ── 2. Fetch all data once user id is known ────────────────────────────────
  const fetchAll = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      // ── A. service_tickets assigned to this staff member ──────────────────
      const { data: tickets, error: ticketErr } = await supabase
        .from('service_tickets')
        .select('id, title, subject, status, priority, created_at, is_read')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ticketErr) throw new Error(`Tickets: ${ticketErr.message}`);

      // ── B. staff_tasks assigned to this staff member ──────────────────────
      const { data: tasks, error: taskErr } = await supabase
        .from('staff_tasks')
        .select('id, title, description, status, priority, created_at, is_read')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });

      if (taskErr) throw new Error(`Tasks: ${taskErr.message}`);

      // ── C. notifications for this user (announcements + system) ──────────
      const { data: notifs, error: notifErr } = await supabase
        .from('notifications')
        .select('id, title, message, type, severity, created_at, is_read')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (notifErr) throw new Error(`Notifications: ${notifErr.message}`);

      // ── Map to unified shape ──────────────────────────────────────────────
      const mapped: Notification[] = [
        ...(tickets ?? []).map((t) => ({
          id:          t.id,
          title:       t.title ?? 'Ticket',
          message:     t.subject ?? '',
          createdAt:   t.created_at,
          type:        'Ticket' as NotifType,
          severity:    mapSeverity(t.priority),
          isRead:      t.is_read ?? false,
          sourceTable: 'service_tickets' as const,
        })),
        ...(tasks ?? []).map((t) => ({
          id:          t.id,
          title:       t.title ?? 'Task',
          message:     t.description ?? '',
          createdAt:   t.created_at,
          type:        'Task' as NotifType,
          severity:    mapSeverity(t.priority),
          isRead:      t.is_read ?? false,
          sourceTable: 'staff_tasks' as const,
        })),
        ...(notifs ?? []).map((n) => ({
          id:          n.id,
          title:       n.title ?? 'Notification',
          message:     n.message ?? '',
          createdAt:   n.created_at,
          type:        (n.type === 'Announcement' ? 'Announcement' : 'System') as NotifType,
          severity:    mapSeverity(n.severity),
          isRead:      n.is_read ?? false,
          sourceTable: 'notifications' as const,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(mapped);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUserId) fetchAll(currentUserId);
  }, [currentUserId, fetchAll]);

  // ── 3. Mark single notification as read ───────────────────────────────────
  const markAsRead = async (notif: Notification) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n)
    );
    await supabase
      .from(notif.sourceTable)
      .update({ is_read: true })
      .eq('id', notif.id);
  };

  // ── 4. Mark all as read ───────────────────────────────────────────────────
  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    const tables = ['service_tickets', 'staff_tasks', 'notifications'] as const;
    const ids = {
      service_tickets: notifications.filter((n) => n.sourceTable === 'service_tickets' && !n.isRead).map((n) => n.id),
      staff_tasks:     notifications.filter((n) => n.sourceTable === 'staff_tasks'     && !n.isRead).map((n) => n.id),
      notifications:   notifications.filter((n) => n.sourceTable === 'notifications'   && !n.isRead).map((n) => n.id),
    };

    for (const table of tables) {
      if (ids[table].length) {
        await supabase.from(table).update({ is_read: true }).in('id', ids[table]);
      }
    }
  };

  // ── 5. Dismiss (soft-delete via is_read = true for now) ───────────────────
  const dismiss = async (notif: Notification) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    // Mark as read so it won't resurface
    await supabase
      .from(notif.sourceTable)
      .update({ is_read: true })
      .eq('id', notif.id);
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const unreadCount      = notifications.filter((n) => !n.isRead).length;
  const ticketTaskCount  = notifications.filter((n) => n.type === 'Ticket' || n.type === 'Task').length;
  const announcementCount= notifications.filter((n) => n.type === 'Announcement').length;

  const summaryCards = [
    { label: 'Total Notifications', value: notifications.length, icon: Bell,          color: 'blue',   note: 'All types combined' },
    { label: 'Unread',              value: unreadCount,          icon: AlertCircle,   color: 'orange', note: 'Mark as read from this page' },
    { label: 'Ticket & Task Alerts',value: ticketTaskCount,      icon: ClipboardCheck,color: 'green',  note: 'Items that need your action' },
    { label: 'Announcements',       value: announcementCount,    icon: Megaphone,     color: 'purple', note: 'Operational and HR updates' },
  ];

  const getIcon = (type: NotifType) => {
    switch (type) {
      case 'Ticket':       return <ClipboardCheck className="h-4 w-4 text-indigo-600" />;
      case 'Announcement': return <Megaphone      className="h-4 w-4 text-indigo-600" />;
      case 'Task':         return <MessageCircle  className="h-4 w-4 text-blue-600"   />;
      default:             return <Calendar       className="h-4 w-4 text-gray-600"   />;
    }
  };

  const getSeverityBadge = (s: Severity) => {
    switch (s) {
      case 'Critical': return 'bg-red-50 text-red-700 border border-red-200';
      case 'Warning':  return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Success':  return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default:         return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase();
  const filtered = notifications.filter((n) => {
    if (showUnreadOnly && n.isRead) return false;
    if (selectedType     !== 'all' && n.type     !== selectedType)     return false;
    if (selectedSeverity !== 'all' && n.severity !== selectedSeverity) return false;
    if (q && !n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) return false;
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl bg-white min-h-screen">
      {/* Staff Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Notifications</h1>
            <p className="text-gray-600 mt-1">
              Stay updated with tasks, meetings, and announcements
            </p>
          </div>
          <Button
            className="bg-white text-sky-700 hover:bg-sky-50"
            onClick={markAllRead}
            disabled={unreadCount === 0 || loading}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((s, i) => {
          const Icon    = s.icon;
          const isAlert = s.label === 'Unread';
          return (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <div className={`p-3 bg-${s.color}-100 rounded-xl`}>
                    <Icon className={`h-6 w-6 text-${s.color}-600`} />
                  </div>
                  {isAlert
                    ? <AlertCircle  className="h-4 w-4 text-red-500"   />
                    : <CheckCircle  className="h-4 w-4 text-green-500" />}
                </div>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                {loading
                  ? <div className="h-5 w-8 bg-gray-200 rounded animate-pulse mb-1" />
                  : <p className="text-lg font-bold text-gray-900 mb-1">{s.value}</p>}
                <p className="text-xs text-gray-600">{s.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Filter by type, severity, and read status</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'all' | NotifType)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Types</option>
                <option value="Ticket">Ticket</option>
                <option value="Task">Task</option>
                <option value="Announcement">Announcement</option>
                <option value="System">System</option>
              </select>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as 'all' | Severity)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Severities</option>
                <option value="Info">Info</option>
                <option value="Success">Success</option>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
              </select>

              <button
                type="button"
                onClick={() => setShowUnreadOnly((v) => !v)}
                className={`px-3 py-2 rounded-lg text-xs border ${
                  showUnreadOnly
                    ? 'bg-sky-50 text-sky-700 border-sky-300'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {showUnreadOnly ? 'Showing unread only' : 'Show unread only'}
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search notifications by title or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification list */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Notification Inbox
          </CardTitle>
          <CardDescription>
            Recent alerts affecting your daily staff duties
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading notifications…</p>
            </div>
          ) : (
            <div className="space-y-3 text-xs md:text-sm">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    n.isRead
                      ? 'border-gray-200 bg-white'
                      : 'border-sky-200 bg-sky-50'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex gap-3 flex-1">
                      <div className="mt-0.5">{getIcon(n.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-gray-900">{n.title}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] ${getSeverityBadge(n.severity)}`}>
                            {n.severity}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-50 text-gray-700 border border-gray-200">
                            {n.type}
                          </span>
                          {!n.isRead && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-600 text-white">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-1 line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-gray-500">{formatShort(n.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:self-center">
                      {!n.isRead && (
                        <Button size="sm" variant="outline" onClick={() => markAsRead(n)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Mark Read
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => dismiss(n)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    No notifications match the current filters or search query.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}