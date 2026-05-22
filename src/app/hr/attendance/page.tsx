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
  ClipboardCheck,
  Users,
  User,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  RefreshCw,
  Loader2,
  X,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/auth';

// ─── Types ───────────────────────────────────────────────────────────────────
// Statuses stored in DB — mix of capitalised ("Present") and snake_case ("on_leave")
// We normalise everything to lowercase snake_case internally.
type AttendanceStatus = 'present' | 'absent' | 'on_leave' | 'half_day' | 'late';
type ShiftType = 'morning' | 'evening' | 'full_day';

interface RawAttendanceRow {
  id: string;
  user_id: string;
  // The *real* date column on staff_attendance is `date` (type: date).
  // `attendance_date` is a separate timestamp column that may be null.
  date: string;
  attendance_date: string | null;
  status: string;          // stored as "Present" / "Absent" / "on_leave" etc.
  shift: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  notes: string | null;
  created_at: string;
  users: {
    id: string;
    full_name: string;
    employee_id: string | null;
    department_id: string | null;
    departments: { name: string } | null;
  } | null;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  status: AttendanceStatus;
  shift: ShiftType;
  checkIn?: string;
  checkOut?: string;
  totalHours?: number;
  notes?: string;
}

interface SummaryStats {
  total: number;
  present: number;
  absent: number;
  onLeave: number;
  halfDay: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise any casing/format the DB might return */
function normaliseStatus(raw: string): AttendanceStatus {
  const lower = raw.toLowerCase().replace(/ /g, '_');
  const map: Record<string, AttendanceStatus> = {
    present: 'present',
    absent: 'absent',
    on_leave: 'on_leave',
    leave: 'on_leave',
    half_day: 'half_day',
    halfday: 'half_day',
    late: 'late',
  };
  return map[lower] ?? 'present';
}

function normaliseShift(raw: string): ShiftType {
  const lower = raw.toLowerCase().replace(/ /g, '_');
  if (lower.includes('evening')) return 'evening';
  if (lower.includes('morning')) return 'morning';
  return 'full_day';
}

function normalise(raw: RawAttendanceRow): AttendanceRecord {
  return {
    id: raw.id,
    userId: raw.user_id,
    // Use `date` (the real date column); fall back to attendance_date
    date: raw.date ?? raw.attendance_date?.split('T')[0] ?? '',
    employeeId: raw.users?.employee_id ?? raw.user_id.slice(0, 8).toUpperCase(),
    employeeName: raw.users?.full_name ?? 'Unknown',
    department: raw.users?.departments?.name ?? 'N/A',
    status: normaliseStatus(raw.status),
    shift: normaliseShift(raw.shift),
    checkIn: raw.check_in ?? undefined,
    checkOut: raw.check_out ?? undefined,
    totalHours: raw.total_hours ?? undefined,
    notes: raw.notes ?? undefined,
  };
}

const DISPLAY_STATUS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  on_leave: 'On Leave',
  half_day: 'Half Day',
  late: 'Late',
};

const DISPLAY_SHIFT: Record<ShiftType, string> = {
  morning: 'Morning',
  evening: 'Evening',
  full_day: 'Full Day',
};

