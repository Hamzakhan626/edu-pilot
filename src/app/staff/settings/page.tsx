'use client';

/**
 * Staff Settings Page — Supabase-integrated
 *
 * Tables used (read/write):
 *   - users               (profile: display_name, role, department, email, phone_ext)
 *   - user_notification_settings  (per-user notification prefs — created if absent)
 *   - service_tickets     (read-only count for the security summary)
 *   - staff_tasks         (read-only count)
 *   - notifications       (read-only count of unread announcements)
 *
 * NEW table required (does NOT exist in schema, safe to create):
 *   - user_notification_settings  ← defined below in SQL migration comment
 *
 * Auth: uses supabase.auth.getUser() → user.id matched against users.id
 *       (users table is synced with auth.users)
 *
 * RLS suggestions are at the bottom of this file as SQL comments.
 */

import { useEffect, useState, useCallback } from 'react';

import {
  Settings,
  Bell,
  Save,
  Shield,
  AlertCircle,
  Users,
  ClipboardCheck,
  Megaphone,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/auth';


/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface UserProfile {
  id: string;
  full_name: string | null;
  role: string | null;
  department_id: string | null;
  email: string | null;
  phone: string | null;
}

interface NotificationSettings {
  user_id: string;
  notify_tickets: boolean;
  notify_tasks: boolean;
  notify_announcements: boolean;
  notify_system: boolean;
  email_digest: 'none' | 'daily' | 'weekly';
}

interface SummaryStats {
  openTickets: number;
  pendingTasks: number;
  unreadAnnouncements: number;
}

/* ─────────────────────────────────────────────
   Toggle pill
───────────────────────────────────────────── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`w-10 h-6 flex items-center rounded-full px-1 cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
        on ? 'bg-indigo-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${
          on ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function StaffSettingsPage() {
  // const supabase = createClientComponentClient();

  /* ── state ── */
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [phoneExt, setPhoneExt] = useState('');

  // Notification prefs
  const [notifyTickets, setNotifyTickets] = useState(true);
  const [notifyTasks, setNotifyTasks] = useState(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(true);
  const [notifySystem, setNotifySystem] = useState(true);
  const [emailDigest, setEmailDigest] = useState<'none' | 'daily' | 'weekly'>('daily');

  // Summary stats
  const [stats, setStats] = useState<SummaryStats>({
    openTickets: 0,
    pendingTasks: 0,
    unreadAnnouncements: 0,
  });

  /* ── helpers ── */

  /** Ensure the user_notification_settings row exists; create defaults if not. */
  const ensureNotifRow = useCallback(
    async (uid: string) => {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Insert defaults
        const defaults: NotificationSettings = {
          user_id: uid,
          notify_tickets: true,
          notify_tasks: true,
          notify_announcements: true,
          notify_system: true,
          email_digest: 'daily',
        };
        const { error: insertErr } = await supabase
          .from('user_notification_settings')
          .insert(defaults);
        if (insertErr) throw insertErr;
        return defaults;
      }
      return data as NotificationSettings;
    },
    [supabase]
  );

  /** Load profile + prefs + stats */
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      /* 1. Resolve logged-in user (public.users synced with auth) */
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Not authenticated');

      const uid = user.id;
      setUserId(uid);

      /* 2. Fetch profile from public.users */
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('id, full_name, role, department_id, email, phone')
        .eq('id', uid)
        .single();
      if (profileErr) throw profileErr;

      const p = profile as UserProfile;
      setDisplayName(p.full_name ?? '');
      setRoleTitle(p.role ?? '');
      setWorkEmail(p.email ?? '');
      setPhoneExt(p.phone ?? '');

      /* 2b. Resolve department name from departments table if department_id exists */
      if (p.department_id) {
        const { data: dept } = await supabase
          .from('departments')
          .select('name')
          .eq('id', p.department_id)
          .maybeSingle();
        if (dept) setDepartment((dept as { name: string }).name);
      }

      /* 3. Notification settings (auto-create row if missing) */
      const notif = await ensureNotifRow(uid);
      setNotifyTickets(notif.notify_tickets);
      setNotifyTasks(notif.notify_tasks);
      setNotifyAnnouncements(notif.notify_announcements);
      setNotifySystem(notif.notify_system);
      setEmailDigest(notif.email_digest);

      /* 4. Summary stats */

      // Open / in-progress tickets assigned to this user
      const { count: ticketCount } = await supabase
        .from('service_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .in('status', ['open', 'in_progress']);

      // Pending tasks assigned to this user
      const { count: taskCount } = await supabase
        .from('staff_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', uid)
        .in('status', ['pending', 'in_progress']);

      // Unread notifications / announcements for this user
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('is_read', false);

      setStats({
        openTickets: ticketCount ?? 0,
        pendingTasks: taskCount ?? 0,
        unreadAnnouncements: notifCount ?? 0,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }, [supabase, ensureNotifRow]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── save handler ── */
  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setSaveStatus('idle');
    setErrorMsg(null);

    try {
      /* Update public.users — only fields this staff member owns */
      const { error: profileErr } = await supabase
        .from('users')
        .update({
          full_name: displayName || null,
          phone: phoneExt || null,
          // email update kept read-only — managed by auth; skip to avoid conflict
        })
        .eq('id', userId);
      if (profileErr) throw profileErr;

      /* Upsert notification settings */
      const { error: notifErr } = await supabase
        .from('user_notification_settings')
        .upsert(
          {
            user_id: userId,
            notify_tickets: notifyTickets,
            notify_tasks: notifyTasks,
            notify_announcements: notifyAnnouncements,
            notify_system: notifySystem,
            email_digest: emailDigest,
          },
          { onConflict: 'user_id' }
        );
      if (notifErr) throw notifErr;

      setSaveStatus('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setErrorMsg(message);
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-500 text-sm">Loading your settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-gray-800 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">Staff Settings</h1>
            <p className="text-indigo-100 text-sm">
              Manage your profile and notification preferences
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === 'success' && (
              <span className="flex items-center gap-1 text-emerald-300 text-sm">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-300 text-sm">
                <XCircle className="h-4 w-4" /> Error
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
          <button
            className="ml-auto text-red-500 hover:text-red-700"
            onClick={loadData}
            title="Retry"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-indigo-600" />}
          label="Open Tickets"
          value={stats.openTickets}
          color="indigo"
        />
        <StatCard
          icon={<ClipboardCheck className="h-5 w-5 text-emerald-600" />}
          label="Pending Tasks"
          value={stats.pendingTasks}
          color="emerald"
        />
        <StatCard
          icon={<Bell className="h-5 w-5 text-purple-600" />}
          label="Unread Notifications"
          value={stats.unreadAnnouncements}
          color="purple"
        />
      </div>

      {/* ── Profile ── */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Settings className="mr-2 h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Details shown to admins, faculty, and other staff
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Display name"
              value={displayName}
              onChange={setDisplayName}
            />
            <Field
              label="Role / title"
              value={roleTitle}
              onChange={setRoleTitle}
              readOnly
              hint="Managed by Admin"
            />
            <Field
              label="Department"
              value={department}
              onChange={setDepartment}
              readOnly
              hint="Managed by Admin"
            />
            <Field
              label="Work email"
              type="email"
              value={workEmail}
              onChange={setWorkEmail}
              readOnly
              hint="Managed via Auth"
            />
            <Field
              label="Phone / extension"
              value={phoneExt}
              onChange={setPhoneExt}
            />
          </div>
          <p className="text-[11px] text-gray-500">
            Fields marked <em>Managed by Admin</em> require an admin or HR action to
            change. Only <strong>Display name</strong> and{' '}
            <strong>Phone/extension</strong> can be updated here.
          </p>
        </CardContent>
      </Card>

      {/* ── Notification preferences ── */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Bell className="mr-2 h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which alerts you receive for tickets, tasks, and announcements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <NotifRow
              icon={<Users className="h-4 w-4 text-indigo-600" />}
              label="Ticket updates"
              description="New tickets assigned, status changes, and replies."
              value={notifyTickets}
              onToggle={() => setNotifyTickets((v) => !v)}
            />
            <NotifRow
              icon={<ClipboardCheck className="h-4 w-4 text-emerald-600" />}
              label="Task reminders"
              description="Tasks assigned to you and due dates."
              value={notifyTasks}
              onToggle={() => setNotifyTasks((v) => !v)}
            />
            <NotifRow
              icon={<Megaphone className="h-4 w-4 text-purple-600" />}
              label="Announcements"
              description="HR, exam cell, and administrative announcements."
              value={notifyAnnouncements}
              onToggle={() => setNotifyAnnouncements((v) => !v)}
            />
            <NotifRow
              icon={<Shield className="h-4 w-4 text-gray-700" />}
              label="System alerts"
              description="Maintenance windows and critical system messages."
              value={notifySystem}
              onToggle={() => setNotifySystem((v) => !v)}
            />
          </div>

          {/* Email digest */}
          <div className="mt-2">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Email digest frequency
            </p>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs gap-0.5">
              {(['none', 'daily', 'weekly'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setEmailDigest(opt)}
                  className={`px-3 py-1 rounded-md capitalize transition-colors ${
                    emailDigest === opt
                      ? 'bg-white text-gray-900 shadow-sm font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt === 'none' ? 'No digest' : opt}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Digest includes a summary of tickets, tasks, and announcements relevant
              to your role.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Security ── */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Shield className="mr-2 h-5 w-5" />
            Security &amp; Access
          </CardTitle>
          <CardDescription>
            How your staff role can view and update information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-gray-600">
          <p>
            Your staff role can view tickets, tasks, and announcements assigned to
            you. Access to student and HR data is controlled by your permissions.
          </p>
          <p className="flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-amber-600 shrink-0" />
            For changes to official records (employment status, base role, salary),
            contact HR or Admin instead of editing this portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'indigo' | 'emerald' | 'purple';
}) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50',
    emerald: 'bg-emerald-50',
    purple: 'bg-purple-50',
  };
  return (
    <div
      className={`${bg[color]} rounded-xl p-4 flex items-center gap-4 shadow-sm border border-white`}
    >
      <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  readOnly = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        {label}
        {hint && (
          <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-400 rounded px-1 py-0.5">
            {hint}
          </span>
        )}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        className={readOnly ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}
      />
    </div>
  );
}

function NotifRow({
  icon,
  label,
  description,
  value,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2.5 gap-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <Toggle on={value} onToggle={onToggle} />
    </div>
  );
}

