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
  BusFront,
  Users,
  User,
  AlertCircle,
  CheckCircle,
  Filter,
  Search,
  Calendar,
  Clock,
  Bell,
  RefreshCw,
  ChevronDown,
  Loader2,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/auth';


// ─── Types ────────────────────────────────────────────────────
type TripShift = 'Morning Pickup' | 'Afternoon Drop' | 'Evening';
type TripStatus = 'On Time' | 'Delayed' | 'Cancelled' | 'Completed';

interface BusRoute {
  id: string;
  name: string;
  code: string;
  vehicle_no: string;
  capacity: number;
  shift: TripShift;
  departure_time: string;
  arrival_time: string;
  bus_drivers: { name: string; contact: string }[];
  assignedStudents: number;
  boarded: number;
  absent: number;
  status: TripStatus;
}

interface SummaryStats {
  totalAssigned: number;
  totalBoarded: number;
  totalAbsent: number;
  delayedCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

function fmt(t: string | null) {
  if (!t) return '—';
  return t.slice(0, 5); // "HH:MM"
}

function statusBadge(s: TripStatus) {
  switch (s) {
    case 'On Time':   return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'Delayed':   return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'Cancelled': return 'bg-red-50 text-red-700 border border-red-200';
    case 'Completed': return 'bg-blue-50 text-blue-700 border border-blue-200';
    default:          return 'bg-gray-50 text-gray-600 border border-gray-200';
  }
}

// ─── Main Component ───────────────────────────────────────────
export default function BusManagementPage() {
  const [routes, setRoutes]           = useState<BusRoute[]>([]);
  const [stats, setStats]             = useState<SummaryStats>({ totalAssigned: 0, totalBoarded: 0, totalAbsent: 0, delayedCount: 0 });
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [shiftFilter, setShiftFilter] = useState<'all' | TripShift>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TripStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingAlert, setSendingAlert] = useState<string | null>(null);
  const [exporting, setExporting]       = useState(false);

  // ── Fetch data ────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch all routes with their drivers
      const { data: routeData, error: routeErr } = await supabase
        .from('bus_routes')
        .select(`
          id, name, code, vehicle_no, capacity, shift, departure_time, arrival_time,
          bus_drivers ( name, contact )
        `)
        .order('code');

      if (routeErr) throw routeErr;

      // 2. Fetch today's trip statuses
      const { data: statusData, error: statusErr } = await supabase
        .from('bus_trip_status')
        .select('route_id, status')
        .eq('trip_date', today);

      if (statusErr) throw statusErr;

      const statusMap: Record<string, TripStatus> = {};
      (statusData ?? []).forEach((s) => { statusMap[s.route_id] = s.status as TripStatus; });

      // 3. Fetch today's student assignments counts per route
      const { data: assignData, error: assignErr } = await supabase
        .from('bus_student_assignments')
        .select('route_id')
        .eq('assigned_date', today);

      if (assignErr) throw assignErr;

      const assignMap: Record<string, number> = {};
      (assignData ?? []).forEach((a) => {
        assignMap[a.route_id] = (assignMap[a.route_id] ?? 0) + 1;
      });

      // 4. Fetch today's bus attendance
      const { data: attData, error: attErr } = await supabase
        .from('bus_attendance')
        .select('route_id, status')
        .eq('attendance_date', today);

      if (attErr) throw attErr;

      const boardedMap: Record<string, number> = {};
      const absentMap:  Record<string, number> = {};
      (attData ?? []).forEach((a) => {
        if (a.status === 'boarded') boardedMap[a.route_id] = (boardedMap[a.route_id] ?? 0) + 1;
        if (a.status === 'absent')  absentMap[a.route_id]  = (absentMap[a.route_id]  ?? 0) + 1;
      });

      // 5. Combine
      const enriched: BusRoute[] = (routeData ?? []).map((r: any) => ({
        ...r,
        bus_drivers: Array.isArray(r.bus_drivers) ? r.bus_drivers : r.bus_drivers ? [r.bus_drivers] : [],
        assignedStudents: assignMap[r.id] ?? 0,
        boarded:          boardedMap[r.id] ?? 0,
        absent:           absentMap[r.id]  ?? 0,
        status:           statusMap[r.id]  ?? 'On Time',
      }));

