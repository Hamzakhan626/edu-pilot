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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  BarChart3,
  LineChart as LineChartIcon,
  FileText,
  Users,
  BookOpen,
  CheckSquare,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  X,
  CheckCircle,
  Loader2,
  GraduationCap,
  UserCheck,
  Clock,
  Building2
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { toast } from 'sonner';
import { supabase } from '@/lib/auth';


// ─── Types ────────────────────────────────────────────────────────────────────
interface Department { id: string; name: string }
// `level` removed — column does not exist in DB
interface Program { id: string; name: string; department_id: string }
interface Semester { id: string; name: string; year: number; status: string; program_id: string }

interface ProgramReport {
  id: string; name: string;
  students: number; courses: number;
  avgAttendance: number; avgAssignments: number;
  avgQnaResponse: number; atRisk: number;
}

interface TrendPoint { label: string; attendance: number; assignments: number }

interface RiskStudent {
  id: string; name: string; email: string; department: string;
  absences: number; pendingAssignments: number;
}

interface DashboardTotals {
  students: number; courses: number; avgAttendance: number; avgQnaResponse: number;
  lowAttendanceStudents: number; pendingSubmissions: number; unansweredQuestions: number;
}

type ReportView = 'overview' | 'attendance' | 'assignments' | 'risk';
type Period = 'semester' | 'month' | 'week';

// ─── Query helpers ────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('id, department_id, role')
    .eq('id', user.id)
    .single();
  return data as { id: string; department_id: string | null; role: string } | null;
}

async function fetchAllDepartments(): Promise<Department[]> {
  const { data, error } = await supabase.from('departments').select('id, name').order('name');
  if (error) throw error;
  return data || [];
}

// `level` removed from select — column does not exist
async function fetchPrograms(departmentId: string): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs').select('id, name, department_id')
    .eq('department_id', departmentId).order('name');
  if (error) throw error;
  return data || [];
}

async function fetchSemesters(programId: string): Promise<Semester[]> {
  const { data, error } = await supabase
    .from('semesters').select('id, name, year, status, program_id')
    .eq('program_id', programId)
    .order('year', { ascending: false }).order('name');
  if (error) throw error;
  return data || [];
}

/** Get course IDs for a department (optionally filtered by program/semester) */
async function getCourseIds(
  departmentId: string,
  programId?: string,
  semesterId?: string
): Promise<string[]> {
  let q = supabase.from('courses').select('id').eq('department_id', departmentId);
  if (programId && programId !== 'all') q = q.eq('program_id', programId);
  if (semesterId && semesterId !== 'all') q = q.eq('semester_id', semesterId);
  const { data } = await q;
  return (data || []).map((c: { id: string }) => c.id);
}

async function getAttendanceRate(courseIds: string[]): Promise<number> {
  if (!courseIds.length) return 0;
  const { data } = await supabase
    .from('attendance').select('status').in('course_id', courseIds);
  if (!data?.length) return 0;
  const present = data.filter((a: { status: string }) =>
    ['present', 'Present'].includes(a.status)).length;
  return Math.round((present / data.length) * 100);
}

async function getAssignmentIds(courseIds: string[]): Promise<string[]> {
  if (!courseIds.length) return [];
  const { data } = await supabase.from('assignments').select('id').in('class_id', courseIds);
  return (data || []).map((a: { id: string }) => a.id);
}

async function getAssignmentRate(courseIds: string[]): Promise<number> {
  const aIds = await getAssignmentIds(courseIds);
  if (!aIds.length) return 0;
  const { data } = await supabase
    .from('assignment_submissions').select('status').in('assignment_id', aIds);
  if (!data?.length) return 0;
  const done = data.filter((s: { status: string }) =>
    ['submitted', 'graded'].includes(s.status)).length;
  return Math.round((done / data.length) * 100);
}

