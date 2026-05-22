/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Save,
  ArrowLeft,
  Globe,
  Users,
  Megaphone,
  AlertCircle,
  Shield,
  Mail,
  Smartphone,
  Clock,
  RefreshCw,
  ClipboardList,
  BookOpen,
  DollarSign,
  CalendarCheck
} from 'lucide-react';

// ✅ Import the shared client — do NOT create a new one
import { supabase } from '@/lib/supabase/client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface NotificationSettings {
  assignment_notifications: boolean;
  quiz_notifications: boolean;
  attendance_notifications: boolean;
  fee_notifications: boolean;
  grade_notifications: boolean;
  announcement_notifications: boolean;
  system_alerts: boolean;
  user_registrations: boolean;
  user_activity: boolean;
  error_reports: boolean;
  department_updates: boolean;
  staff_changes: boolean;
  budget_alerts: boolean;
  course_approvals: boolean;
  grade_publishing: boolean;
  attendance_reports: boolean;
  announcements: boolean;
  feedback_submissions: boolean;
  support_tickets: boolean;
  login_alerts: boolean;
  permission_changes: boolean;
  data_exports: boolean;
}

interface NotificationChannel {
  email: boolean;
  in_app: boolean;
  push: boolean;
  sms: boolean;
}

interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  assignment_notifications: true,
  quiz_notifications: true,
  attendance_notifications: true,
  fee_notifications: true,
  grade_notifications: true,
  announcement_notifications: true,
  system_alerts: true,
  user_registrations: true,
  user_activity: false,
  error_reports: true,
  department_updates: true,
  staff_changes: true,
  budget_alerts: true,
  course_approvals: true,
  grade_publishing: false,
  attendance_reports: true,
  announcements: true,
  feedback_submissions: true,
  support_tickets: true,
  login_alerts: true,
  permission_changes: true,
  data_exports: true,
};

const DEFAULT_CHANNELS: NotificationChannel = {
  email: true,
  in_app: true,
  push: false,
  sms: false,
};

const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  start: '22:00',
  end: '07:00',
  timezone: 'UTC',
};

