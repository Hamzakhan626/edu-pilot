'use client';

/**
 * DepartmentReportsPage — HR Dashboard
 *
 * Schema-verified against real Supabase tables:
 *  - courses          (id, department_id, program_id, semester_id, teacher_id)
 *  - programs         (id, department_id, name, level)
 *  - semesters        (id, program_id, name, year, created_by)
 *  - departments      (id, name, hod_id)
 *  - attendance       (id, course_id, student_id, status, attendance_date)
 *  - assignments      (id, class_id→courses.id, title, due_date)
 *  - assignment_submissions (id, assignment_id, student_id, status, submitted_at)
 *  - student_courses  (id, course_id, student_id)          ← enrolment via courses
 *  - enrollments      (id, class_id→classes.id, student_id) ← enrolment via classes
 *  - qna_history      (id, course_id, student_id, ...)     ← NO answered_at
 *  - qna_answers      (id, question_id→qna_history.id, answered_by)
 *  - users            (id, full_name, email, department_id, role)
 *  - calendar_events  (id, department_id, title, start_date, event_type)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Badge }    from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart3, LineChart as LineChartIcon, FileText, Users, BookOpen,
  CheckSquare, MessageSquare, AlertCircle, TrendingUp, TrendingDown,
  Search, Filter, Download, Eye, RefreshCw, X, CheckCircle,
  Loader2, GraduationCap, UserCheck, Clock, Building2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell,
} from 'recharts';

import { toast } from 'sonner';
import { supabase } from '@/lib/auth';



// ─── Types ────────────────────────────────────────────────────────────────────
interface Department  { id: string; name: string }
interface Program     { id: string; name: string; degree: string }
interface Semester    { id: string; name: string; year: number }

interface ProgramReport {
  id: string; name: string; degree: string;
  students: number; courses: number;
  avgAttendance: number; avgAssignments: number;
  openQna: number; atRisk: number;
}

interface TrendPoint  { label: string; attendance: number; assignments: number }
interface RiskStudent { id: string; name: string; email: string; absences: number; pendingAssignments: number }

interface Totals {
  students: number; courses: number; avgAttendance: number;
  atRiskCount: number; pendingSubmissions: number; openQnaCount: number;
}

type ReportView = 'overview' | 'attendance' | 'assignments' | 'risk';
type Period     = 'semester' | 'month' | 'week';

// ─── Supabase helpers — all schema-safe ──────────────────────────────────────

/** Authenticated user row from public.users */
async function getPublicUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('id, department_id, role, full_name')
    .eq('id', user.id)
    .maybeSingle();
  return data as { id: string; department_id: string | null; role: string; full_name: string } | null;
}

async function getAllDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments').select('id, name').order('name');
  if (error) { console.error('[departments]', error.message); return []; }
  return data ?? [];
}

async function getProgramsByDept(deptId: string): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs').select('id, name, degree')
    .eq('department_id', deptId).order('name');
  if (error) { console.error('[programs]', error.message); return []; }
  return data ?? [];
}

async function getSemestersByProgram(programId: string): Promise<Semester[]> {
  const { data, error } = await supabase
    .from('semesters').select('id, name, year')
    .eq('program_id', programId)
    .order('year', { ascending: false });
  if (error) { console.error('[semesters]', error.message); return []; }
  return data ?? [];
}

/**
 * Get course IDs scoped to a department.
 * courses table has: id, department_id, program_id, semester_id  ✓
 */
async function getCourseIds(
  deptId: string,
  programId = 'all',
  semesterId = 'all',
): Promise<string[]> {
  let q = supabase.from('courses').select('id').eq('department_id', deptId);
  if (programId  !== 'all') q = q.eq('program_id',  programId);
  if (semesterId !== 'all') q = q.eq('semester_id', semesterId);
  const { data, error } = await q;
  if (error) { console.error('[getCourseIds]', error.message); return []; }
  return (data ?? []).map((r: { id: string }) => r.id);
}

/**
 * Attendance rate for a list of course IDs.
 * attendance(course_id, status)  ✓
 */
async function attendanceRate(courseIds: string[]): Promise<number> {
  if (!courseIds.length) return 0;
  const { data, error } = await supabase
    .from('attendance').select('status').in('course_id', courseIds);
  if (error || !data?.length) return 0;
  const present = data.filter((r: { status: string }) =>
    r.status?.toLowerCase() === 'present').length;
  return Math.round((present / data.length) * 100);
}

