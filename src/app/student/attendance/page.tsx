/* eslint-disable prefer-const */

'use client';

import { useState, useEffect } from 'react';
import { supabase, getCurrentUser } from '@/lib/auth';
import { format, subMonths } from 'date-fns';
import {
  Check, X, Clock, AlertCircle, Loader2, Calendar,
  BookOpen, BarChart2, Search, FilterX, UserCircle, StickyNote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';

// --------------- Types ---------------
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type AttendanceRecord = {
  id: string;
  attendance_date: string;
  status: AttendanceStatus;
  notes: string | null;
  course_id: string;
  course_name: string;
  course_code: string;
  semester: number | null;
  section: string | null;
  teacher_name: string | null; // fetched via join if available
};

type Course = {
  id: string;
  name: string;
  code: string;
};

const STATUS_CONFIG: Record<AttendanceStatus, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  text: string;
  border: string;
}> = {
  present: {
    label: 'Present',
    icon: <Check className="h-3.5 w-3.5" />,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
  },
  absent: {
    label: 'Absent',
    icon: <X className="h-3.5 w-3.5" />,
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-300',
  },
  late: {
    label: 'Late',
    icon: <Clock className="h-3.5 w-3.5" />,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
  },
  excused: {
    label: 'Excused',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
  },
};