export default function AdminNotificationSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [channels, setChannels] = useState<NotificationChannel>(DEFAULT_CHANNELS);
  const [quietHours, setQuietHours] = useState<QuietHours>(DEFAULT_QUIET_HOURS);
  const [digestFrequency, setDigestFrequency] = useState('daily');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // ✅ Use getSession() — reads from localStorage via the shared client
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setLoading(false);
          return;
        }

        if (!session?.user) {
          // ✅ Fallback: try refreshing the session from localStorage token
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError || !refreshData.session?.user) {
            console.warn('No session after refresh attempt:', refreshError);
            setLoading(false);
            return;
          }

          setUserId(refreshData.session.user.id);
          await loadUserSettings(refreshData.session.user.id);
          return;
        }

        setUserId(session.user.id);
        await loadUserSettings(session.user.id);

      } catch (err) {
        console.error('Auth error:', err);
        setLoading(false);
      }
    };

    const loadUserSettings = async (uid: string) => {
      try {
        const { data, error } = await supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', uid)
          .single();

        // PGRST116 = no row yet, use defaults — that's fine
        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setSettings({
            assignment_notifications: data.assignment_notifications ?? true,
            quiz_notifications: data.quiz_notifications ?? true,
            attendance_notifications: data.attendance_notifications ?? true,
            fee_notifications: data.fee_notifications ?? true,
            grade_notifications: data.grade_notifications ?? true,
            announcement_notifications: data.announcement_notifications ?? true,
            system_alerts: data.system_alerts ?? true,
            user_registrations: data.user_registrations ?? true,
            user_activity: data.user_activity ?? false,
            error_reports: data.error_reports ?? true,
            department_updates: data.department_updates ?? true,
            staff_changes: data.staff_changes ?? true,
            budget_alerts: data.budget_alerts ?? true,
            course_approvals: data.course_approvals ?? true,
            grade_publishing: data.grade_publishing ?? false,
            attendance_reports: data.attendance_reports ?? true,
            announcements: data.announcements ?? true,
            feedback_submissions: data.feedback_submissions ?? true,
            support_tickets: data.support_tickets ?? true,
            login_alerts: data.login_alerts ?? true,
            permission_changes: data.permission_changes ?? true,
            data_exports: data.data_exports ?? true,
          });

          setChannels({
            email: data.email_notifications ?? true,
            in_app: data.in_app_notifications ?? true,
            push: data.push_notifications ?? false,
            sms: data.sms_notifications ?? false,
          });

          setQuietHours({
            enabled: data.quiet_hours_enabled ?? false,
            start: data.quiet_hours_start ?? '22:00',
            end: data.quiet_hours_end ?? '07:00',
            timezone: data.quiet_hours_timezone ?? 'UTC',
          });

          if (data.digest_frequency) {
            setDigestFrequency(data.digest_frequency);
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        toast({
          title: 'Error',
          description: 'Failed to load notification settings',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: userId,
          assignment_notifications: settings.assignment_notifications,
          quiz_notifications: settings.quiz_notifications,
          attendance_notifications: settings.attendance_notifications,
          fee_notifications: settings.fee_notifications,
          grade_notifications: settings.grade_notifications,
          announcement_notifications: settings.announcement_notifications,
          system_alerts: settings.system_alerts,
          user_registrations: settings.user_registrations,
          user_activity: settings.user_activity,
          error_reports: settings.error_reports,
          department_updates: settings.department_updates,
          staff_changes: settings.staff_changes,
          budget_alerts: settings.budget_alerts,
          course_approvals: settings.course_approvals,
          grade_publishing: settings.grade_publishing,
          attendance_reports: settings.attendance_reports,
          announcements: settings.announcements,
          feedback_submissions: settings.feedback_submissions,
          support_tickets: settings.support_tickets,
          login_alerts: settings.login_alerts,
          permission_changes: settings.permission_changes,
          data_exports: settings.data_exports,
          email_notifications: channels.email,
          in_app_notifications: channels.in_app,
          push_notifications: channels.push,
          sms_notifications: channels.sms,
          quiet_hours_enabled: quietHours.enabled,
          quiet_hours_start: quietHours.start,
          quiet_hours_end: quietHours.end,
          quiet_hours_timezone: quietHours.timezone,
          digest_frequency: digestFrequency,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setHasChanges(false);
      toast({
        title: 'Success',
        description: 'Notification settings saved successfully',
        className: 'bg-white border-green-200',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setChannels(DEFAULT_CHANNELS);
    setQuietHours(DEFAULT_QUIET_HOURS);
    setDigestFrequency('daily');
    setHasChanges(true);
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleChannelChange = (key: keyof NotificationChannel, value: boolean) => {
    setChannels(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <p className="text-gray-600">Session could not be loaded. Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl bg-white min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/notifications">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900 mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Notifications
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure how and when you receive notifications as an administrator
        </p>
      </div>

      {/* Admin Privileges Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Admin Notification Privileges</h3>
              <p className="text-sm text-blue-700 mt-1">
                As an administrator, you have access to all system-wide notifications. You can
                receive real-time system alerts, monitor user registrations, get notified about
                department changes, review course approvals, and access security alerts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="academic" className="space-y-6">
        <TabsList className="bg-gray-100 border border-gray-200 flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="academic" className="data-[state=active]:bg-white">
            <BookOpen className="h-4 w-4 mr-2" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-white">
            <AlertCircle className="h-4 w-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="channels" className="data-[state=active]:bg-white">
            <Globe className="h-4 w-4 mr-2" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="quiet-hours" className="data-[state=active]:bg-white">
            <Clock className="h-4 w-4 mr-2" />
            Quiet Hours
          </TabsTrigger>
          <TabsTrigger value="digest" className="data-[state=active]:bg-white">
            <Mail className="h-4 w-4 mr-2" />
            Email Digest
          </TabsTrigger>
        </TabsList>

        {/* ── Academic Tab ── */}
        <TabsContent value="academic">
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg">Academic Notifications</CardTitle>
              <CardDescription>Alerts related to student academic activities</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-500" />
                  Core Academic
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'assignment_notifications' as const, label: 'Assignment Notifications', desc: 'Alerts for new and due assignments' },
                    { key: 'quiz_notifications' as const, label: 'Quiz Notifications', desc: 'Alerts for upcoming and graded quizzes' },
                    { key: 'grade_notifications' as const, label: 'Grade Notifications', desc: 'When grades are published or updated' },
                    { key: 'grade_publishing' as const, label: 'Grade Publishing Requests', desc: 'New grade publishing pending approval' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={item.key} className="text-sm font-medium">{item.label}</Label>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <Switch id={item.key} checked={settings[item.key]} onCheckedChange={(v) => handleSettingChange(item.key, v)} />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-green-500" />
                  Attendance & Fees
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'attendance_notifications' as const, label: 'Attendance Notifications', desc: 'Student attendance alerts' },
                    { key: 'attendance_reports' as const, label: 'Attendance Reports', desc: 'Daily attendance summaries' },
                    { key: 'fee_notifications' as const, label: 'Fee Notifications', desc: 'Payment due dates and confirmations' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={item.key} className="text-sm font-medium">{item.label}</Label>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <Switch id={item.key} checked={settings[item.key]} onCheckedChange={(v) => handleSettingChange(item.key, v)} />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-purple-500" />
                  Department & Courses
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'department_updates' as const, label: 'Department Updates', desc: 'Changes in department structure' },
                    { key: 'staff_changes' as const, label: 'Staff Changes', desc: 'New hires, resignations, role changes' },
                    { key: 'budget_alerts' as const, label: 'Budget Alerts', desc: 'Budget approvals and overruns' },
                    { key: 'course_approvals' as const, label: 'Course Approvals', desc: 'New courses pending approval' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={item.key} className="text-sm font-medium">{item.label}</Label>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <Switch id={item.key} checked={settings[item.key]} onCheckedChange={(v) => handleSettingChange(item.key, v)} />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-500" />
                  Communication
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'announcement_notifications' as const, label: 'Announcement Notifications', desc: 'System-wide and department announcements' },
                    { key: 'announcements' as const, label: 'Announcements (Admin)', desc: 'When you create announcements' },
                    { key: 'feedback_submissions' as const, label: 'Feedback Submissions', desc: 'User feedback and suggestions' },
                    { key: 'support_tickets' as const, label: 'Support Tickets', desc: 'New support requests' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={item.key} className="text-sm font-medium">{item.label}</Label>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <Switch id={item.key} checked={settings[item.key]} onCheckedChange={(v) => handleSettingChange(item.key, v)} />
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* ── System Tab ── */}
        <TabsContent value="system">
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg">System Notifications</CardTitle>
              <CardDescription>Control system-wide and security event notifications</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  System Health
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'system_alerts' as const, label: 'System Alerts', desc: 'Critical system errors and warnings' },
                    { key: 'error_reports' as const, label: 'Error Reports', desc: 'Application errors and exceptions' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={item.key} className="text-sm font-medium">{item.label}</Label>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <Switch id={item.key} checked={settings[item.key]} onCheckedChange={(v) => handleSettingChange(item.key, v)} />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  User Management
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'user_registrations' as const, label: 'New Registrations', desc: 'When new users register' },
                    { key: 'user_activity' as const, label: 'User Activity', desc: 'Suspicious or unusual activity' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={item.key} className="text-sm font-medium">{item.label}</Label>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <Switch id={item.key} checked={settings[item.key]} onCheckedChange={(v) => handleSettingChange(item.key, v)} />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-orange-500" />
                  Security
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'login_alerts' as const, label: 'Login Alerts', desc: 'Suspicious login attempts' },
                    { key: 'permission_changes' as const, label: 'Permission Changes', desc: 'When user roles are modified' },
                    { key: 'data_exports' as const, label: 'Data Exports', desc: 'When data is exported from the system' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={item.key} className="text-sm font-medium">{item.label}</Label>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <Switch id={item.key} checked={settings[item.key]} onCheckedChange={(v) => handleSettingChange(item.key, v)} />
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Channels Tab ── */}
        <TabsContent value="channels">
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg">Delivery Channels</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {[
                { key: 'in_app' as const, label: 'In-App Notifications', desc: 'Notifications within the application', icon: <Bell className="h-4 w-4 text-blue-600" />, bg: 'bg-blue-100' },
                { key: 'email' as const, label: 'Email Notifications', desc: 'Receive notifications via email', icon: <Mail className="h-4 w-4 text-green-600" />, bg: 'bg-green-100' },
                { key: 'push' as const, label: 'Push Notifications', desc: 'Mobile push notifications', icon: <Smartphone className="h-4 w-4 text-purple-600" />, bg: 'bg-purple-100' },
                { key: 'sms' as const, label: 'SMS Notifications', desc: 'Text message alerts (critical only)', icon: <DollarSign className="h-4 w-4 text-yellow-600" />, bg: 'bg-yellow-100' },
              ].map((item, index, arr) => (
                <div key={item.key}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${item.bg} rounded-full`}>{item.icon}</div>
                      <div>
                        <Label htmlFor={`channel_${item.key}`} className="text-sm font-medium">{item.label}</Label>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                    <Switch
                      id={`channel_${item.key}`}
                      checked={channels[item.key]}
                      onCheckedChange={(v) => handleChannelChange(item.key, v)}
                    />
                  </div>
                  {index < arr.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Quiet Hours Tab ── */}
        <TabsContent value="quiet-hours">
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg">Quiet Hours</CardTitle>
              <CardDescription>Set hours when you don&apos;t want to be disturbed</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="quiet_hours_enabled" className="text-sm font-medium">Enable Quiet Hours</Label>
                  <p className="text-xs text-gray-500">Mute notifications during specified hours</p>
                </div>
                <Switch
                  id="quiet_hours_enabled"
                  checked={quietHours.enabled}
                  onCheckedChange={(v) => { setQuietHours(prev => ({ ...prev, enabled: v })); setHasChanges(true); }}
                />
              </div>

              {quietHours.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quiet_start" className="text-sm font-medium">Start Time</Label>
                      <Input
                        type="time"
                        id="quiet_start"
                        value={quietHours.start}
                        onChange={(e) => { setQuietHours(prev => ({ ...prev, start: e.target.value })); setHasChanges(true); }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quiet_end" className="text-sm font-medium">End Time</Label>
                      <Input
                        type="time"
                        id="quiet_end"
                        value={quietHours.end}
                        onChange={(e) => { setQuietHours(prev => ({ ...prev, end: e.target.value })); setHasChanges(true); }}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="timezone" className="text-sm font-medium">Timezone</Label>
                    <Select
                      value={quietHours.timezone}
                      onValueChange={(v) => { setQuietHours(prev => ({ ...prev, timezone: v })); setHasChanges(true); }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Asia/Karachi">Pakistan (PKT)</SelectItem>
                        <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                        <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email Digest Tab ── */}
        <TabsContent value="digest">
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg">Email Digest</CardTitle>
              <CardDescription>Configure how often you receive email summaries</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="digest_frequency" className="text-sm font-medium">Digest Frequency</Label>
                <Select
                  value={digestFrequency}
                  onValueChange={(v) => { setDigestFrequency(v); setHasChanges(true); }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time (as they happen)</SelectItem>
                    <SelectItem value="hourly">Hourly Digest</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Digest</SelectItem>
                    <SelectItem value="never">Never (no email)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Choose how often you want to receive email notifications</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Digest Preview</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {digestFrequency === 'realtime' && 'You will receive emails immediately for each notification.'}
                      {digestFrequency === 'hourly' && 'You will receive a summary every hour of notifications you missed.'}
                      {digestFrequency === 'daily' && "You will receive a daily summary at 8:00 AM of the previous day's notifications."}
                      {digestFrequency === 'weekly' && "You will receive a weekly summary every Monday of the previous week's notifications."}
                      {digestFrequency === 'never' && 'You will not receive any email notifications.'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saving}
          className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Reset to Default
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

    </div>
  );
}