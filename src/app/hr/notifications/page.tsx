'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bell,
  AlertCircle,
  CheckCircle,
  Info,
  MessageSquare,
  Calendar,
  ClipboardCheck,
  Users,
  Mail,
  Search,
  Filter,
  Trash2,
  Eye,
  Loader2,
  X,

} from 'lucide-react';
import { supabase } from '@/lib/auth';
import { toast } from 'sonner';
import Link from 'next/link';


// ─── Types ───────────────────────────────────────────────────────────────────
type NotificationType = 'System' | 'Attendance' | 'Assignment' | 'QnA' | 'Event' | 'Hiring';
type NotificationSeverity = 'Info' | 'Success' | 'Warning' | 'Critical';
type AudienceScope = 'HoD' | 'Faculty' | 'Dept' | 'HR' | 'All';

interface HRNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: NotificationType;
  severity: NotificationSeverity;
  source: string;
  audience: AudienceScope;
  relatedId?: string | null;
  relatedKind?: string | null;
  isRead: boolean;
  pinned?: boolean;
  sourceTable: 'notifications' | 'hiring_requests' | 'service_tickets';
}

// ─── localStorage helpers for hiring_requests (no is_read / delete column) ──
const LS_DISMISSED_KEY = 'hr_dismissed_hiring_ids';
const LS_READ_KEY      = 'hr_read_hiring_ids';

function getSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? '[]'));
  } catch {
    return new Set();
  }
}