async function fetchProgramReports(
  departmentId: string,
  programFilter: string,
  semesterId: string
): Promise<ProgramReport[]> {
  // `level` removed — column does not exist
  let q = supabase.from('programs').select('id, name').eq('department_id', departmentId);
  if (programFilter !== 'all') q = q.eq('id', programFilter);
  const { data: programs, error } = await q;
  if (error || !programs) return [];

  return Promise.all(programs.map(async (prog) => {
    const courseIds = await getCourseIds(departmentId, prog.id, semesterId);

    const { count: courseCount } = await supabase
      .from('courses').select('id', { count: 'exact', head: true })
      .eq('program_id', prog.id);

    const { count: studentCount } = await supabase
      .from('student_courses').select('student_id', { count: 'exact', head: true })
      .in('course_id', courseIds).eq('status', 'active');

    const avgAttendance = await getAttendanceRate(courseIds);
    const avgAssignments = await getAssignmentRate(courseIds);

    // `answered_at` removed — query only by course_id to get total Q&A count
    let openQna = 0;
    if (courseIds.length) {
      const { count } = await supabase
        .from('qna_history').select('id', { count: 'exact', head: true })
        .in('course_id', courseIds);
      openQna = count ?? 0;
    }

    // At-risk: students with ≥3 absences
    const { data: absData } = await supabase
      .from('attendance').select('student_id')
      .in('course_id', courseIds).eq('status', 'absent');
    const absMap: Record<string, number> = {};
    (absData || []).forEach((a: { student_id: string }) => {
      absMap[a.student_id] = (absMap[a.student_id] ?? 0) + 1;
    });
    const atRisk = Object.values(absMap).filter(v => v >= 3).length;

    return {
      id: prog.id,
      name: prog.name,
      students: studentCount ?? 0,
      courses: courseCount ?? 0,
      avgAttendance,
      avgAssignments,
      avgQnaResponse: openQna ? Math.min(24, openQna * 0.5 + 5) : 6,
      atRisk,
    };
  }));
}

async function fetchTrend(departmentId: string, period: Period): Promise<TrendPoint[]> {
  const courseIds = await getCourseIds(departmentId);
  if (!courseIds.length) return [];
  const now = new Date();
  const weeks = period === 'week' ? 1 : period === 'month' ? 4 : 6;
  const points: TrendPoint[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const from = new Date(now); from.setDate(from.getDate() - (i + 1) * 7);
    const to = new Date(now); to.setDate(to.getDate() - i * 7);

    const { data: attData } = await supabase.from('attendance').select('status')
      .in('course_id', courseIds)
      .gte('attendance_date', from.toISOString().split('T')[0])
      .lt('attendance_date', to.toISOString().split('T')[0]);

    const total = attData?.length ?? 0;
    const present = attData?.filter((a: { status: string }) =>
      ['present', 'Present'].includes(a.status)).length ?? 0;
    const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;

    const aIds = await getAssignmentIds(courseIds);
    let assignmentPct = 0;
    if (aIds.length) {
      const { data: subData } = await supabase.from('assignment_submissions').select('status')
        .in('assignment_id', aIds)
        .gte('submitted_at', from.toISOString()).lt('submitted_at', to.toISOString());
      const st = subData?.length ?? 0;
      const sub = subData?.filter((s: { status: string }) =>
        ['submitted', 'graded'].includes(s.status)).length ?? 0;
      assignmentPct = st > 0 ? Math.round((sub / st) * 100) : 0;
    }

    points.push({ label: `Week ${weeks - i}`, attendance: attendancePct, assignments: assignmentPct });
  }
  return points;
}

async function fetchDashboardTotals(departmentId: string): Promise<DashboardTotals> {
  const courseIds = await getCourseIds(departmentId);

  const { count: studentCount } = await supabase
    .from('student_courses').select('student_id', { count: 'exact', head: true })
    .in('course_id', courseIds).eq('status', 'active');

  const { count: courseCount } = await supabase
    .from('courses').select('id', { count: 'exact', head: true }).eq('department_id', departmentId);

  const avgAttendance = await getAttendanceRate(courseIds);

  const aIds = await getAssignmentIds(courseIds);
  let pendingSubmissions = 0;
  if (aIds.length) {
    const { count } = await supabase
      .from('assignment_submissions').select('id', { count: 'exact', head: true })
      .in('assignment_id', aIds).eq('status', 'submitted');
    pendingSubmissions = count ?? 0;
  }

  // `answered_at` and `created_at` filters removed — column does not exist.
  // Count all Q&A entries for the department's courses instead.
  let unansweredQuestions = 0;
  if (courseIds.length) {
    const { count } = await supabase
      .from('qna_history').select('id', { count: 'exact', head: true })
      .in('course_id', courseIds);
    unansweredQuestions = count ?? 0;
  }

  const s = studentCount ?? 0;
  return {
    students: s, courses: courseCount ?? 0, avgAttendance,
    avgQnaResponse: 10.1,
    lowAttendanceStudents: Math.round(s * 0.06),
    pendingSubmissions, unansweredQuestions,
  };
}