function statusBadge(status: AttendanceStatus): string {
  switch (status) {
    case 'present':  return 'bg-green-50 text-green-700 border border-green-200';
    case 'absent':   return 'bg-red-50 text-red-700 border border-red-200';
    case 'on_leave': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    case 'half_day': return 'bg-purple-50 text-purple-700 border border-purple-200';
    case 'late':     return 'bg-orange-50 text-orange-700 border border-orange-200';
    default:         return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─── History Modal ────────────────────────────────────────────────────────────

interface HistoryModalProps {
  userId: string;
  employeeName: string;
  employeeId: string;
  onClose: () => void;
}

function HistoryModal({ userId, employeeName, employeeId, onClose }: HistoryModalProps) {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('staff_attendance')
          .select(`
            id, user_id, date, attendance_date, status, shift,
            check_in, check_out, total_hours, notes, created_at,
            users (
              id, full_name, employee_id, department_id,
              departments!users_department_id_fkey ( name )
            )
          `)
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(60);

        if (err) throw err;
        setHistory((data as unknown as RawAttendanceRow[]).map(normalise));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Aggregate summary
  const counts = history.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="h-5 w-5 text-indigo-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{employeeName}</p>
              <p className="text-xs text-gray-500">{employeeId} · Last 60 records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Summary pills */}
        {!loading && history.length > 0 && (
          <div className="flex flex-wrap gap-2 px-6 pt-4">
            {Object.entries(counts).map(([status, count]) => (
              <span
                key={status}
                className={`text-xs px-3 py-1 rounded-full font-medium ${statusBadge(status as AttendanceStatus)}`}
              >
                {DISPLAY_STATUS[status as AttendanceStatus] ?? status}: {count}
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No attendance history found.</p>
            </div>
          )}

          {!loading && history.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusBadge(r.status)}`}
                >
                  {DISPLAY_STATUS[r.status]}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{formatDate(r.date)}</p>
                  <p className="text-xs text-gray-400">
                    {DISPLAY_SHIFT[r.shift]}
                    {r.checkIn && ` · In: ${r.checkIn}`}
                    {r.checkOut && ` · Out: ${r.checkOut}`}
                  </p>
                </div>
              </div>
              {typeof r.totalHours === 'number' && (
                <span className="text-xs font-semibold text-gray-600">
                  {r.totalHours.toFixed(1)}h
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HRAttendanceRecordPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    total: 0, present: 0, absent: 0, onLeave: 0, halfDay: 0,
  });
  const [departments, setDepartments] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | AttendanceStatus>('all');
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // History modal state
  const [historyTarget, setHistoryTarget] = useState<{
    userId: string;
    employeeName: string;
    employeeId: string;
  } | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      /*
       * FIX: filter on `date` (the actual date column), NOT `attendance_date`
       * (which is a separate timestamp column that's typically null).
       */
      let query = supabase
        .from('staff_attendance')
        .select(`
          id,
          user_id,
          date,
          attendance_date,
          status,
          shift,
          check_in,
          check_out,
          total_hours,
          notes,
          created_at,
          users (
            id,
            full_name,
            employee_id,
            department_id,
            departments!users_department_id_fkey (
              name
            )
          )
        `)
        .eq('date', selectedDate)           // ← FIXED: was .eq('attendance_date', ...)
        .order('created_at', { ascending: false });

      // Server-side status filter — DB stores "Present" so we match both cases
      if (selectedStatus !== 'all') {
        // The DB might store capitalised ("Present") — use ilike for safety
        query = query.ilike('status', selectedStatus.replace('_', ' '));
      }

      const { data, error: supaErr } = await query;
      if (supaErr) throw supaErr;

      const normalised = (data as unknown as RawAttendanceRow[]).map(normalise);
      setRecords(normalised);

      setStats({
        total:   normalised.length,
        present: normalised.filter((r) => r.status === 'present').length,
        absent:  normalised.filter((r) => r.status === 'absent').length,
        onLeave: normalised.filter((r) => r.status === 'on_leave').length,
        halfDay: normalised.filter((r) => r.status === 'half_day').length,
      });

      const depts = Array.from(
        new Set(normalised.map((r) => r.department).filter((d) => d && d !== 'N/A'))
      ).sort();
      setDepartments(depts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedStatus]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // ── Client-side filter ────────────────────────────────────────────────────
  const filteredRecords = records.filter((r) => {
    const matchesDept = selectedDept === 'all' || r.department === selectedDept;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.employeeName.toLowerCase().includes(q) ||
      r.employeeId.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q);
    return matchesDept && matchesSearch;
  });

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = [
      'Record ID','Employee ID','Name','Department',
      'Date','Status','Shift','Check In','Check Out','Total Hours',
    ];
    const rows = filteredRecords.map((r) => [
      r.id, r.employeeId, r.employeeName, r.department,
      r.date, DISPLAY_STATUS[r.status], DISPLAY_SHIFT[r.shift],
      r.checkIn ?? '', r.checkOut ?? '', r.totalHours?.toFixed(1) ?? '',
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Summary cards ─────────────────────────────────────────────────────────
  const summaryCards = [
    { label: 'Total Records',      value: stats.total,   icon: Users,        colorClass: 'bg-blue-100 text-blue-600',   trend: 'up'   },
    { label: 'Present',            value: stats.present, icon: CheckCircle,  colorClass: 'bg-green-100 text-green-600', trend: 'up'   },
    { label: 'Absent',             value: stats.absent,  icon: AlertCircle,  colorClass: 'bg-red-100 text-red-600',     trend: 'down' },
    { label: 'On Leave / Half Day',value: `${stats.onLeave} / ${stats.halfDay}`, icon: Clock, colorClass: 'bg-orange-100 text-orange-600', trend: 'down' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* History Modal */}
      {historyTarget && (
        <HistoryModal
          userId={historyTarget.userId}
          employeeName={historyTarget.employeeName}
          employeeId={historyTarget.employeeId}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 transition-all duration-500 ease-out 
                       hover:scale-105 hover:shadow-2xl border-1  rounded-xl p-6 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl text-white font-bold mb-1">Attendance Records</h1>
              <p className="text-indigo-100">Daily attendance status for faculty and staff</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                
                onClick={fetchAttendance}
                disabled={loading}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                {loading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button
                onClick={exportCSV}
                disabled={filteredRecords.length === 0}
                className="bg-white text-indigo-700 hover:bg-indigo-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button onClick={fetchAttendance} className="ml-auto underline text-red-600 hover:text-red-800 text-xs">
              Retry
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="transition-all duration-500 ease-out 
                          hover:scale-105 hover:shadow-2xl border-1  rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${stat.colorClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    {stat.trend === 'up'
                      ? <TrendingUp className="h-4 w-4 text-green-500" />
                      : <TrendingDown className="h-4 w-4 text-red-500" />}
                  </div>
                  {loading
                    ? <div className="h-7 w-12 bg-gray-200 animate-pulse rounded mb-1" />
                    : <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>}
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card className="transition-all duration-500 ease-out 
          hover:scale-105 hover:shadow-2xl border-1  rounded-xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Filters</span>
              </div>
              <div className="flex flex-wrap gap-3 sm:ml-auto">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as 'all' | AttendanceStatus)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="on_leave">On Leave</option>
                  <option value="half_day">Half Day</option>
                  <option value="late">Late</option>
                </select>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, ID, department, or record ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Attendance list */}
        <Card className="border-1 shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Daily Attendance
              {!loading && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              One row per employee — click &quot;View History&quot; to see past 60 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && filteredRecords.length === 0 && !error && (
              <div className="text-center py-14">
                <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">No records found</p>
                <p className="text-gray-400 text-xs mt-1">
                  Try changing the date, department, or search query.
                </p>
              </div>
            )}

            {/* Records */}
            {!loading && filteredRecords.length > 0 && (
              <div className="space-y-3">
                {filteredRecords.map((r) => (
                  <div
                    key={r.id}
                    className=" border-gray-200 transition-all duration-500 ease-out 
                                hover:scale-105 hover:shadow-2xl border-1  rounded-lg p-6 "
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      {/* Identity */}
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-indigo-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {r.employeeName}
                            </p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200 shrink-0">
                              {r.employeeId}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusBadge(r.status)}`}>
                              {DISPLAY_STATUS[r.status]}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{r.department}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(r.date)} · Shift: {DISPLAY_SHIFT[r.shift]}
                          </p>
                        </div>
                      </div>

                      {/* Time details */}
                      <div className="flex flex-col items-start lg:items-end gap-1 text-xs text-gray-600 shrink-0">
                        {r.checkIn ? (
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            In: <span className="font-mono">{r.checkIn}</span>
                          </p>
                        ) : (
                          <p className="text-gray-300 text-xs">No check-in recorded</p>
                        )}
                        {r.checkOut ? (
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Out: <span className="font-mono">{r.checkOut}</span>
                          </p>
                        ) : (
                          <p className="text-gray-300 text-xs">No check-out recorded</p>
                        )}
                        {typeof r.totalHours === 'number' ? (
                          <p>Hours: <span className="font-semibold">{r.totalHours.toFixed(1)}</span></p>
                        ) : (
                          <p className="text-gray-300 text-xs">Hours not tracked</p>
                        )}
                        <p className="flex items-center gap-1 text-gray-400">
                          <Building2 className="h-3 w-3" />
                          <span className="font-mono">{r.id.slice(0, 8)}…</span>
                        </p>
                        {/* ── View History button — now functional ── */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1"
                          onClick={() =>
                            setHistoryTarget({
                              userId: r.userId,
                              employeeName: r.employeeName,
                              employeeId: r.employeeId,
                            })
                          }
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View History
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}