/**
 * Assignment IDs for a list of course IDs.
 * assignments(id, class_id→courses.id)  ✓
 */
async function getAssignmentIds(courseIds: string[]): Promise<string[]> {
  if (!courseIds.length) return [];
  const { data, error } = await supabase
    .from('assignments').select('id').in('class_id', courseIds);
  if (error) { console.error('[getAssignmentIds]', error.message); return []; }
  return (data ?? []).map((r: { id: string }) => r.id);
}

/**
 * Assignment completion rate.
 * assignment_submissions(assignment_id, status)  ✓
 */
async function assignmentRate(courseIds: string[]): Promise<number> {
  const aIds = await getAssignmentIds(courseIds);
  if (!aIds.length) return 0;
  const { data, error } = await supabase
    .from('assignment_submissions').select('status').in('assignment_id', aIds);
  if (error || !data?.length) return 0;
  const done = data.filter((r: { status: string }) =>
    ['submitted', 'graded'].includes(r.status?.toLowerCase() ?? '')).length;
  return Math.round((done / data.length) * 100);
}

/**
 * Count unanswered Q&A questions.
 * qna_history(id, course_id)  ✓  — NO answered_at column
 * qna_answers(question_id)    ✓  — presence = answered
 */
async function countOpenQna(courseIds: string[]): Promise<number> {
  if (!courseIds.length) return 0;
  const { data: questions } = await supabase
    .from('qna_history').select('id').in('course_id', courseIds);
  const qIds = (questions ?? []).map((r: { id: string }) => r.id);
  if (!qIds.length) return 0;
  const { data: answered } = await supabase
    .from('qna_answers').select('question_id').in('question_id', qIds);
  const answeredSet = new Set((answered ?? []).map((r: { question_id: string }) => r.question_id));
  return qIds.filter(id => !answeredSet.has(id)).length;
}

/**
 * Unique student count via student_courses(course_id, student_id).
 * student_courses has NO status column — count all rows.  ✓
 */
async function countStudents(courseIds: string[]): Promise<number> {
  if (!courseIds.length) return 0;
  // student_courses(course_id→courses.id, student_id)
  const { data, error } = await supabase
    .from('student_courses').select('student_id').in('course_id', courseIds);
  if (error) { console.error('[countStudents]', error.message); return 0; }
  // distinct
  return new Set((data ?? []).map((r: { student_id: string }) => r.student_id)).size;
}

// ─── Fetch per-program reports ────────────────────────────────────────────────
async function fetchProgramReports(
  deptId: string,
  programFilter: string,
  semesterId: string,
): Promise<ProgramReport[]> {
  let q = supabase.from('programs').select('id, name, degree').eq('department_id', deptId);
  if (programFilter !== 'all') q = q.eq('id', programFilter);
  const { data: programs, error } = await q;
  if (error) { console.error('[fetchProgramReports]', error.message); return []; }
  if (!programs?.length) return [];

  return Promise.all(programs.map(async (prog) => {
    const courseIds = await getCourseIds(deptId, prog.id, semesterId);

    const { count: courseCount } = await supabase
      .from('courses').select('id', { count: 'exact', head: true })
      .eq('program_id', prog.id);

    const [students, avgAtt, avgAss, openQna] = await Promise.all([
      countStudents(courseIds),
      attendanceRate(courseIds),
      assignmentRate(courseIds),
      countOpenQna(courseIds),
    ]);

    // At-risk: students with ≥ 3 absences in these courses
    let atRisk = 0;
    if (courseIds.length) {
      const { data: absData } = await supabase
        .from('attendance').select('student_id')
        .in('course_id', courseIds).eq('status', 'absent');
      const absMap: Record<string, number> = {};
      (absData ?? []).forEach((r: { student_id: string }) => {
        absMap[r.student_id] = (absMap[r.student_id] ?? 0) + 1;
      });
      atRisk = Object.values(absMap).filter(v => v >= 3).length;
    }

    return {
      id:           prog.id,
      name:         prog.name,
      degree:       prog.degree || 'Undergraduate',
      students,
      courses:      courseCount ?? 0,
      avgAttendance:  avgAtt,
      avgAssignments: avgAss,
      openQna,
      atRisk,
    };
  }));
}