// --------------- Component ---------------
export default function StudentAttendancePage() {
  const user = getCurrentUser();
  const studentId = user?.id;

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 3));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Fetch enrolled courses
  useEffect(() => {
    if (!studentId) return;
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const { data: enrollments, error: eErr } = await supabase
          .from('student_courses')
          .select('course_id')
          .eq('student_id', studentId);

        if (eErr) throw new Error(eErr.message);

        if (enrollments && enrollments.length > 0) {
          const courseIds = enrollments.map((e) => e.course_id);
          const { data: coursesData, error: cErr } = await supabase
            .from('courses')
            .select('id, name, code')
            .in('id', courseIds)
            .order('name');

          if (cErr) throw new Error(cErr.message);
          setCourses(coursesData || []);
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [studentId]);

  // Fetch attendance with full details
  useEffect(() => {
    if (!studentId || courses.length === 0) return;

    const fetchAttendance = async () => {
      setLoadingRecords(true);
      try {
        let query = supabase
          .from('attendance')
          .select(`
            id,
            attendance_date,
            status,
            notes,
            course_id,
            course:course_id (
              name,
              code,
              semester,
              section,
              program:program_id ( name )
            )
          `)
          .eq('student_id', studentId)
          .order('attendance_date', { ascending: false });

        if (selectedCourseId) {
          query = query.eq('course_id', selectedCourseId);
        } else {
          const enrolledIds = courses.map((c) => c.id);
          query = query.in('course_id', enrolledIds);
        }

        if (startDate) {
          query = query.gte('attendance_date', format(startDate, 'yyyy-MM-dd'));
        }
        if (endDate) {
          query = query.lte('attendance_date', format(endDate, 'yyyy-MM-dd'));
        }

        const { data, error } = await query;

        if (error) throw new Error(error.message);

        // Optionally, also fetch teacher name(s) for each course
        // This is a separate query to avoid overly complex joins – you can remove if not needed
        const courseIds = (data || []).map((r: any) => r.course_id);
        let teacherMap = new Map<string, string>();
        if (courseIds.length > 0) {
          const { data: tcData } = await supabase
            .from('teacher_courses')
            .select('course_id, teacher:teacher_id ( full_name )')
            .in('course_id', courseIds);
          if (tcData) {
            tcData.forEach((tc: any) => {
              if (!teacherMap.has(tc.course_id) && tc.teacher?.full_name) {
                teacherMap.set(tc.course_id, tc.teacher.full_name);
              }
            });
          }
        }

        const records: AttendanceRecord[] = (data || []).map((row: any) => ({
          id: row.id,
          attendance_date: row.attendance_date,
          status: row.status,
          notes: row.notes,
          course_id: row.course_id,
          course_name: row.course?.name ?? 'Unknown',
          course_code: row.course?.code ?? '',
          semester: row.course?.semester ?? null,
          section: row.course?.section ?? null,
          teacher_name: teacherMap.get(row.course_id) ?? null,
        }));

        setAttendanceRecords(records);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load attendance');
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchAttendance();
  }, [studentId, courses, selectedCourseId, startDate, endDate]);

  // Filter by search (course name, code, date, teacher)
  const filteredRecords = attendanceRecords.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.course_name.toLowerCase().includes(q) ||
      r.course_code.toLowerCase().includes(q) ||
      r.attendance_date.includes(q) ||
      (r.teacher_name ?? '').toLowerCase().includes(q) ||
      (r.notes ?? '').toLowerCase().includes(q)
    );
  });

  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  filteredRecords.forEach((r) => { counts[r.status]++; });
  const total = filteredRecords.length;

  if (!studentId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Loading profile…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header and filters – same as before, but adjusted */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="h-6 w-6 text-slate-500" />
              My Attendance
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Full details for every session.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-500"
              disabled={loading || courses.length === 0}
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 border-slate-200">
                  <Calendar className="h-3.5 w-3.5" />
                  {startDate ? format(startDate, 'dd MMM yy') : 'Start'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarPicker mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
            <span className="text-slate-300">–</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 border-slate-200">
                  <Calendar className="h-3.5 w-3.5" />
                  {endDate ? format(endDate, 'dd MMM yy') : 'End'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarPicker mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
            {(selectedCourseId || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCourseId('');
                  setStartDate(subMonths(new Date(), 3));
                  setEndDate(new Date());
                }}
                className="text-slate-500 gap-1"
              >
                <FilterX className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Summary cards – unchanged, but counts now reflect richer data */}
        {total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.entries(counts) as [AttendanceStatus, number][]).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status} className={cn('rounded-2xl border p-4', cfg.bg, cfg.border)}>
                  <p className={cn('text-xs font-medium mb-1', cfg.text)}>{cfg.label}</p>
                  <p className={cn('text-3xl font-bold', cfg.text)}>{count}</p>
                  <p className={cn('text-xs mt-0.5 opacity-70', cfg.text)}>
                    {Math.round((count / total) * 100)}%
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search course, teacher, date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm border-slate-200"
          />
        </div>

        {/* Records list – now showing extra details */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Attendance Records</span>
            </div>
            <span className="text-xs text-slate-400">
              {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loadingRecords ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              <p className="text-sm text-slate-400">Loading records…</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 px-6 text-center">
              <BarChart2 className="h-8 w-8 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">No records found</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Try adjusting filters or check with your teacher.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {filteredRecords.map((record) => {
                const cfg = STATUS_CONFIG[record.status];
                return (
                  <li
                    key={record.id}
                    className="px-5 py-4 hover:bg-slate-50/70 transition-colors space-y-2"
                  >
                    {/* Top row: course + date + status */}
                    <div className="flex items-center gap-3">
                      <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg, cfg.text)}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {record.course_name}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {record.course_code}
                          </span>
                          {record.semester && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              Sem {record.semester}
                            </span>
                          )}
                          {record.section && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              Sec {record.section}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {format(new Date(record.attendance_date), 'EEEE, dd MMM yyyy')}
                        </p>
                      </div>
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
                        cfg.bg, cfg.text, cfg.border,
                      )}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>

                    {/* Bottom row: teacher + notes */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 ml-12">
                      {record.teacher_name && (
                        <span className="flex items-center gap-1">
                          <UserCircle className="h-3.5 w-3.5 text-slate-400" />
                          {record.teacher_name}
                        </span>
                      )}
                      {record.notes && (
                        <span className="flex items-start gap-1 max-w-xs">
                          <StickyNote className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="italic">{record.notes}</span>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}