      setRoutes(enriched);
      setStats({
        totalAssigned: Object.values(assignMap).reduce((a, b) => a + b, 0),
        totalBoarded:  Object.values(boardedMap).reduce((a, b) => a + b, 0),
        totalAbsent:   Object.values(absentMap).reduce((a, b) => a + b, 0),
        delayedCount:  Object.values(statusMap).filter((s) => s === 'Delayed').length,
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? 'Failed to load bus data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Send delay alert via notifications table ──────────────
  const sendDelayAlert = async (route: BusRoute) => {
    setSendingAlert(route.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      // Get all students assigned to this route today
      const { data: students } = await supabase
        .from('bus_student_assignments')
        .select('student_id')
        .eq('route_id', route.id)
        .eq('assigned_date', today);

      if (!students?.length) return;

      // Insert a notification for each student
      const notifications = students.map((s) => ({
        user_id: s.student_id,
        title: `Bus Delay – ${route.name}`,
        message: `Route ${route.code} (${route.vehicle_no}) is delayed. Expected arrival: ${fmt(route.arrival_time)}.`,
        type: 'bus_delay',
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;

      alert(`Delay alert sent to ${students.length} student(s) on ${route.name}.`);
    } catch (e: any) {
      alert(`Failed to send alert: ${e.message}`);
    } finally {
      setSendingAlert(null);
    }
  };

  // ── Filtered routes ───────────────────────────────────────
  const filtered = routes.filter((r) => {
    const matchShift  = shiftFilter === 'all' || r.shift === shiftFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || r.name.toLowerCase().includes(q)
      || r.code.toLowerCase().includes(q)
      || r.vehicle_no.toLowerCase().includes(q)
      || r.bus_drivers.some((d) => d.name.toLowerCase().includes(q));
    return matchShift && matchStatus && matchSearch;
  });

  // ── Summary cards config ──────────────────────────────────
  const summaryCards = [
    { label: 'Assigned today',      value: stats.totalAssigned, icon: Users,        color: 'blue',   note: 'Students mapped to any route' },
    { label: 'Boarded',             value: stats.totalBoarded,  icon: CheckCircle,  color: 'green',  note: 'Marked present on buses' },
    { label: 'Absent / Not boarded',value: stats.totalAbsent,   icon: AlertCircle,  color: 'red',    note: 'Can trigger parent alerts' },
    { label: 'Delayed routes',      value: stats.delayedCount,  icon: Bell,         color: 'orange', note: 'Send notifications if needed' },
  ];

  // ── Export attendance as CSV ──────────────────────────────
  const exportAttendance = async () => {
    setExporting(true);
    try {
      // Fetch full attendance rows joined with student name and route info
      const { data, error } = await supabase
        .from('bus_attendance')
        .select(`
          attendance_date,
          status,
          users!bus_attendance_student_id_fkey ( full_name, email ),
          bus_routes ( name, code, vehicle_no, shift )
        `)
        .eq('attendance_date', today)
        .order('attendance_date');

      if (error) throw error;
      if (!data?.length) {
        alert('No attendance records found for today.');
        return;
      }

      // Build CSV rows
      const headers = [
        'Date',
        'Student Name',
        'Email',
        'Route',
        'Route Code',
        'Vehicle No',
        'Shift',
        'Status',
      ];

      const rows = data.map((row: any) => {
        const u = row.users ?? {};
        const r = row.bus_routes ?? {};
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
        return [
          row.attendance_date,
          name,
          u.email ?? '—',
          r.name ?? '—',
          r.code ?? '—',
          r.vehicle_no ?? '—',
          r.shift ?? '—',
          row.status,
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');

      // Trigger browser download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `bus-attendance-${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-amber-600">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm font-medium">Loading bus data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <p className="text-red-600 font-medium">{error}</p>
          <Button onClick={fetchData} variant="outline" size="sm">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl text-white font-bold mb-1">Bus Management</h1>
            <p className="text-amber-100 text-sm">
              Live route data, attendance, and alerts for {today}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={fetchData}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              className="bg-white text-amber-700 hover:bg-amber-50"
              size="sm"
              onClick={exportAttendance}
              disabled={exporting}
            >
              {exporting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Download className="mr-2 h-4 w-4" />}
              {exporting ? 'Exporting…' : 'Export Attendance'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Date card */}
        <Card className="border-0 shadow-md col-span-2 lg:col-span-1">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Calendar className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium uppercase tracking-wide">Date</span>
            </div>
            <p className="text-base font-bold text-gray-800">{today}</p>
            <p className="text-xs text-gray-400 mt-0.5">{routes.length} route{routes.length !== 1 ? 's' : ''} active</p>
          </CardContent>
        </Card>

        {summaryCards.map((s, i) => {
          const Icon = s.icon;
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-emerald-50 text-emerald-600',
            red: 'bg-red-50 text-red-600',
            orange: 'bg-amber-50 text-amber-600',
          };
          return (
            <Card key={i} className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${colorMap[s.color]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs font-medium text-gray-700 mt-0.5">{s.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{s.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search route, code, vehicle, driver…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Shift select */}
            <div className="relative">
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value as any)}
                className="appearance-none w-full lg:w-44 px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="all">All shifts</option>
                <option value="Morning Pickup">Morning pickup</option>
                <option value="Afternoon Drop">Afternoon drop</option>
                <option value="Evening">Evening</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Status select */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="appearance-none w-full lg:w-44 px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="all">All status</option>
                <option value="On Time">On time</option>
                <option value="Delayed">Delayed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
              <Filter className="h-3.5 w-3.5" />
              {filtered.length} of {routes.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Routes list ────────────────────────────────────── */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <BusFront className="mr-2 h-5 w-5 text-amber-600" />
            Routes &amp; Attendance
          </CardTitle>
          <CardDescription className="text-xs">
            Capacity, assigned students, boarded count, and trip status for today
          </CardDescription>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BusFront className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No routes match your filters.</p>
              {routes.length === 0 && (
                <p className="text-xs mt-1 text-gray-400">
                  No bus routes found. Add routes in the database to get started.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => {
                const utilisation = r.capacity > 0 ? Math.round((r.boarded / r.capacity) * 100) : 0;
                const driver = r.bus_drivers?.[0];
                const isDelayed = r.status === 'Delayed';

                return (
                  <div
                    key={r.id}
                    className={`border rounded-xl p-4 transition-shadow hover:shadow-md ${
                      isDelayed ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      {/* Left: route info */}
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <BusFront className="h-5 w-5 text-amber-700" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Title row */}
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600 font-mono">
                              {r.code} · {r.vehicle_no}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadge(r.status)}`}>
                              {r.status}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {r.shift}
                            </span>
                          </div>

                          {/* Driver */}
                          <p className="text-xs text-gray-600 mb-1">
                            <User className="inline h-3 w-3 mr-1 text-gray-400" />
                            {driver
                              ? `${driver.name}${driver.contact ? ` · ${driver.contact}` : ''}`
                              : 'No driver assigned'}
                          </p>

                          {/* Times */}
                          <p className="text-xs text-gray-500">
                            <Clock className="inline h-3 w-3 mr-1 text-gray-400" />
                            Departure {fmt(r.departure_time)} &rarr; Arrival {fmt(r.arrival_time)}
                          </p>
                        </div>
                      </div>

                      {/* Right: stats */}
                      <div className="flex flex-col items-start lg:items-end gap-1 text-xs text-gray-700 shrink-0">
                        <div className="flex gap-4">
                          <span>Capacity <span className="font-bold text-gray-900">{r.capacity}</span></span>
                          <span>Assigned <span className="font-bold text-gray-900">{r.assignedStudents}</span></span>
                        </div>
                        <div className="flex gap-4">
                          <span>Boarded <span className="font-bold text-emerald-700">{r.boarded}</span></span>
                          <span>Absent <span className="font-bold text-red-600">{r.absent}</span></span>
                        </div>

                        {/* Utilisation bar */}
                        <div className="w-36 mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-amber-500 transition-all"
                              style={{ width: `${Math.min(utilisation, 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 text-right">
                            {utilisation}% capacity
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                      <Button size="sm" variant="outline" className="text-xs h-7">
                        <Users className="h-3 w-3 mr-1" />
                        View students
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => sendDelayAlert(r)}
                        disabled={sendingAlert === r.id}
                      >
                        {sendingAlert === r.id
                          ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          : <Bell className="h-3 w-3 mr-1" />}
                        Send delay alert
                      </Button>
                      {isDelayed && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-100 px-2 py-1 rounded-md">
                          <AlertCircle className="h-3 w-3" />
                          Route is delayed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}