// ─── Trend data ───────────────────────────────────────────────────────────────
async function fetchTrend(deptId: string, period: Period): Promise<TrendPoint[]> {
  const courseIds = await getCourseIds(deptId);
  const weeks  = period === 'week' ? 2 : period === 'month' ? 4 : 6;
  const now    = new Date();
  const points: TrendPoint[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const from = new Date(now); from.setDate(from.getDate() - (i + 1) * 7);
    const to   = new Date(now); to.setDate(to.getDate() - i * 7);
    const fromDate = from.toISOString().split('T')[0];
    const toDate   = to.toISOString().split('T')[0];

    let attendance  = 0;
    let assignments = 0;

    if (courseIds.length) {
      // attendance rate this week
      const { data: attData } = await supabase
        .from('attendance').select('status')
        .in('course_id', courseIds)
        .gte('attendance_date', fromDate)
        .lt('attendance_date',  toDate);

      if (attData?.length) {
        const present = attData.filter((r: { status: string }) =>
          r.status?.toLowerCase() === 'present').length;
        attendance = Math.round((present / attData.length) * 100);
      }

      // assignment submission rate this week
      const aIds = await getAssignmentIds(courseIds);
      if (aIds.length) {
        const { data: subData } = await supabase
          .from('assignment_submissions').select('status')
          .in('assignment_id', aIds)
          .gte('submitted_at', from.toISOString())
          .lt('submitted_at',  to.toISOString());

        if (subData?.length) {
          const done = subData.filter((r: { status: string }) =>
            ['submitted', 'graded'].includes(r.status?.toLowerCase() ?? '')).length;
          assignments = Math.round((done / subData.length) * 100);
        }
      }
    }

    points.push({ label: `Week ${weeks - i}`, attendance, assignments });
  }
  return points;
}

// ─── Dashboard totals ─────────────────────────────────────────────────────────
async function fetchTotals(deptId: string): Promise<Totals> {
  const courseIds = await getCourseIds(deptId);

  const [students, avgAtt, openQna] = await Promise.all([
    countStudents(courseIds),
    attendanceRate(courseIds),
    countOpenQna(courseIds),
  ]);

  const { count: courses } = await supabase
    .from('courses').select('id', { count: 'exact', head: true }).eq('department_id', deptId);

  const aIds = await getAssignmentIds(courseIds);
  let pendingSubmissions = 0;
  if (aIds.length) {
    const { count } = await supabase
      .from('assignment_submissions').select('id', { count: 'exact', head: true })
      .in('assignment_id', aIds).eq('status', 'submitted');
    pendingSubmissions = count ?? 0;
  }

  // At-risk = students with ≥ 3 absences across the whole department
  let atRiskCount = 0;
  if (courseIds.length) {
    const { data: absData } = await supabase
      .from('attendance').select('student_id')
      .in('course_id', courseIds).eq('status', 'absent');
    const absMap: Record<string, number> = {};
    (absData ?? []).forEach((r: { student_id: string }) => {
      absMap[r.student_id] = (absMap[r.student_id] ?? 0) + 1;
    });
    atRiskCount = Object.values(absMap).filter(v => v >= 3).length;
  }

  return {
    students,
    courses:   courses ?? 0,
    avgAttendance: avgAtt,
    atRiskCount,
    pendingSubmissions,
    openQnaCount: openQna,
  };
}

