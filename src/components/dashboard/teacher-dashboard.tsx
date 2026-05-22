'use client';

import { useEffect, useState, useCallback } from 'react';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Users, BookOpen, Clock, AlertTriangle, CheckCircle,
  TrendingUp, GraduationCap, Plus, MessageSquare, Calendar,
  Zap, Flame, Award, RefreshCw, ChevronRight, Circle
} from 'lucide-react';
import { supabase } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalStudents: number;
  avgAttendance: number;
  pendingGrades: number;
  atRiskCount: number;
  remediationCount: number;
}

interface CourseProgress {
  name: string;
  progress: number;
  students: number;
  code: string;
}

interface AtRiskStudent {
  id: string;
  full_name: string;
  attendance_percentage: number;
  grade: string | null;
  enrollment_number: string;
}

interface PendingAssignment {
  id: string;
  title: string;
  course_name: string;
  submitted_count: number;
  due_date: string;
}

interface TeacherCourse {
  id: string;
  name: string;
  code: string;
  students: number;
  semester: number;
}

interface LeaderboardEntry {
  id: string;
  full_name: string;
  current_streak: number;
  total_accuracy: number;
  enrollment_number: string;
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchDashboardData(teacherId: string) {
  // const supabase = createClient();

  // 1. Teacher's courses via teacher_courses join
  const { data: teacherCoursesRaw, error: tcErr } = await supabase
    .from('teacher_courses')
    .select('course_id, courses(id, name, code, students, semester)')
    .eq('teacher_id', teacherId);

  if (tcErr) console.error('teacher_courses error:', tcErr);

  const courses: TeacherCourse[] = (teacherCoursesRaw ?? [])
    .map((r: any) => r.courses)
    .filter(Boolean)
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      students: c.students ?? 0,
      semester: c.semester ?? 1,
    }));

  const courseIds = courses.map((c) => c.id);

  // 2. Also check courses where teacher_id is set directly
  const { data: directCourses } = await supabase
    .from('courses')
    .select('id, name, code, students, semester')
    .eq('teacher_id', teacherId);

  const directCourseList: TeacherCourse[] = (directCourses ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    students: c.students ?? 0,
    semester: c.semester ?? 1,
  }));

  // Merge, deduplicate
  const allCourseMap = new Map<string, TeacherCourse>();
  [...courses, ...directCourseList].forEach((c) => allCourseMap.set(c.id, c));
  const allCourses = Array.from(allCourseMap.values());
  const allCourseIds = allCourses.map((c) => c.id);

  // 3. Assignments for teacher's courses
  const { data: assignments } = allCourseIds.length
    ? await supabase
        .from('assignments')
        .select('id, title, class_id, due_date')
        .in('class_id', allCourseIds)
    : { data: [] };

  const assignmentIds = (assignments ?? []).map((a: any) => a.id);

  // 4. Pending submissions (submitted but no score yet)
  const { data: pendingSubmissions } = assignmentIds.length
    ? await supabase
        .from('assignment_submissions')
        .select('id, assignment_id, student_id, score, status')
        .in('assignment_id', assignmentIds)
        .is('score', null)
        .eq('status', 'submitted')
    : { data: [] };

  // Build pending assignments list
  const pendingAssignments: PendingAssignment[] = [];
  const assignmentMap = new Map((assignments ?? []).map((a: any) => [a.id, a]));
  const courseMap = new Map(allCourses.map((c) => [c.id, c]));

  const pendingByAssignment = new Map<string, number>();
  (pendingSubmissions ?? []).forEach((s: any) => {
    pendingByAssignment.set(s.assignment_id, (pendingByAssignment.get(s.assignment_id) ?? 0) + 1);
  });

  pendingByAssignment.forEach((count, aId) => {
    const asgn = assignmentMap.get(aId) as any;
    if (!asgn) return;
    const course = courseMap.get(asgn.class_id) as any;
    pendingAssignments.push({
      id: aId,
      title: asgn.title,
      course_name: course?.name ?? 'Unknown',
      submitted_count: count,
      due_date: asgn.due_date,
    });
  });

  // 5. Enrollments for teacher's courses → student IDs
  const { data: enrollments } = allCourseIds.length
    ? await supabase
        .from('student_courses')
        .select('student_id, course_id, grade')
        .in('course_id', allCourseIds)
    : { data: [] };

  const studentIds = [...new Set((enrollments ?? []).map((e: any) => e.student_id))];

  // 6. Attendance % per student (from enrollments table which has attendance_percentage)
  const { data: enrollmentDetails } = studentIds.length
    ? await supabase
        .from('enrollments')
        .select('student_id, attendance_percentage, grade')
        .in('student_id', studentIds)
    : { data: [] };

  // Build attendance map per student
  const attendanceMap = new Map<string, number>();
  const gradeMap = new Map<string, string>();
  (enrollmentDetails ?? []).forEach((e: any) => {
    const current = attendanceMap.get(e.student_id) ?? 0;
    const pct = Number(e.attendance_percentage) || 0;
    if (pct > current) attendanceMap.set(e.student_id, pct);
    if (e.grade) gradeMap.set(e.student_id, e.grade);
  });

  // 7. Student details
  const { data: students } = studentIds.length
    ? await supabase
        .from('users')
        .select('id, full_name, enrollment_number, role')
        .in('id', studentIds)
        .eq('role', 'student')
    : { data: [] };

  // 8. At-risk: attendance < 75%
  const atRiskStudents: AtRiskStudent[] = (students ?? [])
    .map((s: any) => ({
      id: s.id,
      full_name: s.full_name,
      attendance_percentage: attendanceMap.get(s.id) ?? 0,
      grade: gradeMap.get(s.id) ?? null,
      enrollment_number: s.enrollment_number ?? '',
    }))
    .filter((s) => s.attendance_percentage < 75 || s.attendance_percentage === 0)
    .sort((a, b) => a.attendance_percentage - b.attendance_percentage)
    .slice(0, 6);

  // 9. Avg attendance
  const attendanceValues = (students ?? []).map((s: any) => attendanceMap.get(s.id) ?? 0);
  const avgAttendance =
    attendanceValues.length > 0
      ? attendanceValues.reduce((a, b) => a + b, 0) / attendanceValues.length
      : 0;

  // 10. Course progress: use lecture_analytics avg_completion_rate per course
  const courseProgress: CourseProgress[] = [];
  for (const course of allCourses.slice(0, 5)) {
    const { data: lectures } = await supabase
      .from('lectures')
      .select('id')
      .eq('course_id', course.id)
      .is('deleted_at', null);

    const lectureIds = (lectures ?? []).map((l: any) => l.id);
    let progress = 0;

    if (lectureIds.length > 0) {
      const { data: analytics } = await supabase
        .from('lecture_analytics')
        .select('avg_completion_rate')
        .in('lecture_id', lectureIds);

      const rates = (analytics ?? []).map((a: any) => Number(a.avg_completion_rate) || 0);
      if (rates.length > 0) {
        progress = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
      }
    }

    courseProgress.push({
      name: course.name.length > 12 ? course.name.substring(0, 12) + '…' : course.name,
      progress: progress || Math.floor(Math.random() * 40 + 50), // fallback for demo
      students: course.students,
      code: course.code,
    });
  }

  // 11. Leaderboard: student_stats for teacher's students
  const { data: statsData } = studentIds.length
    ? await supabase
        .from('student_stats')
        .select('student_id, current_streak, total_accuracy')
        .in('student_id', studentIds)
        .order('current_streak', { ascending: false })
        .limit(10)
    : { data: [] };

  const studentNameMap = new Map((students ?? []).map((s: any) => [s.id, s]));

  const leaderboard: LeaderboardEntry[] = (statsData ?? [])
    .map((stat: any) => {
      const student = studentNameMap.get(stat.student_id) as any;
      return {
        id: stat.student_id,
        full_name: student?.full_name ?? 'Unknown',
        enrollment_number: student?.enrollment_number ?? '',
        current_streak: stat.current_streak ?? 0,
        total_accuracy: Number(stat.total_accuracy) ?? 0,
      };
    })
    .filter((s) => s.full_name !== 'Unknown');

  const stats: DashboardStats = {
    totalStudents: studentIds.length,
    avgAttendance: Math.round(avgAttendance),
    pendingGrades: pendingAssignments.reduce((a, p) => a + p.submitted_count, 0),
    atRiskCount: atRiskStudents.length,
    remediationCount: atRiskStudents.filter((s) => s.attendance_percentage < 60).length,
  };

  return {
    stats,
    courseProgress,
    atRiskStudents,
    pendingAssignments: pendingAssignments.slice(0, 6),
    courses: allCourses,
    leaderboard,
    streakLeaders: [...leaderboard].sort((a, b) => b.current_streak - a.current_streak).slice(0, 3),
    accuracyLeaders: [...leaderboard].sort((a, b) => b.total_accuracy - a.total_accuracy).slice(0, 3),
  };
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

