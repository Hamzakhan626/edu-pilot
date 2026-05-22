'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bell,
  MessageSquare,
  CheckSquare,
  Clock,
  Shield,
  Users,
  Save,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/auth';



// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DepartmentSettings {
  id: string;
  user_id: string;
  department_id: string | null;
  notify_attendance: boolean;
  notify_assignments: boolean;
  notify_qna: boolean;
  notify_events: boolean;
  notify_hiring: boolean;
  email_digest: 'none' | 'daily' | 'weekly';
  attendance_threshold: number;
  qna_threshold: number;
  low_engagement_threshold: number;
  updated_at: string | null;
}

interface Department {
  id: string;
  name: string;
  hod_id: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  department_id: string | null;
  departments: Department | null;
}

interface ActivityLog {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// InfoModal — shown when user clicks the Shield/Access info icon
// ---------------------------------------------------------------------------
function InfoModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-100 rounded-full p-2">
            <Shield className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Access & Security</h2>
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            <span className="font-semibold text-gray-800">Department Role</span> can:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>View academic analytics for their department</li>
            <li>Monitor staff workload and hiring requests</li>
            <li>Manage notification and threshold settings</li>
            <li>View course, attendance, and Q&A summaries</li>
          </ul>
          <p className="mt-3">
            <span className="font-semibold text-gray-800">Cannot:</span>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Manage global user accounts</li>
            <li>Modify institution-wide settings</li>
            <li>Access other department data</li>
          </ul>
          <p className="mt-4 text-xs text-gray-500 border-t pt-3">
            For system-level configuration or user provisioning, contact the central
            Admin or IT support team.
          </p>
        </div>
        <Button className="mt-5 w-full" onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActivityModal — shows recent settings activity log
// ---------------------------------------------------------------------------
function ActivityModal({
  open,
  onClose,
  logs,
  loading
}: {
  open: boolean;
  onClose: () => void;
  logs: ActivityLog[];
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 rounded-full p-2">
            <Clock className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Settings Change History</h2>
        </div>
        <div className="overflow-y-auto flex-1 pr-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No activity recorded yet</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="border border-gray-100 rounded-lg px-3 py-2 text-sm"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-gray-800 capitalize">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <pre className="text-xs text-gray-500 mt-1 bg-gray-50 rounded p-1 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button variant="outline" className="mt-4" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
export default function DepartmentSettingsPage() {
  // Auth / profile
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Settings state
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [notifyAttendance, setNotifyAttendance] = useState(true);
  const [notifyAssignments, setNotifyAssignments] = useState(true);
  const [notifyQna, setNotifyQna] = useState(true);
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifyHiring, setNotifyHiring] = useState(false);
  const [emailDigest, setEmailDigest] = useState<'none' | 'daily' | 'weekly'>('daily');
  const [attendanceThreshold, setAttendanceThreshold] = useState(75);
  const [qnaThreshold, setQnaThreshold] = useState(24);
  const [lowEngagementThreshold, setLowEngagementThreshold] = useState(60);

  // UI state
  const [saving, setSaving] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  // ---------------------------------------------------------------------------
  // Load current user from public.users (synced with auth)
  // ---------------------------------------------------------------------------
  const loadUser = useCallback(async () => {
    setAuthLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Not authenticated. Please log in.');
        setAuthLoading(false);
        return;
      }

      const authId = session.session.user.id;

      const { data, error } = await supabase
        .from('users')
        .select(
          `id, email, full_name, department_id,
           departments:department_id ( id, name, hod_id )`
        )
        .eq('id', authId)
        .single();

      if (error) throw error;
      setUser(data as unknown as UserProfile);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load user profile.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Load or initialise department_settings for this user
  // ---------------------------------------------------------------------------
  const loadSettings = useCallback(
    async (userId: string) => {
      setSettingsLoading(true);
      try {
        const { data, error } = await supabase
          .from('department_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const s = data as DepartmentSettings;
          setSettingsId(s.id);
          setNotifyAttendance(s.notify_attendance);
          setNotifyAssignments(s.notify_assignments);
          setNotifyQna(s.notify_qna);
          setNotifyEvents(s.notify_events);
          setNotifyHiring(s.notify_hiring);
          setEmailDigest(s.email_digest);
          setAttendanceThreshold(s.attendance_threshold);
          setQnaThreshold(s.qna_threshold);
          setLowEngagementThreshold(s.low_engagement_threshold);
        }
        // If no row exists yet, defaults are already in state — we'll upsert on first save
      } catch (err) {
        console.error(err);
        toast.error('Failed to load settings.');
      } finally {
        setSettingsLoading(false);
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Load activity log entries for this user (department_settings actions)
  // ---------------------------------------------------------------------------
  const loadActivityLogs = useCallback(async (userId: string) => {
    setActivityLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, action, details, created_at')
        .eq('user_id', userId)
        .eq('entity_type', 'department_settings')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivityLogs((data as ActivityLog[]) ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load activity log.');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // On mount: load user then settings
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (user?.id) {
      loadSettings(user.id);
    }
  }, [user, loadSettings]);

  // ---------------------------------------------------------------------------
  // Save settings (upsert)
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        department_id: user.department_id ?? null,
        notify_attendance: notifyAttendance,
        notify_assignments: notifyAssignments,
        notify_qna: notifyQna,
        notify_events: notifyEvents,
        notify_hiring: notifyHiring,
        email_digest: emailDigest,
        attendance_threshold: attendanceThreshold,
        qna_threshold: qnaThreshold,
        low_engagement_threshold: lowEngagementThreshold,
        updated_at: new Date().toISOString()
      };

      let result;
      if (settingsId) {
        result = await supabase
          .from('department_settings')
          .update(payload)
          .eq('id', settingsId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('department_settings')
          .insert(payload)
          .select()
          .single();
        if (!result.error && result.data) {
          setSettingsId((result.data as DepartmentSettings).id);
        }
      }

      if (result.error) throw result.error;

      // Write to activity_log
      await supabase.from('activity_log').insert({
        user_id: user.id,
        entity_type: 'department_settings',
        entity_id: settingsId ?? (result.data as DepartmentSettings).id,
        action: 'update_department_settings',
        details: payload
      });

      toast.success('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Toggle helper & pill/knob style helpers
  // ---------------------------------------------------------------------------
  const toggle = (current: boolean, setter: (v: boolean) => void) =>
    setter(!current);

  const pillClass = (active: boolean) =>
    `w-9 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
      active ? 'bg-indigo-600' : 'bg-gray-300'
    }`;

  const knobClass = (active: boolean) =>
    `bg-white w-3.5 h-3.5 rounded-full shadow transform transition-transform ${
      active ? 'translate-x-4' : 'translate-x-0'
    }`;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-gray-600">Unable to load user profile.</p>
        <Button onClick={loadUser} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const departmentName =
    user.departments?.name ?? 'Department not assigned';
  const departmentEmail = user.email ?? '—';

  return (
    <>
      {/* Modals */}
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <ActivityModal
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        logs={activityLogs}
        loading={activityLoading}
      />

      <div className="space-y-6">
        {/* ------------------------------------------------------------------ */}
        {/* Header */}
        {/* ------------------------------------------------------------------ */}
        <div className="bg-gradient-to-r from-gray-800 to-indigo-700 rounded-2xl p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold mb-1">Department Settings</h1>
              <p className="text-indigo-100">
                Configure communication preferences and academic alert thresholds
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => {
                  loadActivityLogs(user.id);
                  setActivityOpen(true);
                }}
              >
                <Clock className="mr-2 h-4 w-4" />
                History
              </Button>
              <Button
                className="bg-white text-gray-900 hover:bg-gray-100"
                onClick={handleSave}
                disabled={saving || settingsLoading}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Department Profile */}
        {/* ------------------------------------------------------------------ */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Department Profile
            </CardTitle>
            <CardDescription>
              Basic information used across dashboards and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Department name
                    </label>
                    <Input value={departmentName} readOnly className="bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Department email
                    </label>
                    <div className="relative">
                      <Input
                        value={showEmail ? departmentEmail : '••••••••@••••••••'}
                        readOnly
                        className="bg-gray-50 pr-10"
                      />
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowEmail((v) => !v)}
                        type="button"
                      >
                        {showEmail ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  These details are managed by central Admin/IT and shown to students
                  and faculty where department contact information is needed.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* Notification Preferences */}
        {/* ------------------------------------------------------------------ */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose which department-level alerts to enable
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading preferences…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* Attendance */}
                  <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-800">Attendance Alerts</p>
                        <p className="text-xs text-gray-500">
                          Low attendance and critical course-level issues.
                        </p>
                      </div>
                    </div>
                    <div
                      onClick={() => toggle(notifyAttendance, setNotifyAttendance)}
                      className={pillClass(notifyAttendance)}
                      role="switch"
                      aria-checked={notifyAttendance}
                    >
                      <div className={knobClass(notifyAttendance)} />
                    </div>
                  </div>

                  {/* Assignments */}
                  <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="font-semibold text-gray-800">
                          Assignments & Grading
                        </p>
                        <p className="text-xs text-gray-500">
                          Pending submissions and grading backlog.
                        </p>
                      </div>
                    </div>
                    <div
                      onClick={() => toggle(notifyAssignments, setNotifyAssignments)}
                      className={pillClass(notifyAssignments)}
                      role="switch"
                      aria-checked={notifyAssignments}
                    >
                      <div className={knobClass(notifyAssignments)} />
                    </div>
                  </div>

                  {/* Q&A */}
                  <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-indigo-600" />
                      <div>
                        <p className="font-semibold text-gray-800">Q&A / Engagement</p>
                        <p className="text-xs text-gray-500">
                          Overdue student questions and low engagement.
                        </p>
                      </div>
                    </div>
                    <div
                      onClick={() => toggle(notifyQna, setNotifyQna)}
                      className={pillClass(notifyQna)}
                      role="switch"
                      aria-checked={notifyQna}
                    >
                      <div className={knobClass(notifyQna)} />
                    </div>
                  </div>

                  {/* Events */}
                  <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-semibold text-gray-800">Events & Calendar</p>
                        <p className="text-xs text-gray-500">
                          Seminars, exams, and key meetings.
                        </p>
                      </div>
                    </div>
                    <div
                      onClick={() => toggle(notifyEvents, setNotifyEvents)}
                      className={pillClass(notifyEvents)}
                      role="switch"
                      aria-checked={notifyEvents}
                    >
                      <div className={knobClass(notifyEvents)} />
                    </div>
                  </div>

                  {/* Hiring */}
                  <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-600" />
                      <div>
                        <p className="font-semibold text-gray-800">Hiring Workflow</p>
                        <p className="text-xs text-gray-500">
                          Requests, approvals, and onboarding notifications.
                        </p>
                      </div>
                    </div>
                    <div
                      onClick={() => toggle(notifyHiring, setNotifyHiring)}
                      className={pillClass(notifyHiring)}
                      role="switch"
                      aria-checked={notifyHiring}
                    >
                      <div className={knobClass(notifyHiring)} />
                    </div>
                  </div>
                </div>

                {/* Email Digest */}
                <div className="mt-2">
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    Email Digest Frequency
                  </p>
                  <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                    {(['none', 'daily', 'weekly'] as const).map((opt) => (
                      <button
                        key={opt}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          emailDigest === opt
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setEmailDigest(opt)}
                      >
                        {opt === 'none' ? 'No Digest' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Digest includes a summary of attendance, assignments, Q&A, and
                    events.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* Academic Alert Thresholds */}
        {/* ------------------------------------------------------------------ */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-red-600" />
              Academic Alert Thresholds
            </CardTitle>
            <CardDescription>
              When the system flags courses and students as at-risk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {settingsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading thresholds…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Attendance threshold */}
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                      <p className="font-semibold text-gray-800 text-sm">
                        Attendance Risk Threshold
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Students below this percentage are flagged as low attendance.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={attendanceThreshold}
                        onChange={(e) =>
                          setAttendanceThreshold(
                            Math.min(100, Math.max(0, Number(e.target.value) || 0))
                          )
                        }
                        className="w-20"
                      />
                      <span className="text-xs text-gray-600">%</span>
                    </div>
                    {(attendanceThreshold < 50 || attendanceThreshold > 95) && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3" /> Unusual value — double-check
                      </p>
                    )}
                  </div>

                  {/* Q&A threshold */}
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-indigo-600" />
                      <p className="font-semibold text-gray-800 text-sm">
                        Q&A Overdue Threshold
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Questions older than this many hours are marked as overdue.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={qnaThreshold}
                        onChange={(e) =>
                          setQnaThreshold(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-20"
                      />
                      <span className="text-xs text-gray-600">hours</span>
                    </div>
                  </div>

                  {/* Low engagement threshold */}
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <p className="font-semibold text-gray-800 text-sm">
                        Low Engagement Threshold
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Below this assignment completion % marks a course as low
                      engagement.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={lowEngagementThreshold}
                        onChange={(e) =>
                          setLowEngagementThreshold(
                            Math.min(100, Math.max(0, Number(e.target.value) || 0))
                          )
                        }
                        className="w-20"
                      />
                      <span className="text-xs text-gray-600">%</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  These thresholds control when dashboards highlight "Risk / Attention
                  Required" items for HoD and HR views.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* Security (Informational) */}
        {/* ------------------------------------------------------------------ */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Access & Security (Informational)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInfoOpen(true)}
              >
                <Info className="mr-1 h-4 w-4" />
                Details
              </Button>
            </CardTitle>
            <CardDescription>
              Department role capabilities in this portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 mb-2">
              Department role can view academic analytics, staff workload, and
              hiring requests for this department, but cannot manage global user
              accounts or institution-wide settings.
            </p>
            <p className="text-xs text-gray-500">
              For system-level configuration and user provisioning, contact the
              central Admin or IT support team.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}