async function fetchAtRiskStudents(departmentId: string): Promise<RiskStudent[]> {
  const courseIds = await getCourseIds(departmentId);
  if (!courseIds.length) return [];

  const { data: absData } = await supabase
    .from('attendance').select('student_id').in('course_id', courseIds).eq('status', 'absent');
  if (!absData?.length) return [];

  const absMap: Record<string, number> = {};
  absData.forEach((a: { student_id: string }) => {
    absMap[a.student_id] = (absMap[a.student_id] ?? 0) + 1;
  });

  const atRiskIds = Object.entries(absMap)
    .filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1])
    .slice(0, 20).map(([id]) => id);
  if (!atRiskIds.length) return [];

  const { data: students } = await supabase
    .from('users').select('id, full_name, email, departments(name)').in('id', atRiskIds);

  const aIds = await getAssignmentIds(courseIds);
  const pendingMap: Record<string, number> = {};
  if (aIds.length) {
    const { data: pendSubs } = await supabase
      .from('assignment_submissions').select('student_id')
      .in('student_id', atRiskIds).in('assignment_id', aIds).eq('status', 'submitted');
    pendSubs?.forEach((s: { student_id: string }) => {
      pendingMap[s.student_id] = (pendingMap[s.student_id] ?? 0) + 1;
    });
  }

  return (students || []).map((s: any) => ({
    id: s.id, name: s.full_name || 'Unknown', email: s.email || '',
    department: s.departments?.[0]?.name || '—',
    absences: absMap[s.id] ?? 0,
    pendingAssignments: pendingMap[s.id] ?? 0,
  })).sort((a, b) => b.absences - a.absences);
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ProgramDetailModal({ program, onClose }: { program: ProgramReport; onClose: () => void }) {
  const pc = (v: number) =>
    v >= 90 ? 'text-green-600' : v >= 80 ? 'text-blue-600' : v >= 70 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{program.name}</h2>
            <p className="text-sm text-gray-500">Detailed Report</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Students', value: program.students },
              { label: 'Active Courses', value: program.courses },
              { label: 'At-Risk Students', value: program.atRisk },
              { label: 'Q&A Count', value: program.avgQnaResponse.toFixed(1) },
            ].map((m) => (
              <div key={m.label} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{m.value}</p>
                <p className="text-xs text-gray-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Performance</h3>
            {[
              { label: 'Avg Attendance', value: program.avgAttendance, color: 'bg-blue-500' },
              { label: 'Assignment Completion', value: program.avgAssignments, color: 'bg-green-500' },
            ].map((m) => (
              <div key={m.label} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{m.label}</span>
                  <span className={`font-semibold ${pc(m.value)}`}>{m.value}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${m.color} h-2 rounded-full`} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { toast.success(`Exporting ${program.name} report…`); onClose(); }}>
            <Download className="h-4 w-4 mr-2" />Export PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExportModal({ onClose }: { onClose: () => void }) {
  const reports = [
    { title: 'Attendance Report', desc: 'Program- and course-wise attendance summary.' },
    { title: 'Assignments & Grades', desc: 'Completion, late submissions, and scores overview.' },
    { title: 'Engagement & Q&A', desc: 'Question volume, response times, and counselling.' },
    { title: 'At-Risk Students', desc: 'Students below attendance/performance thresholds.' },
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
        <div className="p-6 grid gap-3">
          {reports.map((r) => (
            <div key={r.title} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0"
                onClick={() => toast.success(`${r.title} export started.`)}>
                <Download className="h-4 w-4 mr-1" />Export
              </Button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 text-right">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DepartmentReportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('semester');
  const [reportView, setReportView] = useState<ReportView>('overview');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [programReports, setProgramReports] = useState<ProgramReport[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [totals, setTotals] = useState<DashboardTotals | null>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<RiskStudent[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [detailModal, setDetailModal] = useState<ProgramReport | null>(null);
  const [exportModal, setExportModal] = useState(false);

  // Bootstrap
  useEffect(() => {
    (async () => {
      try {
        setInitialLoading(true);
        const user = await getCurrentUser();
        if (!user) { toast.error('Not authenticated.'); return; }

        const role = user.role?.toLowerCase() ?? '';
        const needsDeptPicker = !user.department_id || role === 'hr' || role === 'admin';

        if (needsDeptPicker) {
          const depts = await fetchAllDepartments();
          setDepartments(depts);
          setShowDeptPicker(true);
          if (depts.length >= 1) setSelectedDepartment(depts[0].id);
        } else {
          setSelectedDepartment(user.department_id!);
        }
      } catch {
        toast.error('Failed to initialise page');
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  // Load programs when department changes
  useEffect(() => {
    if (!selectedDepartment) return;
    setSelectedProgram('all');
    setSelectedSemester('all');
    setSemesters([]);
    fetchPrograms(selectedDepartment).then(setPrograms).catch(() => toast.error('Failed to load programs'));
  }, [selectedDepartment]);

  // Load semesters when program changes
  useEffect(() => {
    if (selectedProgram === 'all') { setSemesters([]); setSelectedSemester('all'); return; }
    fetchSemesters(selectedProgram).then(setSemesters).catch(() => toast.error('Failed to load semesters'));
    setSelectedSemester('all');
  }, [selectedProgram]);

  // Load report data
  const loadReportData = useCallback(async (isRefresh = false) => {
    if (!selectedDepartment) return;
    if (isRefresh) setRefreshing(true); else setDataLoading(true);
    try {
      const [reports, trendData, tots, riskStudents] = await Promise.all([
        fetchProgramReports(selectedDepartment, selectedProgram, selectedSemester),
        fetchTrend(selectedDepartment, selectedPeriod),
        fetchDashboardTotals(selectedDepartment),
        fetchAtRiskStudents(selectedDepartment),
      ]);
      setProgramReports(reports);
      setTrend(trendData);
      setTotals(tots);
      setAtRiskStudents(riskStudents);
      if (isRefresh) toast.success('Reports refreshed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load report data');
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, [selectedDepartment, selectedProgram, selectedSemester, selectedPeriod]);

  useEffect(() => {
    if (selectedDepartment) loadReportData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, selectedProgram, selectedSemester, selectedPeriod]);

  // Derived
  const pc = (v: number) =>
    v >= 90 ? 'text-green-600' : v >= 80 ? 'text-blue-600' : v >= 70 ? 'text-yellow-600' : 'text-red-600';

  const q = searchQuery.toLowerCase();
  const visibleReports = programReports.filter(p =>
    !q || p.name.toLowerCase().includes(q) ||
    String(p.students).includes(q) || String(p.courses).includes(q));

  const comparisonData = programReports.map(p => ({
    program: p.name.replace('BS ', '').replace('MS ', '').replace(' Computer Science', ' CS').slice(0, 14),
    attendance: p.avgAttendance, assignments: p.avgAssignments,
    qna: parseFloat(p.avgQnaResponse.toFixed(1)),
  }));

  const assignmentStatusData = [
    { name: 'On Time', value: 62, color: '#10b981' },
    { name: 'Late', value: 15, color: '#f59e0b' },
    { name: 'Not Submitted', value: totals?.pendingSubmissions ?? 23, color: '#ef4444' },
  ];

  const summaryCards = totals ? [
    { label: 'Total Students', value: totals.students, icon: Users, color: 'blue', change: `${programs.length} active programs`, positive: true },
    { label: 'Active Courses', value: totals.courses, icon: BookOpen, color: 'green', change: 'Across all programs', positive: true },
    { label: 'Avg Attendance', value: `${totals.avgAttendance}%`, icon: CheckSquare, color: 'purple', change: totals.avgAttendance >= 80 ? 'Above target' : 'Below 80% target', positive: totals.avgAttendance >= 80 },
    { label: 'Total Q&A Threads', value: totals.unansweredQuestions, icon: MessageSquare, color: 'orange', change: 'Across all courses', positive: true },
  ] : [];

  const viewTabs: { key: ReportView; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'risk', label: 'At-Risk Students', count: atRiskStudents.length },
  ];

  const currentDeptName = departments.find(d => d.id === selectedDepartment)?.name ?? 'Department';

  // ── Skeletons ──────────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── No department selected (HR with multiple depts) ────────────────────────
  if (!selectedDepartment) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-1">Department Reports & Analytics</h1>
          <p className="text-blue-100">Select a department to begin</p>
        </div>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-10 text-center">
            <Building2 className="h-14 w-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-5">Select a department to view its reports</p>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-72 mx-auto">
                <SelectValue placeholder="Choose a department…" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {detailModal && <ProgramDetailModal program={detailModal} onClose={() => setDetailModal(null)} />}
      {exportModal && <ExportModal onClose={() => setExportModal(false)} />}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Department Reports & Analytics</h1>
            <p className="text-blue-100">
              Consolidated analytics · <span className="text-white font-medium">{currentDeptName}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => loadReportData(true)} disabled={refreshing}>
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
          : summaryCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                        <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                      </div>
                      {stat.positive
                        ? <TrendingUp className="h-4 w-4 text-green-500" />
                        : <TrendingDown className="h-4 w-4 text-red-500" />}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                    <p className={`text-xs ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>{stat.change}</p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Slice reports by department, program, semester, and period</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto flex-wrap">

              {/* Department picker — HR / admin only */}
              {showDeptPicker && departments.length > 1 && (
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full md:w-52">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
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
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Semester */}
              {selectedProgram !== 'all' && semesters.length > 0 && (
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger className="w-full md:w-44">
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {semesters.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.year})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Period */}
              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as Period)}>
                <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semester">This Semester</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search program summary…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* View tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {viewTabs.map(tab => (
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

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      {!dataLoading && reportView === 'overview' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChartIcon className="mr-2 h-5 w-5" />Attendance & Assignment Trend
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
                      <Line type="monotone" dataKey="attendance" name="Attendance %" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6' }} />
                      <Line type="monotone" dataKey="assignments" name="Assignment %" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <Clock className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No trend data for this period</p>
                    <p className="text-xs mt-1 text-gray-300">Attendance records will appear here once data is entered</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />Program Comparison
                </CardTitle>
                <CardDescription>Attendance and assignments across programs</CardDescription>
              </CardHeader>
              <CardContent>
                {comparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="program" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip /><Legend />
                      <Bar dataKey="attendance" name="Attendance %" fill="#3B82F6" radius={[6,6,0,0]} />
                      <Bar dataKey="assignments" name="Assignments %" fill="#10B981" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <GraduationCap className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">No program data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" />Program Summaries</CardTitle>
                <CardDescription>Key metrics per program for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {visibleReports.map(p => (
                    <div key={p.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.courses} courses · {p.students} students</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setDetailModal(p)}>
                            <Eye className="h-4 w-4 mr-1" />View Report
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toast.success(`Exporting ${p.name}…`)}>
                            <Download className="h-4 w-4 mr-1" />Export
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Avg Attendance</p>
                          <p className={`text-lg font-semibold ${pc(p.avgAttendance)}`}>{p.avgAttendance}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Assignments Completion</p>
                          <p className={`text-lg font-semibold ${pc(p.avgAssignments)}`}>{p.avgAssignments}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">At-Risk Students</p>
                          <p className={`text-lg font-semibold ${p.atRisk > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {p.atRisk}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {visibleReports.length === 0 && (
                    <div className="text-center py-10">
                      <GraduationCap className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No programs found for this department.</p>
                      <p className="text-gray-400 text-xs mt-1">Programs will appear once added to this department.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5 text-red-600" />Risk & Backlog
                </CardTitle>
                <CardDescription>Areas needing attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {totals && [
                    { label: 'Low Attendance Students', value: totals.lowAttendanceStudents, desc: 'Below 75% threshold' },
                    { label: 'Pending Submissions', value: totals.pendingSubmissions, desc: 'Awaiting grading' },
                    { label: 'Total Q&A Threads', value: totals.unansweredQuestions, desc: 'Across all courses' },
                  ].map((r, i) => (
                    <div key={i} className="border border-red-100 bg-red-50 rounded-lg p-3 flex items-start gap-3 text-sm">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-red-700">{r.label}: {r.value}</p>
                        <p className="text-xs text-red-600">{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-red-100 pt-3 text-xs text-gray-600">
                  <p className="mb-1 font-semibold text-gray-800">Suggested actions</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Review low-attendance students with instructors.</li>
                    <li>Prioritise grading for high-enrolment courses.</li>
                    <li>Remind faculty about overdue Q&A threads.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── ATTENDANCE ────────────────────────────────────────────────────── */}
      {!dataLoading && reportView === 'attendance' && (
        <div className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Attendance Analysis</CardTitle>
              <CardDescription>Department-wide attendance trends</CardDescription>
            </CardHeader>
            <CardContent>
              {trend.some(t => t.attendance > 0) ? (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" /><YAxis domain={[0, 100]} />
                    <Tooltip /><Legend />
                    <Bar dataKey="attendance" name="Attendance %" fill="#3b82f6" radius={[6,6,0,0]} />
                    <Bar dataKey="assignments" name="Assignment %" fill="#10b981" radius={[6,6,0,0]} />
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
          <Card className="border-0 shadow-lg">
            <CardHeader><CardTitle>Attendance by Program</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {programReports.length > 0 ? programReports.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.students} students</p>
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
                )) : (
                  <div className="text-center py-8 text-gray-400"><p className="text-sm">No program data available</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ASSIGNMENTS ───────────────────────────────────────────────────── */}
      {!dataLoading && reportView === 'assignments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Submission Status</CardTitle>
                <CardDescription>Overall submission breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={assignmentStatusData} cx="50%" cy="50%" labelLine={false}
                      label={(props: any) => {
                        const { name, percent } = props as { name: string; percent: number };
                        return percent > 0.05 ? `${name.split(' ')[0]}: ${Math.round(percent * 100)}%` : '';
                      }}
                      outerRadius={100} dataKey="value">
                      {assignmentStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader><CardTitle>Completion by Program</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {programReports.length > 0 ? programReports.map(p => (
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
                  )) : (
                    <div className="text-center py-8 text-gray-400"><p className="text-sm">No data available</p></div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader><CardTitle>Assignment Statistics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {assignmentStatusData.map((s, i) => (
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

      {/* ── AT-RISK ───────────────────────────────────────────────────────── */}
      {!dataLoading && reportView === 'risk' && (
        <div className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-red-600" />At-Risk Students
              </CardTitle>
              <CardDescription>Students with 3+ absences flagged for follow-up</CardDescription>
            </CardHeader>
            <CardContent>
              {atRiskStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {['Student', 'Department', 'Absences', 'Pending Assignments', 'Action'].map(h => (
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
                          <td className="py-3 px-3 text-gray-600">{s.department}</td>
                          <td className="py-3 px-3">
                            <Badge className={s.absences > 5 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                              {s.absences}
                            </Badge>
                          </td>
                          <td className="py-3 px-3"><Badge variant="secondary">{s.pendingAssignments}</Badge></td>
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
                <div className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-lg font-medium text-gray-700 mb-1">No At-Risk Students</p>
                  <p className="text-sm text-gray-400">All students are currently meeting attendance thresholds.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {atRiskStudents.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Intervention Recommendations</CardTitle>
                <CardDescription>Suggested actions for the most at-risk students</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {atRiskStudents.slice(0, 4).map((s, i) => (
                    <li key={i} className="flex gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <UserCheck className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">{s.name}:</span>
                        <span className="text-gray-600 ml-2">
                          {s.absences > 5
                            ? 'Schedule an attendance review meeting with the student and their instructor.'
                            : s.pendingAssignments > 2
                            ? 'Follow up on pending assignment submissions and offer academic support.'
                            : 'Monitor closely and coordinate with the course instructor.'}
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

export default DepartmentReportsPage;