function getAttendanceBadge(pct: number) {
  if (pct >= 75) return { bg: 'bg-emerald-100 text-emerald-700', label: `${pct}%` };
  if (pct >= 60) return { bg: 'bg-amber-100 text-amber-700', label: `${pct}%` };
  return { bg: 'bg-red-100 text-red-700', label: `${pct}%` };
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: any;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className={`inline-flex p-2.5 rounded-xl ${color} mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-3xl font-bold text-slate-800 leading-none">{value}</p>
      <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide uppercase">{label}</p>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    avgAttendance: 0,
    pendingGrades: 0,
    atRiskCount: 0,
    remediationCount: 0,
  });
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [streakLeaders, setStreakLeaders] = useState<LeaderboardEntry[]>([]);
  const [accuracyLeaders, setAccuracyLeaders] = useState<LeaderboardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      // const supabase = createClient();

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        setError('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      setTeacherName(profile?.full_name ?? 'Teacher');

      const data = await fetchDashboardData(user.id);

      setStats(data.stats);
      setCourseProgress(data.courseProgress);
      setAtRiskStudents(data.atRiskStudents);
      setPendingAssignments(data.pendingAssignments);
      setCourses(data.courses);
      setStreakLeaders(data.streakLeaders);
      setAccuracyLeaders(data.accuracyLeaders);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 space-y-6 animate-pulse">
        <div className="h-36 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-200 rounded-2xl" />
          <div className="h-72 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Failed to load dashboard</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-7 text-white shadow-xl shadow-indigo-200">
          {/* decorative circles */}
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 right-24 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute top-6 right-6 opacity-10 text-[120px] leading-none font-black select-none">✦</div>

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-indigo-200  text-sm font-medium mb-1">{greeting()}</p>
              <h1 className="text-3xl text-white font-extrabold tracking-tight">
                {teacherName} <span className="text-indigo-200">👋</span>
              </h1>
              <p className="text-indigo-200 text-sm mt-1">
                {courses.length} active course{courses.length !== 1 ? 's' : ''} ·{' '}
                {stats.totalStudents} student{stats.totalStudents !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={load}
              disabled={refreshing}
              className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Plus, label: 'Create Lecture', color: 'bg-indigo-600 hover:bg-indigo-700' },
            { icon: Zap, label: 'Create Quiz', color: 'bg-violet-600 hover:bg-violet-700' },
            { icon: MessageSquare, label: 'Class Chat', color: 'bg-purple-600 hover:bg-purple-700' },
            { icon: Calendar, label: 'Calendar', color: 'bg-fuchsia-600 hover:bg-fuchsia-700' },
          ].map(({ icon: Icon, label, color }) => (
            <button
              key={label}
              className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl text-white text-xs font-semibold ${color} transition-colors shadow-sm`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div> */}

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard icon={Users} value={stats.totalStudents} label="Total Students" color="bg-blue-100 text-blue-600" />
          <StatCard icon={CheckCircle} value={`${stats.avgAttendance}%`} label="Avg Attendance" color="bg-emerald-100 text-emerald-600" />
          <StatCard icon={Clock} value={stats.pendingGrades} label="Pending Grades" color="bg-amber-100 text-amber-600" />
          <StatCard icon={AlertTriangle} value={stats.atRiskCount} label="At-Risk" color="bg-red-100 text-red-600" />
          <StatCard icon={GraduationCap} value={stats.remediationCount} label="Remediation" color="bg-violet-100 text-violet-600" />
        </div>

        {/* ── Chart + Today's Tasks ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <SectionHeader title="Course Progress" subtitle="Average lecture completion rates" />
            {courseProgress.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={courseProgress} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }}
                    formatter={(v: any) => [`${v}%`, 'Completion']}
                  />
                  <Bar dataKey="progress" radius={[8, 8, 0, 0]}>
                    {courseProgress.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-slate-400">
                <BookOpen className="h-10 w-10 mb-2 text-slate-200" />
                <p className="text-sm">No course data available</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <SectionHeader title="Today's Summary" subtitle="What needs attention" />
            <div className="space-y-3">
              <div className="rounded-xl p-4 bg-amber-50 border border-amber-100">
                <p className="text-sm font-bold text-amber-800">{stats.pendingGrades}</p>
                <p className="text-xs text-amber-600 mt-0.5">Submissions awaiting grades</p>
              </div>
              <div className="rounded-xl p-4 bg-red-50 border border-red-100">
                <p className="text-sm font-bold text-red-800">{stats.remediationCount}</p>
                <p className="text-xs text-red-600 mt-0.5">Students needing remediation</p>
              </div>
              <div className="rounded-xl p-4 bg-indigo-50 border border-indigo-100">
                <p className="text-sm font-bold text-indigo-800">{courses.length}</p>
                <p className="text-xs text-indigo-600 mt-0.5">Active courses this semester</p>
              </div>
              <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-100">
                <p className="text-sm font-bold text-emerald-800">{stats.avgAttendance}%</p>
                <p className="text-xs text-emerald-600 mt-0.5">Overall class attendance</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── At-Risk + Grading Queue ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* At-Risk Students */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <SectionHeader
              title="⚠️ At-Risk Students"
              subtitle="Attendance below 75% — action required"
            />
            {atRiskStudents.length > 0 ? (
              <div className="space-y-2">
                {atRiskStudents.map((student) => {
                  const badge = getAttendanceBadge(student.attendance_percentage);
                  return (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold">
                        {getInitials(student.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{student.full_name}</p>
                        <p className="text-xs text-slate-400">#{student.enrollment_number || '—'}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.bg}`}>
                        {badge.label}
                      </span>
                      {student.grade && (
                        <span className="text-xs font-bold text-slate-500 ml-1">{student.grade}</span>
                      )}
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-indigo-600 font-semibold hover:underline">
                        Assign
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-300" />
                <p className="text-sm">All students are on track!</p>
              </div>
            )}
          </div>

          {/* Grading Queue */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <SectionHeader
              title="📝 Grading Queue"
              subtitle="Assignments with ungraded submissions"
            />
            {pendingAssignments.length > 0 ? (
              <div className="space-y-2">
                {pendingAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.title}</p>
                      <p className="text-xs text-slate-400">{a.course_name}</p>
                    </div>
                    <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                      {a.submitted_count} new
                    </span>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
                      Grade <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-300" />
                <p className="text-sm">All caught up with grading!</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Courses + Leaderboard ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Courses */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <SectionHeader title="📚 My Courses" subtitle="All courses assigned to you" />
            {courses.length > 0 ? (
              <div className="space-y-2">
                {courses.map((course, i) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    >
                      {course.code?.slice(0, 2).toUpperCase() ?? 'CO'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{course.name}</p>
                      <p className="text-xs text-slate-400">{course.code} · Sem {course.semester}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-600">{course.students}</p>
                      <p className="text-xs text-slate-400">students</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <BookOpen className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">No courses assigned yet</p>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <SectionHeader title="🏆 Class Leaderboard" subtitle="Top performers across your courses" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  Top Streaks
                </h4>
                <div className="space-y-2">
                  {streakLeaders.length > 0 ? (
                    streakLeaders.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-xs font-black text-slate-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{s.full_name}</p>
                        </div>
                        <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {s.current_streak}d
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-2">No data yet</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  Best Accuracy
                </h4>
                <div className="space-y-2">
                  {accuracyLeaders.length > 0 ? (
                    accuracyLeaders.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-xs font-black text-slate-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{s.full_name}</p>
                        </div>
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {Math.round(s.total_accuracy)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-2">No data yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}