function addToSet(key: string, id: string) {
  const s = getSet(key);
  s.add(id);
  localStorage.setItem(key, JSON.stringify([...s]));
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function formatShortDateTime(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day     = String(d.getDate()).padStart(2, '0');
  const month   = String(d.getMonth() + 1).padStart(2, '0');
  const hours   = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month} ${hours}:${minutes}`;
}

function mapSeverity(raw: string | null | undefined): NotificationSeverity {
  const s = (raw ?? '').toLowerCase();
  if (s === 'critical' || s === 'high')   return 'Critical';
  if (s === 'warning'  || s === 'medium') return 'Warning';
  if (s === 'success')                    return 'Success';
  return 'Info';
}

function mapAudience(raw: string | null | undefined): AudienceScope {
  const s = (raw ?? '').toLowerCase();
  if (s === 'hod')                          return 'HoD';
  if (s === 'faculty')                      return 'Faculty';
  if (s === 'dept' || s === 'department')   return 'Dept';
  if (s === 'hr')                           return 'HR';
  return 'All';
}

function mapNotifType(raw: string | null | undefined): NotificationType {
  const s = (raw ?? '').toLowerCase();
  if (s === 'attendance') return 'Attendance';
  if (s === 'assignment') return 'Assignment';
  if (s === 'qna')        return 'QnA';
  if (s === 'event')      return 'Event';
  if (s === 'hiring')     return 'Hiring';
  return 'System';
}

function getSeverityBadgeClass(severity: NotificationSeverity) {
  switch (severity) {
    case 'Critical': return 'bg-red-50 text-red-700 border border-red-200';
    case 'Warning':  return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'Success':  return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    default:         return 'bg-blue-50 text-blue-700 border border-blue-200';
  }
}

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'Attendance':  return <ClipboardCheck className="h-4 w-4 text-blue-600" />;
    case 'Assignment':  return <CheckCircle    className="h-4 w-4 text-purple-600" />;
    case 'QnA':         return <MessageSquare  className="h-4 w-4 text-indigo-600" />;
    case 'Event':       return <Calendar       className="h-4 w-4 text-green-600" />;
    case 'Hiring':      return <Users          className="h-4 w-4 text-amber-600" />;
    default:            return <Info           className="h-4 w-4 text-gray-600" />;
  }
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function NotificationDetailModal({
  notif,
  onClose,
  onMarkRead,
  onDismiss,
}: {
  notif: HRNotification;
  onClose: () => void;
  onMarkRead: (n: HRNotification) => void;
  onDismiss: (n: HRNotification) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-sky-50 rounded-lg">{getTypeIcon(notif.type)}</div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg leading-tight">{notif.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{formatShortDateTime(notif.createdAt)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${getSeverityBadgeClass(notif.severity)}`}>
              {notif.severity}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-50 text-gray-700 border border-gray-200">
              {notif.type}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200">
              {notif.audience}
            </span>
            {!notif.isRead && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-600 text-white">New</span>
            )}
            {notif.pinned && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-200">
                Pinned
              </span>
            )}
          </div>

          <p className="text-sm text-gray-700 leading-relaxed mb-4">{notif.message}</p>

          {(notif.relatedId || notif.relatedKind) && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 mb-4">
              <span className="font-medium">Linked:</span>{' '}
              {notif.relatedKind} {notif.relatedId && `— ${notif.relatedId}`}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 mb-5">
            <span className="font-medium">Source:</span> {notif.source}
          </div>

          <div className="flex gap-3 justify-end">
            {!notif.isRead && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { onMarkRead(notif); onClose(); }}
              >
                <Eye className="h-4 w-4 mr-1" /> Mark as Read
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => { onDismiss(notif); onClose(); }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Dismiss
            </Button>
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HRNotificationsPage() {
  const [notifications, setNotifications] = useState<HRNotification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedNotif, setSelectedNotif] = useState<HRNotification | null>(null);

  // Filters
  const [searchQuery,      setSearchQuery]      = useState('');
  const [selectedType,     setSelectedType]     = useState<'all' | NotificationType>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | NotificationSeverity>('all');
  const [selectedAudience, setSelectedAudience] = useState<'all' | AudienceScope>('all');
  const [showOnlyUnread,   setShowOnlyUnread]   = useState(false);

  // ── 1. Resolve logged-in HR user ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not authenticated'); setLoading(false); return; }

      const { data: publicUser, error: userErr } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (userErr || !publicUser) {
        setError('Could not resolve HR user.');
        setLoading(false);
        return;
      }
      setCurrentUserId(publicUser.id);
    })();
  }, []);

  // ── 2. Fetch all notification sources ────────────────────────────────────
  const fetchAll = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      // A. User's own notifications
      const { data: notifs, error: notifErr } = await supabase
        .from('notifications')
        .select('id, title, message, type, severity, created_at, is_read, user_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (notifErr) throw new Error(`Notifications: ${notifErr.message}`);

      // B. All hiring requests (HR visibility)
      const { data: hires, error: hireErr } = await supabase
        .from('hiring_requests')
        .select('id, title, status, priority, created_at, department_id, requested_by, approved_by')
        .order('created_at', { ascending: false })
        .limit(50);

      if (hireErr) throw new Error(`Hiring requests: ${hireErr.message}`);

      // C. Service tickets for this user
      const { data: tickets, error: ticketErr } = await supabase
        .from('service_tickets')
        .select('id, title, subject, status, priority, created_at, is_read')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ticketErr) throw new Error(`Tickets: ${ticketErr.message}`);

      // Read from localStorage for hiring rows (no DB column for these)
      const dismissedHiringIds = getSet(LS_DISMISSED_KEY);
      const readHiringIds      = getSet(LS_READ_KEY);

      // ── Map to unified shape ─────────────────────────────────────────────
      const mapped: HRNotification[] = [
        ...(notifs ?? []).map((n) => ({
          id:          n.id,
          title:       n.title ?? 'Notification',
          message:     n.message ?? '',
          createdAt:   n.created_at,
          type:        mapNotifType(n.type),
          severity:    mapSeverity(n.severity),
          source:      'Notifications system',
          audience:    mapAudience(null),   // notifications table has no audience column
          relatedId:   null,
          relatedKind: null,
          isRead:      n.is_read ?? false,
          pinned:      false,
          sourceTable: 'notifications' as const,
        })),

        // Filter out locally-dismissed hiring rows; restore read state from localStorage
        ...(hires ?? [])
          .filter((h) => !dismissedHiringIds.has(h.id))
          .map((h) => ({
            id:          h.id,
            title:       h.title ?? 'Hiring Request',
            message:     `Hiring request is currently ${h.status ?? 'pending'}.`,
            createdAt:   h.created_at,
            type:        'Hiring' as NotificationType,
            severity:    mapSeverity(h.priority),
            source:      'HR & Hiring module',
            audience:    'HR' as AudienceScope,
            relatedId:   h.id,
            relatedKind: 'Hiring',
            isRead:      readHiringIds.has(h.id),   // ← restored from localStorage
            pinned:      false,
            sourceTable: 'hiring_requests' as const,
          })),

        ...(tickets ?? []).map((t) => ({
          id:          t.id,
          title:       t.title ?? 'Service Ticket',
          message:     t.subject ?? '',
          createdAt:   t.created_at,
          type:        'System' as NotificationType,
          severity:    mapSeverity(t.priority),
          source:      'Service tickets',
          audience:    'HR' as AudienceScope,
          relatedId:   t.id,
          relatedKind: 'Ticket',
          isRead:      t.is_read ?? false,
          pinned:      false,
          sourceTable: 'service_tickets' as const,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(mapped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUserId) fetchAll(currentUserId);
  }, [currentUserId, fetchAll]);

  // ── 3. Mark single notification as read ──────────────────────────────────
  const markAsRead = async (notif: HRNotification) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n)
    );

    if (notif.sourceTable === 'hiring_requests') {
      // No is_read column — persist in localStorage instead
      addToSet(LS_READ_KEY, notif.id);
      toast.success('Marked as read');
      return;
    }

    const { error } = await supabase
      .from(notif.sourceTable)
      .update({ is_read: true })
      .eq('id', notif.id);

    if (error) {
      // Revert optimistic update on failure
      setNotifications((prev) =>
        prev.map((n) => n.id === notif.id ? { ...n, isRead: false } : n)
      );
      toast.error('Failed to mark as read');
    } else {
      toast.success('Marked as read');
    }
  };

  // ── 4. Mark all as read ───────────────────────────────────────────────────
  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) { toast.info('All notifications are already read'); return; }

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    // Hiring rows → localStorage (no DB column)
    unread
      .filter((n) => n.sourceTable === 'hiring_requests')
      .forEach((n) => addToSet(LS_READ_KEY, n.id));

    // DB updates for the other two tables
    const notifIds  = unread.filter((n) => n.sourceTable === 'notifications'  ).map((n) => n.id);
    const ticketIds = unread.filter((n) => n.sourceTable === 'service_tickets').map((n) => n.id);

    const updates: PromiseLike<any>[] = [];

