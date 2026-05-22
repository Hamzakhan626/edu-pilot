/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  Check, X, Clock, AlertCircle, Loader2,
  Users, BookOpen, Building2, GraduationCap, Search,
  Calendar, TrendingUp, ArrowLeft, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────
type Department = { id: string; name: string; code: string };
type Program    = { id: string; name: string; code: string; department_id: string };
type Course     = { id: string; name: string; code: string; semester: number; section: string | null; program_id: string };

type StudentSummary = {
  student_id: string;
  full_name: string | null;
  enrollment_number: string | null;
  email: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
};

type DateRangeOption = '7days' | '30days' | 'thisMonth' | 'custom';

const STATUS_CONFIG = {
  present: { label: 'Present', icon: <Check className="h-3.5 w-3.5" />, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-400' },
  absent:  { label: 'Absent',  icon: <X     className="h-3.5 w-3.5" />, bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     bar: 'bg-red-400'     },
  late:    { label: 'Late',    icon: <Clock className="h-3.5 w-3.5" />, bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   bar: 'bg-amber-400'   },
  excused: { label: 'Excused', icon: <AlertCircle className="h-3.5 w-3.5" />, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',  bar: 'bg-blue-400'    },
};

function AttendanceBadge({ pct }: { pct: number }) {
  if (pct >= 75) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{pct}%</span>;
  if (pct >= 60) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{pct}%</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{pct}%</span>;
}

function MiniBar({ present, absent, late, excused, total }: { present: number; absent: number; late: number; excused: number; total: number }) {
  if (total === 0) return <div className="h-1.5 rounded-full bg-slate-100 w-full" />;
  const pPct = (present / total) * 100;
  const aPct = (absent  / total) * 100;
  const lPct = (late    / total) * 100;
  const ePct = (excused / total) * 100;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden w-full gap-px">
      {pPct > 0 && <div className="bg-emerald-400 rounded-full" style={{ width: `${pPct}%` }} />}
      {lPct > 0 && <div className="bg-amber-400  rounded-full" style={{ width: `${lPct}%` }} />}
      {ePct > 0 && <div className="bg-blue-400   rounded-full" style={{ width: `${ePct}%` }} />}
      {aPct > 0 && <div className="bg-red-300    rounded-full" style={{ width: `${aPct}%` }} />}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AttendanceSummaryPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs,    setPrograms]    = useState<Program[]>([]);
  const [courses,     setCourses]     = useState<Course[]>([]);
  const [summaries,   setSummaries]   = useState<StudentSummary[]>([]);

  const [selectedDept,   setSelectedDept]   = useState<string>('all');
  const [selectedProg,   setSelectedProg]   = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  const [dateRange, setDateRange] = useState<DateRangeOption>('30days');
  const [fromDate,  setFromDate]  = useState<Date>(subDays(new Date(), 30));
  const [toDate,    setToDate]    = useState<Date>(new Date());
  const [calFromOpen, setCalFromOpen] = useState(false);
  const [calToOpen,   setCalToOpen]   = useState(false);

  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // ── Date range presets ───────────────────────────────────────────────────────
  useEffect(() => {
    const now = new Date();
    if (dateRange === '7days')    { setFromDate(subDays(now, 7));           setToDate(now); }
    if (dateRange === '30days')   { setFromDate(subDays(now, 30));          setToDate(now); }
    if (dateRange === 'thisMonth'){ setFromDate(startOfMonth(now));         setToDate(endOfMonth(now)); }
  }, [dateRange]);

  // ── Load departments ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingFilters(true);
      const { data, error } = await supabase.from('departments').select('id, name, code').order('name');
      if (error) toast.error('Failed to load departments');
      else setDepartments(data || []);
      setLoadingFilters(false);
    })();
  }, []);

  // ── Load programs when dept changes ──────────────────────────────────────────
  useEffect(() => {
    setSelectedProg('all'); setSelectedCourse('all');
    if (selectedDept === 'all') { setPrograms([]); return; }
    (async () => {
      const { data } = await supabase
        .from('programs').select('id, name, code, department_id')
        .eq('department_id', selectedDept).order('name');
      setPrograms(data || []);
    })();
  }, [selectedDept]);

  // ── Load courses when program changes ────────────────────────────────────────
  useEffect(() => {
    setSelectedCourse('all');
    if (selectedProg === 'all') { setCourses([]); return; }
    (async () => {
      const { data } = await supabase
        .from('courses').select('id, name, code, semester, section, program_id')
        .eq('program_id', selectedProg).order('name');
      setCourses(data || []);
    })();
  }, [selectedProg]);

  // ── Load summary data ────────────────────────────────────────────────────────
  useEffect(() => {
    loadSummary();
  }, [selectedDept, selectedProg, selectedCourse, fromDate, toDate]);

  const loadSummary = async () => {
    setLoading(true);
    setSummaries([]);
    try {
      const from = format(fromDate, 'yyyy-MM-dd');
      const to   = format(toDate,   'yyyy-MM-dd');

      // Build base query — join attendance → users
      let attQuery = supabase
        .from('attendance')
        .select(`
          student_id,
          status,
          course_id,
          courses!inner(program_id, department_id)
        `)
        .gte('attendance_date', from)
        .lte('attendance_date', to);

      if (selectedCourse !== 'all') {
        attQuery = attQuery.eq('course_id', selectedCourse);
      } else if (selectedProg !== 'all') {
        attQuery = attQuery.eq('courses.program_id', selectedProg);
      } else if (selectedDept !== 'all') {
        attQuery = attQuery.eq('courses.department_id', selectedDept);
      }

      const { data: attRows, error: attErr } = await attQuery;
      if (attErr) throw new Error(attErr.message);
      if (!attRows || attRows.length === 0) {
        setSummaries([]);
        setLoading(false);
        return;
      }

      // Aggregate per student
      const agg = new Map<string, { present: number; absent: number; late: number; excused: number }>();
      attRows.forEach((r: any) => {
        if (!agg.has(r.student_id)) agg.set(r.student_id, { present: 0, absent: 0, late: 0, excused: 0 });
        const bucket = agg.get(r.student_id)!;
        if (r.status in bucket) (bucket as any)[r.status]++;
      });

      const ids = [...agg.keys()];
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('id, full_name, enrollment_number, email')
        .in('id', ids)
        .order('full_name');

      if (uErr) throw new Error(uErr.message);

      const result: StudentSummary[] = (users || []).map((u: any) => {
        const b = agg.get(u.id) || { present: 0, absent: 0, late: 0, excused: 0 };
        const total = b.present + b.absent + b.late + b.excused;
        // present + late count as attended for percentage
        const attended = b.present + b.late;
        return {
          student_id: u.id,
          full_name: u.full_name,
          enrollment_number: u.enrollment_number,
          email: u.email,
          total,
          ...b,
          percentage: total > 0 ? Math.round((attended / total) * 100) : 0,
        };
      });

      result.sort((a, b) => b.percentage - a.percentage);
      setSummaries(result);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered ─────────────────────────────────────────────────────────────────
  const filtered = summaries.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.full_name?.toLowerCase() || '').includes(q) ||
      (s.enrollment_number?.toLowerCase() || '').includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  // ── Aggregate totals ──────────────────────────────────────────────────────────
  const totals = filtered.reduce(
    (acc, s) => ({ present: acc.present + s.present, absent: acc.absent + s.absent, late: acc.late + s.late, excused: acc.excused + s.excused, total: acc.total + s.total }),
    { present: 0, absent: 0, late: 0, excused: 0, total: 0 },
  );
  const atRisk     = filtered.filter((s) => s.percentage < 75).length;
  const initials   = (name: string | null) =>
    (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/attendance">
              <Button variant="ghost" size="sm" className="text-slate-500 gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Attendance Summary</h1>
              <p className="text-xs text-slate-500">
                {format(fromDate, 'dd MMM yyyy')} – {format(toDate, 'dd MMM yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">{filtered.length} students</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── Filters ──────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Filters</span>
          </div>

          {/* Date range */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500 font-medium w-16">Period:</span>
            {(['7days', '30days', 'thisMonth', 'custom'] as DateRangeOption[]).map((opt) => (
              <button key={opt} onClick={() => setDateRange(opt)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  dateRange === opt
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
                )}>
                {{ '7days': 'Last 7 days', '30days': 'Last 30 days', thisMonth: 'This month', custom: 'Custom' }[opt]}
              </button>
            ))}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 ml-1">
                <Popover open={calFromOpen} onOpenChange={setCalFromOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 border-slate-200 text-xs h-8">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {format(fromDate, 'dd MMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker mode="single" selected={fromDate}
                      onSelect={(d) => { if (d) { setFromDate(d); setCalFromOpen(false); } }} initialFocus />
                  </PopoverContent>
                </Popover>
                <span className="text-slate-400 text-xs">to</span>
                <Popover open={calToOpen} onOpenChange={setCalToOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 border-slate-200 text-xs h-8">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {format(toDate, 'dd MMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker mode="single" selected={toDate}
                      onSelect={(d) => { if (d) { setToDate(d); setCalToOpen(false); } }} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Dept / Program / Course selects */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs text-slate-500 font-medium w-16">Scope:</span>
            <div className="flex flex-wrap gap-2">
              {loadingFilters ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                <>
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="h-8 text-xs w-44 border-slate-200">
                      <Building2 className="h-3 w-3 text-slate-400 mr-1" />
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedDept !== 'all' && (
                    <Select value={selectedProg} onValueChange={setSelectedProg}>
                      <SelectTrigger className="h-8 text-xs w-44 border-slate-200">
                        <BookOpen className="h-3 w-3 text-slate-400 mr-1" />
                        <SelectValue placeholder="All Programs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Programs</SelectItem>
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedProg !== 'all' && (
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger className="h-8 text-xs w-52 border-slate-200">
                        <GraduationCap className="h-3 w-3 text-slate-400 mr-1" />
                        <SelectValue placeholder="All Courses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} {c.section ? `(${c.section})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Overview cards ────────────────────────────────────────────────────── */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map((key) => {
              const cfg = STATUS_CONFIG[key];
              const n   = totals[key];
              return (
                <div key={key} className={cn('rounded-2xl border p-4', cfg.bg, cfg.border)}>
                  <div className={cn('flex items-center gap-1.5 text-xs font-medium mb-1', cfg.text)}>
                    {cfg.icon}{cfg.label}
                  </div>
                  <p className={cn('text-2xl font-bold', cfg.text)}>{n}</p>
                  <p className={cn('text-xs opacity-60 mt-0.5', cfg.text)}>
                    {totals.total > 0 ? Math.round((n / totals.total) * 100) : 0}% of all
                  </p>
                </div>
              );
            })}
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium mb-1 text-red-700">
                <AlertCircle className="h-3.5 w-3.5" />At Risk
              </div>
              <p className="text-2xl font-bold text-red-700">{atRisk}</p>
              <p className="text-xs opacity-60 mt-0.5 text-red-700">below 75%</p>
            </div>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Student Attendance</span>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="Search students…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs border-slate-200" />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              <p className="text-sm text-slate-400">Loading summary…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Users className="h-8 w-8 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">No attendance records found</p>
              <p className="text-xs text-slate-400">Try adjusting the date range or filters</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="grid grid-cols-12 px-5 py-2 text-xs font-medium text-slate-400 border-b border-slate-50 bg-slate-50/60">
                <div className="col-span-4">Student</div>
                <div className="col-span-1 text-center">Present</div>
                <div className="col-span-1 text-center">Absent</div>
                <div className="col-span-1 text-center">Late</div>
                <div className="col-span-1 text-center">Excused</div>
                <div className="col-span-1 text-center">Total</div>
                <div className="col-span-3 text-center">Attendance</div>
              </div>

              <ul className="divide-y divide-slate-50">
                {filtered.map((s) => (
                  <li key={s.student_id}
                    className="grid grid-cols-12 items-center px-5 py-3 hover:bg-slate-50/70 transition-colors gap-1">
                    {/* Student */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className={cn(
                        'h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0',
                        s.percentage >= 75 ? 'bg-emerald-50 text-emerald-700' :
                        s.percentage >= 60 ? 'bg-amber-50  text-amber-700'   :
                                             'bg-red-50    text-red-700',
                      )}>
                        {initials(s.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.full_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400 truncate">{s.enrollment_number || s.email}</p>
                      </div>
                    </div>
                    {/* Counts */}
                    <div className="col-span-1 text-center text-sm font-medium text-emerald-600">{s.present}</div>
                    <div className="col-span-1 text-center text-sm font-medium text-red-500">{s.absent}</div>
                    <div className="col-span-1 text-center text-sm font-medium text-amber-600">{s.late}</div>
                    <div className="col-span-1 text-center text-sm font-medium text-blue-500">{s.excused}</div>
                    <div className="col-span-1 text-center text-xs text-slate-400">{s.total}</div>
                    {/* Bar + badge */}
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="flex-1">
                        <MiniBar {...s} />
                      </div>
                      <AttendanceBadge pct={s.percentage} />
                    </div>
                  </li>
                ))}
              </ul>

              {/* Footer totals */}
              <div className="grid grid-cols-12 items-center px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs font-semibold text-slate-600 gap-1">
                <div className="col-span-4 text-slate-500">{filtered.length} students total</div>
                <div className="col-span-1 text-center text-emerald-600">{totals.present}</div>
                <div className="col-span-1 text-center text-red-500">{totals.absent}</div>
                <div className="col-span-1 text-center text-amber-600">{totals.late}</div>
                <div className="col-span-1 text-center text-blue-500">{totals.excused}</div>
                <div className="col-span-1 text-center text-slate-400">{totals.total}</div>
                <div className="col-span-3 text-center">
                  <AttendanceBadge pct={totals.total > 0 ? Math.round(((totals.present + totals.late) / totals.total) * 100) : 0} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}