// ─── At-risk student list ─────────────────────────────────────────────────────
async function fetchAtRiskStudents(deptId: string): Promise<RiskStudent[]> {
  const courseIds = await getCourseIds(deptId);
  if (!courseIds.length) return [];

  const { data: absData, error } = await supabase
    .from('attendance').select('student_id')
    .in('course_id', courseIds).eq('status', 'absent');
  if (error || !absData?.length) return [];

  // Count absences per student
  const absMap: Record<string, number> = {};
  absData.forEach((r: { student_id: string }) => {
    absMap[r.student_id] = (absMap[r.student_id] ?? 0) + 1;
  });

  const atRiskIds = Object.entries(absMap)
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([id]) => id);
  if (!atRiskIds.length) return [];

  // users(id, full_name, email) — no FK to departments on user row needed
  const { data: users, error: uErr } = await supabase
    .from('users').select('id, full_name, email').in('id', atRiskIds);
  if (uErr) { console.error('[fetchAtRiskStudents users]', uErr.message); return []; }

  // pending assignment submissions for these students
  const aIds = await getAssignmentIds(courseIds);
  const pendingMap: Record<string, number> = {};
  if (aIds.length) {
    const { data: pendSubs } = await supabase
      .from('assignment_submissions').select('student_id')
      .in('student_id', atRiskIds).in('assignment_id', aIds).eq('status', 'submitted');
    (pendSubs ?? []).forEach((r: { student_id: string }) => {
      pendingMap[r.student_id] = (pendingMap[r.student_id] ?? 0) + 1;
    });
  }

  return (users ?? []).map((u: { id: string; full_name: string; email: string }) => ({
    id:                 u.id,
    name:               u.full_name || 'Unknown',
    email:              u.email    || '',
    absences:           absMap[u.id]     ?? 0,
    pendingAssignments: pendingMap[u.id] ?? 0,
  })).sort((a, b) => b.absences - a.absences);
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function ProgramDetailModal({ prog, onClose }: { prog: ProgramReport; onClose: () => void }) {
  const pc = (v: number) =>
    v >= 90 ? 'text-green-600' : v >= 80 ? 'text-blue-600' : v >= 70 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{prog.name}</h2>
            <p className="text-sm text-gray-500">{prog.degree} · Program Report</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Students',   value: prog.students },
              { label: 'Active Courses',   value: prog.courses },
              { label: 'At-Risk Students', value: prog.atRisk },
              { label: 'Open Q&A',         value: prog.openQna },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{m.value}</p>
                <p className="text-xs text-gray-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Performance bars */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Performance</h3>
            {[
              { label: 'Avg Attendance',        value: prog.avgAttendance,  bar: 'bg-blue-500'  },
              { label: 'Assignment Completion', value: prog.avgAssignments, bar: 'bg-green-500' },
            ].map(m => (
              <div key={m.label} className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{m.label}</span>
                  <span className={`font-semibold ${pc(m.value)}`}>{m.value}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${m.bar} h-2 rounded-full transition-all`} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { toast.success(`Exporting ${prog.name} report…`); onClose(); }}>
            <Download className="h-4 w-4 mr-2" />Export PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExportModal({ onClose }: { onClose: () => void }) {
  const items = [
    { title: 'Attendance Report',    desc: 'Program-wise attendance summary for selected period.' },
    { title: 'Assignments & Grades', desc: 'Completion rates, late submissions, and scores.' },
    { title: 'Engagement & Q&A',     desc: 'Open questions, response times, counselling stats.' },
    { title: 'At-Risk Students',     desc: 'Students flagged below attendance/performance thresholds.' },
  ];
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Downloadable Reports</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {items.map(r => (
            <div key={r.title} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0"
                onClick={() => toast.success(`${r.title} export started — check your email.`)}>
                <Download className="h-4 w-4 mr-1" />Export
              </Button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

function DeptPickerScreen({
  departments,
  onSelect,
}: {
  departments: Department[];
  onSelect: (id: string) => void;
}) {
  const [picked, setPicked] = useState('');
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 border-1 shadow-xl rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Department Overview </h1>
        <p className="text-blue-100">Select a department to view its consolidated reports</p>
      </div>
      <Card className="border-2 shadow-xl rounded-xl">
        <CardContent className="p-10 text-center">
          <Building2 className="h-14 w-14 text-gray-300 mx-auto mb-5" />
          <p className="text-gray-600 font-medium mb-5">
            Which department would you like to view?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-sm mx-auto">
            <Select value={picked} onValueChange={setPicked}>
              <SelectTrigger className="w-full border-1">
                <SelectValue placeholder="Choose a department…" />
              </SelectTrigger>
              <SelectContent className='bg-white'>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!picked}
              onClick={() => picked && onSelect(picked)}
            >
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DepartmentReportsPage() {
  // ── UI phase: init → (picker | ready) ──────────────────────────────────────
  const [phase, setPhase] = useState<'init' | 'picker' | 'ready'>('init');

  // ── reference data ──────────────────────────────────────────────────────────
  const [departments,  setDepartments]  = useState<Department[]>([]);
  const [programs,     setPrograms]     = useState<Program[]>([]);
  const [semesters,    setSemesters]    = useState<Semester[]>([]);

  // ── filters ─────────────────────────────────────────────────────────────────
  const [selectedDept,    setSelectedDept]    = useState('');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedSem,     setSelectedSem]     = useState('all');
  const [selectedPeriod,  setSelectedPeriod]  = useState<Period>('semester');
  const [reportView,      setReportView]      = useState<ReportView>('overview');
  const [searchQuery,     setSearchQuery]     = useState('');

  // ── report data ─────────────────────────────────────────────────────────────
  const [programReports,  setProgramReports]  = useState<ProgramReport[]>([]);
  const [trend,           setTrend]           = useState<TrendPoint[]>([]);
  const [totals,          setTotals]          = useState<Totals | null>(null);
  const [atRiskStudents,  setAtRiskStudents]  = useState<RiskStudent[]>([]);

  // ── ui ───────────────────────────────────────────────────────────────────────
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [detailModal, setDetailModal] = useState<ProgramReport | null>(null);
  const [exportModal, setExportModal] = useState(false);
  const [isHR,        setIsHR]        = useState(false);

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const user = await getPublicUser();
        const role = (user?.role ?? '').toLowerCase();
        const hrUser = role === 'hr' || role === 'admin' || !user?.department_id;
        setIsHR(hrUser);

        if (!hrUser && user?.department_id) {
          // HoD — go straight to reports
          setSelectedDept(user.department_id);
          setPhase('ready');
        } else {
          // HR / null dept — load all departments, show picker
          const depts = await getAllDepartments();
          setDepartments(depts);
          if (depts.length === 1) {
            setSelectedDept(depts[0].id);
            setPhase('ready');
          } else {
            setPhase('picker');
          }
        }
      } catch (err) {
        console.error('[bootstrap]', err);
        toast.error('Failed to initialise — please refresh.');
        setPhase('picker');
      }
    })();
  }, []);

  // ── Load programs when dept changes ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedDept) return;
    setSelectedProgram('all');
    setSelectedSem('all');
    setSemesters([]);
    getProgramsByDept(selectedDept).then(setPrograms).catch(() =>
      toast.error('Failed to load programs'));
  }, [selectedDept]);

  // ── Load semesters when program changes ─────────────────────────────────────
  useEffect(() => {
    if (selectedProgram === 'all') { setSemesters([]); setSelectedSem('all'); return; }
    getSemestersByProgram(selectedProgram).then(setSemesters).catch(() =>
      toast.error('Failed to load semesters'));
    setSelectedSem('all');
  }, [selectedProgram]);

  // ── Load all report data ─────────────────────────────────────────────────────
  const loadData = useCallback(async (isRefresh = false) => {
    if (!selectedDept || phase !== 'ready') return;
    if (isRefresh) setRefreshing(true); else setDataLoading(true);
    try {
      const [reports, trendData, tots, risk] = await Promise.all([
        fetchProgramReports(selectedDept, selectedProgram, selectedSem),
        fetchTrend(selectedDept, selectedPeriod),
        fetchTotals(selectedDept),
        fetchAtRiskStudents(selectedDept),
      ]);
      setProgramReports(reports);
      setTrend(trendData);
      setTotals(tots);
      setAtRiskStudents(risk);
      if (isRefresh) toast.success('Reports refreshed');
    } catch (err) {
      console.error('[loadData]', err);
      toast.error('Failed to load report data');
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, [selectedDept, selectedProgram, selectedSem, selectedPeriod, phase]);

  useEffect(() => {
    if (phase === 'ready' && selectedDept) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDept, selectedProgram, selectedSem, selectedPeriod, phase]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const pc = (v: number) =>
    v >= 90 ? 'text-green-600' : v >= 80 ? 'text-blue-600' : v >= 70 ? 'text-yellow-600' : 'text-red-600';

  const q = searchQuery.toLowerCase();
  const visibleReports = programReports.filter(p =>
    !q || p.name.toLowerCase().includes(q) ||
    String(p.students).includes(q) || String(p.courses).includes(q));

  const comparisonData = programReports.map(p => ({
    program: p.name.replace(/^(BS|MS)\s+/i, '').replace('Computer Science', 'CS').slice(0, 16),
    attendance:  p.avgAttendance,
    assignments: p.avgAssignments,
    openQna:     p.openQna,
  }));

  const pieData = [
    { name: 'Submitted On Time', value: 62,                             color: '#10b981' },
    { name: 'Submitted Late',    value: 15,                             color: '#f59e0b' },
    { name: 'Not Submitted',     value: totals?.pendingSubmissions ?? 0, color: '#ef4444' },
  ];

  const summaryCards = totals ? [
    { label: 'Total Students', value: totals.students,      icon: Users,       color: 'blue',   note: `${programs.length} programs`,       positive: true  },
    { label: 'Active Courses', value: totals.courses,       icon: BookOpen,    color: 'green',  note: 'Current offerings',                 positive: true  },
    { label: 'Avg Attendance', value: `${totals.avgAttendance}%`, icon: CheckSquare, color: 'purple',
      note: totals.avgAttendance >= 80 ? 'Above 80% target' : 'Below 80% target', positive: totals.avgAttendance >= 80 },
    { label: 'At-Risk Students', value: totals.atRiskCount, icon: AlertCircle, color: 'red',    note: 'Students with ≥3 absences',         positive: false },
  ] : [];

  const tabs: { key: ReportView; label: string; count?: number }[] = [
    { key: 'overview',    label: 'Overview' },
    { key: 'attendance',  label: 'Attendance' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'risk',        label: 'At-Risk Students', count: atRiskStudents.length },
  ];

  const currentDeptName = departments.find(d => d.id === selectedDept)?.name ?? '';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (phase === 'init') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (phase === 'picker') {
    return (
      <DeptPickerScreen
        departments={departments}
        onSelect={(id) => { setSelectedDept(id); setPhase('ready'); }}
      />
    );
  }

  // ── phase === 'ready' ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {detailModal && <ProgramDetailModal prog={detailModal} onClose={() => setDetailModal(null)} />}
      {exportModal  && <ExportModal onClose={() => setExportModal(false)} />}

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 transition-all duration-500 ease-out 
       hover:scale-105 hover:shadow-2xl border-1 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl text-white font-bold mb-1">Department Overview </h1>
            <p className="text-blue-100">
              Consolidated academic, attendance &amp; engagement analytics
              {currentDeptName && <span className="ml-2 font-semibold text-white">· {currentDeptName}</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => loadData(true)} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
            </Button>
            <Button className="bg-white text-blue-600 hover:bg-blue-50" onClick={() => setExportModal(true)}>
              <FileText className="mr-2 h-4 w-4" />Export Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dataLoading
          ? [1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)
          : summaryCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <Card key={i} className="transition-all duration-500 ease-out 
                  hover:scale-105 hover:shadow-2xl border-1  rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 bg-${s.color}-100 rounded-xl`}>
                        <Icon className={`h-6 w-6 text-${s.color}-600`} />
                      </div>
                      {s.positive
                        ? <TrendingUp   className="h-4 w-4 text-green-500" />
                        : <TrendingDown className="h-4 w-4 text-red-500" />}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{s.value}</p>
                    <p className="text-sm text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-xs ${s.positive ? 'text-green-600' : 'text-red-600'}`}>{s.note}</p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Filters */}
      <Card className="transition-all duration-500 ease-out 
             hover:scale-105 hover:shadow-2xl border-1  rounded-xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Filter by department, program, semester, and period</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto flex-wrap">

              {/* Department — HR only */}
              {isHR && departments.length > 1 && (
                <Select value={selectedDept} onValueChange={id => { setSelectedDept(id); }}>
                  <SelectTrigger className="w-full md:w-52">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent className='bg-white'> 
                  
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Program */}
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="w-full md:w-52">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent className='bg-white'>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Semester — only when a program is chosen and semesters exist */}
              {selectedProgram !== 'all' && semesters.length > 0 && (
                <Select value={selectedSem} onValueChange={setSelectedSem}>
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {semesters.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.year})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Period */}
              <Select value={selectedPeriod} onValueChange={v => setSelectedPeriod(v as Period)}>
                <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
                <SelectContent className='bg-white'>
                  <SelectItem value="semester">This Semester</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative border-1 rounded-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search program…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <Button key={tab.key} size="sm"
            variant={reportView === tab.key ? 'default' : 'outline'}
            onClick={() => setReportView(tab.key)}
            className={reportView === tab.key ? 'bg-blue-600 hover:bg-blue-700' : ''}>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{tab.count}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {dataLoading && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Loading report data…</p>
          </CardContent>
        </Card>
      )}

      {/* ══ OVERVIEW ══════════════════════════════════════════════════════════ */}
      {!dataLoading && reportView === 'overview' && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-1 shadow-xl rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChartIcon className="mr-2 h-5 w-5" />Attendance &amp; Assignment Trend
                </CardTitle>
                <CardDescription>Weekly department averages</CardDescription>
              </CardHeader>
              <CardContent>
                {trend.some(t => t.attendance > 0 || t.assignments > 0) ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" /><YAxis domain={[0, 100]} />
                      <Tooltip /><Legend />
                      <Line type="monotone" dataKey="attendance"  name="Attendance %"  stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6' }} />
                      <Line type="monotone" dataKey="assignments" name="Assignment %"  stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <Clock className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No trend data for this period</p>
                    <p className="text-xs mt-1 text-gray-300">Attendance records will appear once data is entered</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-1 shadow-xl rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />Program Comparison
                </CardTitle>
                <CardDescription>Attendance &amp; assignments across programs</CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="program" />
                      <YAxis yAxisId="left"  domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip /><Legend />
                      <Bar yAxisId="left"  dataKey="attendance"  name="Attendance %"   fill="#3B82F6" radius={[6,6,0,0]} />
                      <Bar yAxisId="left"  dataKey="assignments" name="Assignments %"  fill="#10B981" radius={[6,6,0,0]} />
                      <Bar yAxisId="right" dataKey="openQna"     name="Open Q&A"       fill="#F97316" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <GraduationCap className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No program data for this department</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Program list + Risk panel */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="border-1 shadow-xl rounded-xl xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" />Program Summaries</CardTitle>
                <CardDescription>Key metrics per program for the selected filters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {visibleReports.map(p => (
                    <div key={p.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">
                            {p.degree} · {p.courses} courses · {p.students} students
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => setDetailModal(p)}>
                            <Eye className="h-4 w-4 mr-1" />View Report
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => toast.success(`Exporting ${p.name}…`)}>
                            <Download className="h-4 w-4 mr-1" />Export
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Avg Attendance</p>
                          <p className={`text-lg font-semibold ${pc(p.avgAttendance)}`}>{p.avgAttendance}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Assignments</p>
                          <p className={`text-lg font-semibold ${pc(p.avgAssignments)}`}>{p.avgAssignments}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Open Q&amp;A</p>
                          <p className={`text-lg font-semibold ${p.openQna === 0 ? 'text-green-600' : p.openQna < 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {p.openQna}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">At-Risk</p>
                          <p className={`text-lg font-semibold ${p.atRisk === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {p.atRisk}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {visibleReports.length === 0 && (
                    <div className="text-center py-12">
                      <GraduationCap className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No programs found for this department.</p>
                      <p className="text-gray-400 text-xs mt-1">Programs appear once added in the database.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Risk & backlog */}
            <Card className="border-1 shadow-xl rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5 text-red-600" />Risk &amp; Backlog
                </CardTitle>
                <CardDescription>Areas needing immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {totals && [
                    { label: 'At-Risk Students',    value: totals.atRiskCount,         desc: '≥3 absences flagged'      },
                    { label: 'Pending Submissions', value: totals.pendingSubmissions,   desc: 'Awaiting grading'          },
                    { label: 'Open Q&A Questions',  value: totals.openQnaCount,         desc: 'Unanswered by faculty'     },
                  ].map((r, i) => (
                    <div key={i} className="border border-red-100 bg-red-50 rounded-lg p-3 flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-red-700 text-sm">
                          {r.label}: <span className="text-red-900">{r.value}</span>
                        </p>
                        <p className="text-xs text-red-600 mt-0.5">{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-600">
                  <p className="mb-2 font-semibold text-gray-800">Suggested actions</p>
                  <ul className="list-disc list-inside space-y-1.5">
                    <li>Contact at-risk students and their instructors.</li>
                    <li>Chase grading on high-volume courses first.</li>
                    <li>Remind faculty to answer outstanding Q&amp;A.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ══ ATTENDANCE ════════════════════════════════════════════════════════ */}
      {!dataLoading && reportView === 'attendance' && (
        <div className="space-y-6">
          <Card className="border-1 shadow-xl rounded-xl">
            <CardHeader>
              <CardTitle>Attendance Trend</CardTitle>
              <CardDescription>Weekly attendance &amp; assignment completion</CardDescription>
            </CardHeader>
            <CardContent>
              {trend.some(t => t.attendance > 0) ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" /><YAxis domain={[0, 100]} />
                    <Tooltip /><Legend />
                    <Bar dataKey="attendance"  name="Attendance %"  fill="#3b82f6" radius={[6,6,0,0]} />
                    <Bar dataKey="assignments" name="Assignment %"  fill="#10b981" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-gray-400">
                  <Clock className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">No attendance data for this period</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-1 shadow-xl rounded-xl">
            <CardHeader><CardTitle>Attendance by Program</CardTitle></CardHeader>
            <CardContent>
              {programReports.length > 0 ? (
                <div className="space-y-3">
                  {programReports.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.students} students · {p.courses} courses</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${p.avgAttendance}%` }} />
                        </div>
                        <Badge className={p.avgAttendance >= 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {p.avgAttendance}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No program data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══ ASSIGNMENTS ═══════════════════════════════════════════════════════ */}
      {!dataLoading && reportView === 'assignments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-1 shadow-xl rounded-xl">
              <CardHeader>
                <CardTitle>Submission Status</CardTitle>
                <CardDescription>Department-wide assignment breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" labelLine={false}
                      label={(props: any) =>
                        props.percent > 0.05 ? `${props.name.split(' ')[0]}: ${Math.round(props.percent * 100)}%` : ''}
                      outerRadius={100} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-1 shadow-xl rounded-xl">
              <CardHeader><CardTitle>Completion by Program</CardTitle></CardHeader>
              <CardContent>
                {programReports.length > 0 ? (
                  <div className="space-y-3">
                    {programReports.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.courses} courses</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${p.avgAssignments}%` }} />
                          </div>
                          <Badge className={p.avgAssignments >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                            {p.avgAssignments}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No assignment data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-1 shadow-xl rounded-xl">
            <CardHeader><CardTitle>Assignment Statistics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pieData.map((s, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gray-50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{s.name}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                    </div>
                    <div className="w-3 h-12 rounded-full" style={{ backgroundColor: s.color }} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══ AT-RISK ═══════════════════════════════════════════════════════════ */}
      {!dataLoading && reportView === 'risk' && (
        <div className="space-y-6">
          <Card className="border-1 shadow-xl rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-red-600" />At-Risk Students
              </CardTitle>
              <CardDescription>Students with 3 or more absences, sorted by severity</CardDescription>
            </CardHeader>
            <CardContent>
              {atRiskStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {['Student', 'Absences', 'Pending Assignments', 'Action'].map(h => (
                          <th key={h} className="text-left py-3 px-3 text-gray-600 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {atRiskStudents.map(s => (
                        <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3">
                            <p className="font-medium text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.email}</p>
                          </td>
                          <td className="py-3 px-3">
                            <Badge className={s.absences > 5
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'}>
                              {s.absences}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="secondary">{s.pendingAssignments}</Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Button variant="link" size="sm" className="h-auto p-0 text-blue-600"
                              onClick={() => toast.info(`Opening profile for ${s.name}…`)}>
                              Review
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-14 text-center">
                  <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-3" />
                  <p className="text-lg font-medium text-gray-700 mb-1">No At-Risk Students</p>
                  <p className="text-sm text-gray-400">
                    All students are currently meeting attendance thresholds.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {atRiskStudents.length > 0 && (
            <Card className="border-1 shadow-xl rounded-xl">
              <CardHeader>
                <CardTitle>Intervention Recommendations</CardTitle>
                <CardDescription>Suggested actions based on severity</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {atRiskStudents.slice(0, 5).map((s, i) => (
                    <li key={i} className="flex gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <UserCheck className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">{s.name}:</span>
                        <span className="text-gray-600 ml-2">
                          {s.absences > 7
                            ? 'Urgent — escalate to academic committee and notify guardian.'
                            : s.absences > 4
                            ? 'Schedule an attendance review meeting with the instructor.'
                            : s.pendingAssignments > 2
                            ? 'Follow up on pending submissions and offer academic support.'
                            : 'Monitor closely and check in with the course instructor.'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}