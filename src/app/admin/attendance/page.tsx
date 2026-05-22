/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/auth';
import { format } from 'date-fns';
import {
  Check, X, Clock, AlertCircle, Loader2, ChevronRight,
  Users, BookOpen, Building2, GraduationCap, Save, RotateCcw,
  Search, Calendar, BarChart2,
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

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type Department = { id: string; name: string; code: string };
type Program    = { id: string; name: string; code: string; department_id: string };
type Course     = { id: string; name: string; code: string; semester: number; section: string | null };
type Student    = {
  id: string;
  full_name: string | null;
  enrollment_number: string | null;
  email: string;
  semester: number | null;
};

const STATUS_CONFIG: Record<AttendanceStatus, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  text: string;
  border: string;
  ring: string;
}> = {
  present: {
    label: 'Present',
    icon: <Check className="h-3.5 w-3.5" />,
    bg: 'bg-emerald-50', text: 'text-emerald-700',
    border: 'border-emerald-300', ring: 'ring-emerald-400',
  },
  absent: {
    label: 'Absent',
    icon: <X className="h-3.5 w-3.5" />,
    bg: 'bg-red-50', text: 'text-red-700',
    border: 'border-red-300', ring: 'ring-red-400',
  },
  late: {
    label: 'Late',
    icon: <Clock className="h-3.5 w-3.5" />,
    bg: 'bg-amber-50', text: 'text-amber-700',
    border: 'border-amber-300', ring: 'ring-amber-400',
  },
  excused: {
    label: 'Excused',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    bg: 'bg-blue-50', text: 'text-blue-700',
    border: 'border-blue-300', ring: 'ring-blue-400',
  },
};