if (notifIds.length) {
  updates.push(
    supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', notifIds)
  );
}

if (ticketIds.length) {
  updates.push(
    supabase
      .from('service_tickets')
      .update({ is_read: true })
      .in('id', ticketIds)
  );
}



    const results = await Promise.all(updates);
    const anyError = results.find((r) => r.error);
    if (anyError) toast.error('Some notifications could not be updated');
    else toast.success('All notifications marked as read');
  };

  // ── 5. Dismiss (permanently remove) ──────────────────────────────────────
  const dismiss = async (notif: HRNotification) => {
    // Optimistic UI update — remove immediately
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));

    if (notif.sourceTable === 'hiring_requests') {
      // No delete column — store dismissed ID in localStorage so it's filtered on next fetch
      addToSet(LS_DISMISSED_KEY, notif.id);
      toast.success('Notification dismissed');
      return;
    }

    // For notifications and tickets: DELETE the actual row so it won't come back on refresh
    const { error } = await supabase
      .from(notif.sourceTable)
      .delete()
      .eq('id', notif.id);

    if (error) {
      // Restore on failure
      setNotifications((prev) => [...prev, notif].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      toast.error('Failed to dismiss notification');
    } else {
      toast.success('Notification dismissed');
    }
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const unreadCount  = notifications.filter((n) => !n.isRead).length;
  const warningCount = notifications.filter((n) => n.severity === 'Warning' || n.severity === 'Critical').length;
  const todayCount   = notifications.filter(
    (n) => new Date(n.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const summaryCards = [
    { label: 'Total Notifications', value: notifications.length, icon: Bell,          color: 'blue',   note: 'All types and severities',             alert: false },
    { label: 'Unread',              value: unreadCount,          icon: AlertCircle,   color: 'orange', note: 'Items requiring attention',             alert: true  },
    { label: 'Warnings / Critical', value: warningCount,         icon: ClipboardCheck,color: 'red',    note: 'Attendance, hiring, and system risks',  alert: true  },
    { label: "Today's Alerts",      value: todayCount,           icon: Calendar,      color: 'green',  note: 'Generated in the last 24 hours',        alert: false },
  ];

  // ── Filtered list ─────────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase();
  const filtered = notifications.filter((n) => {
    if (showOnlyUnread && n.isRead)                return false;
    if (selectedType     !== 'all' && n.type     !== selectedType)     return false;
    if (selectedSeverity !== 'all' && n.severity !== selectedSeverity) return false;
    if (selectedAudience !== 'all' && n.audience !== selectedAudience) return false;
    if (q && !n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q) && !n.source.toLowerCase().includes(q)) return false;
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Detail Modal */}
      {selectedNotif && (
        <NotificationDetailModal
          notif={selectedNotif}
          onClose={() => setSelectedNotif(null)}
          onMarkRead={markAsRead}
          onDismiss={dismiss}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1">Notifications Center</h1>
            <p className="text-sky-100">
              Central inbox for system, hiring, and operational alerts for HR
            </p>
          </div>
          <Button
            className="bg-white text-sky-700 hover:bg-sky-50"
            onClick={markAllRead}
            disabled={unreadCount === 0 || loading}
          >
            <Mail className="mr-2 h-4 w-4" />
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
        {summaryCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Link href="/notifications">
            <Card key={idx} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* <div className={`p-3 rounded-lg ${page.color}`}>
                    <page.icon className="h-6 w-6" />
                  </div> */}
                  {stat.alert
                    ? <AlertCircle className="h-4 w-4 text-red-500" />
                    : <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
                {loading
                  ? <div className="h-7 w-10 bg-gray-200 rounded animate-pulse mb-1" />
                  : <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>}
                <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                <p className="text-xs text-gray-600">{stat.note}</p>
              </CardContent>
            </Card>
          </Link>
        ) })}
      </div>
          
      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Filter notifications by type, severity, audience, and status</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'all' | NotificationType)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Types</option>
                <option value="System">System</option>
                <option value="Attendance">Attendance</option>
                <option value="Assignment">Assignments</option>
                <option value="QnA">Q&amp;A</option>
                <option value="Event">Events</option>
                <option value="Hiring">Hiring / HR</option>
              </select>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as 'all' | NotificationSeverity)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Severities</option>
                <option value="Info">Info</option>
                <option value="Success">Success</option>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
              </select>

              <select
                value={selectedAudience}
                onChange={(e) => setSelectedAudience(e.target.value as 'all' | AudienceScope)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Audiences</option>
                <option value="HoD">HoD</option>
                <option value="Faculty">Faculty</option>
                <option value="Dept">Department</option>
                <option value="HR">HR</option>
                <option value="All">All Staff</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by title, message, or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowOnlyUnread((v) => !v)}
              className={`px-3 py-2 text-xs rounded-lg border ${
                showOnlyUnread
                  ? 'bg-sky-50 text-sky-700 border-sky-300'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              {showOnlyUnread ? 'Showing unread only' : 'Show only unread'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notification list */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-sky-600 text-white">
                {unreadCount} unread
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Most recent alerts from hiring, system events, and operational updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading notifications…</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    n.isRead
                      ? 'border-gray-200 bg-white'
                      : 'border-sky-200 bg-sky-50'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="flex gap-3 flex-1">
                      <div className="mt-0.5">{getTypeIcon(n.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className={`text-sm font-semibold ${n.isRead ? 'text-gray-900' : 'text-sky-900'}`}>
                            {n.title}
                          </p>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${getSeverityBadgeClass(n.severity)}`}>
                            {n.severity}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                            {n.type}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                            {n.audience}
                          </span>
                          {!n.isRead && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-600 text-white">New</span>
                          )}
                          {n.pinned && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Pinned
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1 line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-gray-500">
                          Source: {n.source}
                          {n.relatedId && n.relatedKind && ` • Linked to ${n.relatedKind}: ${n.relatedId.slice(0, 8)}…`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-1 text-xs text-gray-600 shrink-0">
                      <p>{formatShortDateTime(n.createdAt)}</p>
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="outline" onClick={() => setSelectedNotif(n)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Open
                        </Button>
                        {!n.isRead && (
                          <Button size="sm" variant="outline" onClick={() => markAsRead(n)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Read
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => dismiss(n)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && !loading && (
                <div className="text-center py-10">
                  <Bell className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    No notifications match the selected filters or search query.
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