// ─── Step bar ────────────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = [
    { n: 1, label: 'Department',  icon: <Building2     className="h-4 w-4" /> },
    { n: 2, label: 'Program',     icon: <BookOpen      className="h-4 w-4" /> },
    { n: 3, label: 'Course',      icon: <GraduationCap className="h-4 w-4" /> },
    { n: 4, label: 'Attendance',  icon: <Users         className="h-4 w-4" /> },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
            step === s.n && 'bg-slate-900 text-white shadow-lg',
            step >  s.n && 'bg-emerald-500 text-white',
            step <  s.n && 'bg-slate-100 text-slate-400',
          )}>
            {step > s.n ? <Check className="h-4 w-4" /> : s.icon}
            <span className="hidden sm:block">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <ChevronRight className={cn(
              'h-4 w-4 mx-1 flex-shrink-0',
              step > s.n ? 'text-emerald-400' : 'text-slate-300',
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Selectable card ──────────────────────────────────────────────────────────
function SelectCard({
  selected, onClick, title, subtitle, badge,
}: {
  selected: boolean; onClick: () => void;
  title: string; subtitle?: string; badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-200',
        'hover:border-slate-400 hover:shadow-md active:scale-[0.99]',
        selected
          ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
          : 'border-slate-200 bg-white text-slate-800',
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={cn('font-semibold text-sm', selected ? 'text-white' : 'text-slate-900')}>
            {title}
          </p>
          {subtitle && (
            <p className={cn('text-xs mt-0.5', selected ? 'text-slate-300' : 'text-slate-500')}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
            )}>
              {badge}
            </span>
          )}
          {selected && <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
        </div>
      </div>
    </button>
  );
}

// ─── Status toggle ────────────────────────────────────────────────────────────
function StatusButton({
  status, current, onClick,
}: {
  status: AttendanceStatus; current: AttendanceStatus; onClick: () => void;
}) {
  const cfg    = STATUS_CONFIG[status];
  const active = current === status;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150',
        active
          ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ${cfg.ring} shadow-sm`
          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
      )}
    >
      {cfg.icon}{cfg.label}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const [step, setStep] = useState(1);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs,    setPrograms]    = useState<Program[]>([]);
  const [courses,     setCourses]     = useState<Course[]>([]);
  const [students,    setStudents]    = useState<Student[]>([]);

  const [dept,   setDept]   = useState<Department | null>(null);
  const [prog,   setProg]   = useState<Program | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [date,   setDate]   = useState<Date>(new Date());
  const [calOpen, setCalOpen] = useState(false);

  const [attendance, setAttendance] = useState<Map<string, AttendanceStatus>>(new Map());
  const [original,   setOriginal]   = useState<Map<string, AttendanceStatus>>(new Map());

  const [search,       setSearch]       = useState('');
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const hasChanges = (() => {
    if (original.size === 0 && attendance.size === 0) return false;
    if (original.size !== attendance.size) return true;
    for (const [id, status] of attendance) {
      if (original.get(id) !== status) return true;
    }
    return false;
  })();

  useEffect(() => {
    (async () => {
      setLoadingDepts(true);
      const { data, error } = await supabase
        .from('departments').select('id, name, code').order('name');
      if (error) toast.error('Failed to load departments: ' + error.message);
      else setDepartments(data || []);
      setLoadingDepts(false);
    })();
  }, []);

  useEffect(() => {
    if (!dept) { setPrograms([]); return; }
    (async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, code, department_id')
        .eq('department_id', dept.id)
        .order('name');
      if (error) toast.error('Failed to load programs: ' + error.message);
      else setPrograms(data || []);
    })();
  }, [dept]);

  useEffect(() => {
    if (!prog) { setCourses([]); return; }
    (async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, code, semester, section')
        .eq('program_id', prog.id)
        .order('name');
      if (error) toast.error('Failed to load courses: ' + error.message);
      else setCourses(data || []);
    })();
  }, [prog]);

  const loadStudents = useCallback(async () => {
    if (!course) return;
    setLoading(true);
    setStudents([]);
    setAttendance(new Map());
    setOriginal(new Map());

    try {
      const { data: enrollments, error: eErr } = await supabase
        .from('student_courses')
        .select('student_id, status')
        .eq('course_id', course.id);

      if (eErr) throw new Error('student_courses query failed: ' + eErr.message);
      if (!enrollments || enrollments.length === 0) {
        toast.warning('No enrollments found for this course');
        setLoading(false);
        return;
      }

      const ids = [...new Set(enrollments.map((e) => e.student_id))];

      const { data: userData, error: uErr } = await supabase
        .from('users')
        .select('id, full_name, enrollment_number, email, semester')
        .in('id', ids)
        .order('full_name');

      if (uErr) throw new Error('users query failed: ' + uErr.message);

      const studentList = (userData || []) as Student[];

      const { data: attData } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('course_id', course.id)
        .eq('attendance_date', format(date, 'yyyy-MM-dd'));

      const attMap  = new Map<string, AttendanceStatus>();
      const origMap = new Map<string, AttendanceStatus>();

      studentList.forEach((s) => {
        const existing = attData?.find((a) => a.student_id === s.id);
        const status   = (existing?.status as AttendanceStatus) ?? 'absent';
        attMap.set(s.id, status);
        origMap.set(s.id, status);
      });

      setStudents(studentList);
      setAttendance(attMap);
      setOriginal(origMap);
      toast.success(`${studentList.length} student${studentList.length !== 1 ? 's' : ''} loaded`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [course, date]);

  useEffect(() => {
    if (course) loadStudents();
  }, [course, date]);

  const save = async () => {
    if (!course || students.length === 0) return;
    setSaving(true);
    try {
      const records = Array.from(attendance.entries()).map(([student_id, status]) => ({
        student_id,
        course_id: course.id,
        attendance_date: format(date, 'yyyy-MM-dd'),
        status,
        notes: null,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(records, {
          onConflict: 'student_id,course_id,attendance_date',
          ignoreDuplicates: false,
        });

      if (error) throw new Error(error.message);
      setOriginal(new Map(attendance));
      toast.success('Attendance saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status: AttendanceStatus) => {
    const next = new Map<string, AttendanceStatus>();
    students.forEach((s) => next.set(s.id, status));
    setAttendance(next);
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.full_name?.toLowerCase() || '').includes(q) ||
      (s.enrollment_number?.toLowerCase() || '').includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  attendance.forEach((s) => { counts[s]++; });

  const selectDept = (d: Department) => {
    setDept(d); setProg(null); setCourse(null); setStudents([]); setSearch(''); setStep(2);
  };
  const selectProg = (p: Program) => {
    setProg(p); setCourse(null); setStudents([]); setSearch(''); setStep(3);
  };
  const selectCourse = (c: Course) => { setCourse(c); setStep(4); };
  const reset = () => {
    setStep(1); setDept(null); setProg(null); setCourse(null);
    setStudents([]); setAttendance(new Map()); setOriginal(new Map()); setSearch('');
  };

  const initials = (name: string | null) =>
    (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Attendance</h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              {dept ? (
                <>
                  <span>{dept.name}</span>
                  {prog   && <><ChevronRight className="h-3 w-3" /><span>{prog.name}</span></>}
                  {course && <><ChevronRight className="h-3 w-3" /><span>{course.name}</span></>}
                </>
              ) : 'Select department to begin'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* ── Summary link ── */}
            <Link href="/admin/attendance-summary">
              <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 gap-1.5">
                <BarChart2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Summary</span>
              </Button>
            </Link>

            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={reset} className="text-slate-500">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset
              </Button>
            )}
            {step === 4 && hasChanges && (
              <Button
                size="sm" onClick={save} disabled={saving}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                {saving
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
                  : <><Save className="h-3.5 w-3.5 mr-1.5" />Save</>}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <StepBar step={step} />

        {/* Step 1 — Department */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Select Department</h2>
            <p className="text-sm text-slate-500 mb-6">Choose the department to mark attendance for</p>
            {loadingDepts ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : departments.length === 0 ? (
              <p className="text-center py-16 text-slate-400">No departments found</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {departments.map((d) => (
                  <SelectCard key={d.id} selected={dept?.id === d.id}
                    onClick={() => selectDept(d)} title={d.name} badge={d.code} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Program */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)}
              className="text-sm text-slate-400 hover:text-slate-600 mb-2 block">← Back</button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Select Program</h2>
            <p className="text-sm text-slate-500 mb-6">
              Programs under <span className="font-medium text-slate-700">{dept?.name}</span>
            </p>
            {programs.length === 0 ? (
              <p className="text-center py-16 text-slate-400">No programs found</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {programs.map((p) => (
                  <SelectCard key={p.id} selected={prog?.id === p.id}
                    onClick={() => selectProg(p)} title={p.name} badge={p.code} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Course */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)}
              className="text-sm text-slate-400 hover:text-slate-600 mb-2 block">← Back</button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Select Course</h2>
            <p className="text-sm text-slate-500 mb-6">
              Courses in <span className="font-medium text-slate-700">{prog?.name}</span>
            </p>
            {courses.length === 0 ? (
              <p className="text-center py-16 text-slate-400">No courses found</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {courses.map((c) => (
                  <SelectCard key={c.id} selected={course?.id === c.id}
                    onClick={() => selectCourse(c)} title={c.name}
                    subtitle={`Semester ${c.semester}${c.section ? ` · Section ${c.section}` : ''}`}
                    badge={c.code} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Attendance */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <button onClick={() => setStep(3)}
                    className="text-sm text-slate-400 hover:text-slate-600 mb-1 block">← Back</button>
                  <h2 className="text-lg font-bold text-slate-900">{course?.name}</h2>
                  <p className="text-sm text-slate-500">
                    {course?.code} · Semester {course?.semester}
                    {course?.section ? ` · Section ${course.section}` : ''}
                  </p>
                </div>
                <Popover open={calOpen} onOpenChange={setCalOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 border-slate-200 text-slate-700 font-medium">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {format(date, 'dd MMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarPicker mode="single" selected={date}
                      onSelect={(d) => { if (d) { setDate(d); setCalOpen(false); } }}
                      initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {students.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.entries(counts) as [AttendanceStatus, number][]).map(([s, n]) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <div key={s} className={cn('rounded-2xl border p-4', cfg.bg, cfg.border)}>
                      <p className={cn('text-xs font-medium mb-1', cfg.text)}>{cfg.label}</p>
                      <p className={cn('text-3xl font-bold', cfg.text)}>{n}</p>
                      <p className={cn('text-xs mt-0.5 opacity-70', cfg.text)}>
                        {students.length > 0 ? Math.round((n / students.length) * 100) : 0}%
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {students.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-slate-500 font-medium">Mark all:</span>
                    {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button key={s} onClick={() => markAll(s)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium',
                            'transition-all hover:shadow-sm active:scale-95',
                            cfg.bg, cfg.text, cfg.border,
                          )}>
                          {cfg.icon}{cfg.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative sm:ml-auto sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input placeholder="Search students…" value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-9 text-sm border-slate-200" />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Students</span>
                </div>
                {students.length > 0 && (
                  <span className="text-xs text-slate-400">
                    {filtered.length} of {students.length}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  <p className="text-sm text-slate-400">Loading students…</p>
                </div>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 px-6 text-center">
                  <Users className="h-8 w-8 text-slate-200" />
                  <p className="text-sm font-medium text-slate-500">No students found</p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Make sure students exist in <code className="bg-slate-100 px-1 rounded">student_courses</code> for
                    this course, and that RLS allows admin reads on that table.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Search className="h-8 w-8 text-slate-200" />
                  <p className="text-sm text-slate-400">No students match &quot;{search}&quot;</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {filtered.map((student, idx) => {
                    const status = attendance.get(student.id) ?? 'absent';
                    const cfg    = STATUS_CONFIG[status];
                    return (
                      <li key={student.id}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors">
                        <div className={cn(
                          'h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0',
                          cfg.bg, cfg.text,
                        )}>
                          {initials(student.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {student.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {student.enrollment_number || '—'} · {student.email}
                          </p>
                        </div>
                        <span className="text-xs text-slate-300 font-mono w-6 text-right flex-shrink-0 hidden sm:block">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map((s) => (
                            <StatusButton key={s} status={s} current={status}
                              onClick={() =>
                                setAttendance((prev) => new Map(prev).set(student.id, s))
                              } />
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {students.length > 0 && (
              <div className={cn(
                'flex items-center justify-between p-4 rounded-2xl border transition-all',
                hasChanges
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-400',
              )}>
                <p className="text-sm font-medium">
                  {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
                </p>
                <Button
                  onClick={save} disabled={saving || !hasChanges} size="sm"
                  className={cn(
                    hasChanges
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                  )}
                >
                  {saving
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
                    : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Attendance</>}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}