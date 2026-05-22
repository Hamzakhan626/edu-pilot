/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Users,
  Calendar,
  AlertCircle,
  BarChart3,
  GraduationCap,
  TrendingUp,
  Award,
  CheckCircle2,
  Loader2,
  ChevronRight,
  FileText,
  DollarSign,
  Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

// ─── Types ────────────────────────────────────────────────────────────────────

type Department = {
  id: string;
  name: string;
  code: string;
};

type Program = {
  id: string;
  department_id: string | null;
  name: string;
  code: string;
  degree: string | null;
  totalStudents: number;
  totalCourses: number;
  color: string;
  avgAttendance: number;
  avgPerformance: number;
  atRiskStudents: number;
  feeCompliance: number;
  activeSemesters: string[];
};

type Semester = {
  id: string;
  name: string;
  semesterType: string;
  year: number;
  programId: string;
  status: 'active' | 'upcoming' | 'completed';
  startDate: string | null;
  endDate: string | null;
  totalCourses: number;
  totalStudents: number;
  creditsOffered: number;
  progress: number;
};

type Course = {
  id: string;
  program_id: string;
  semester_id: string | null;
  code: string;
  name: string;
  instructor: string | null;
  students: number;
  section: string | null;
};

type TeacherData = {
  id: string;
  full_name: string;
  email: string;
  department_id: string | null;
  role: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calculateSemesterProgress = (
  startDate: string | null,
  endDate: string | null,
  status: string
): number => {
  if (status === 'completed') return 100;
  if (status === 'upcoming') return 0;
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate).getTime();
  const end   = new Date(endDate).getTime();
  const now   = Date.now();

  if (now < start) return 0;
  if (now > end)   return 100;

  return Math.round(((now - start) / (end - start)) * 100);
};

const mapProgram = (p: any): Program => ({
  id:              p.id,
  department_id:   p.department_id ?? null,
  name:            p.name          ?? 'Unnamed Program',
  code:            p.code          ?? '',
  degree:          p.degree        ?? null,
  totalStudents:   p.total_students  ?? 0,
  totalCourses:    p.total_courses   ?? 0,
  color:           p.color           ?? 'bg-blue-500',
  avgAttendance:   p.avg_attendance  ?? 0,
  avgPerformance:  p.avg_performance ?? 0,
  atRiskStudents:  p.at_risk_students ?? 0,
  feeCompliance:   p.fee_compliance   ?? 0,
  activeSemesters: p.active_semesters ?? [],
});

const mapSemester = (s: any): Semester => ({
  id:             s.id,
  name:           s.name          ?? 'Unnamed Semester',
  semesterType:   s.semester_type ?? '',
  year:           s.year          ?? new Date().getFullYear(),
  programId:      s.program_id,
  status:         s.status        ?? 'upcoming',
  startDate:      s.start_date    ?? null,
  endDate:        s.end_date      ?? null,
  totalCourses:   s.total_courses  ?? 0,
  totalStudents:  s.total_students ?? 0,
  creditsOffered: s.credits_offered ?? 0,
  progress:       calculateSemesterProgress(s.start_date, s.end_date, s.status ?? 'upcoming'),
});

const mapCourse = (c: any): Course => ({
  id:          c.id,
  program_id:  c.program_id,
  semester_id: c.semester_id ?? null,
  code:        c.code        ?? '',
  name:        c.name        ?? 'Unnamed Course',
  instructor:  c.instructor  ?? null,
  students:    c.students    ?? 0,
  section:     c.section     ?? null,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeacherProgramsPage() {
  const router = useRouter();

  const [currentTeacher,    setCurrentTeacher]    = useState<TeacherData | null>(null);
  const [teacherDepartments,setTeacherDepartments]= useState<Department[]>([]);
  const [programs,          setPrograms]           = useState<Program[]>([]);
  const [semesters,         setSemesters]          = useState<Semester[]>([]);
  const [courses,           setCourses]            = useState<Course[]>([]);
  const [teacherCourses,    setTeacherCourses]     = useState<string[]>([]);
  const [teacherProgramIds, setTeacherProgramIds]  = useState<string[]>([]);
  const [selectedProgram,   setSelectedProgram]    = useState<Program | null>(null);
  const [selectedSemester,  setSelectedSemester]   = useState<Semester | null>(null);
  const [view,              setView]               = useState<'programs' | 'semesters'>('programs');
  const [loading,           setLoading]            = useState(true);
  const [errorMsg,          setErrorMsg]           = useState<string | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1. Auth check
        const authUser = getCurrentUser();
        if (!authUser) { router.push('/login'); return; }
        if (authUser.role !== 'teacher') {
          router.push(`/${authUser.role}/dashboard`);
          return;
        }

        // 2. Fetch teacher row — use maybeSingle so null doesn't throw
        const { data: teacherData, error: teacherError } = await supabase
          .from('users')
          .select('id, full_name, email, department_id, role')
          .eq('id', authUser.id)
          .maybeSingle();

        if (teacherError) throw teacherError;

        if (!teacherData) {
          // ── FIX: build a minimal teacher object from auth user so the UI
          //         still renders even if the public.users row is missing ──
          console.warn('No public.users row found – using auth user data as fallback');
          const fallback: TeacherData = {
            id:            authUser.id,
            full_name:     authUser.name ?? authUser.email ?? 'Teacher',
            email:         authUser.email ?? '',
            department_id: null,
            role:          'teacher',
          };
          setCurrentTeacher(fallback);
          await loadEverything(fallback, [], []);
          return;
        }

        setCurrentTeacher(teacherData);

        // 3. Assigned programs
        const { data: tpRows } = await supabase
          .from('teacher_programs')
          .select('program_id')
          .eq('teacher_id', teacherData.id);
        const programIds = (tpRows ?? []).map((r: any) => r.program_id as string);
        setTeacherProgramIds(programIds);

        // 4. Departments (primary + junction)
        const deptIds: string[] = [];
        if (teacherData.department_id) deptIds.push(teacherData.department_id);

        const { data: tdRows } = await supabase
          .from('teacher_departments')
          .select('department_id')
          .eq('teacher_id', teacherData.id);
        (tdRows ?? []).forEach((r: any) => {
          if (!deptIds.includes(r.department_id)) deptIds.push(r.department_id);
        });

        if (deptIds.length > 0) {
          const { data: deptsData } = await supabase
            .from('departments')
            .select('id, name, code')
            .in('id', deptIds);
          setTeacherDepartments(deptsData ?? []);
        }

        // 5. Assigned courses
        const { data: tcRows } = await supabase
          .from('teacher_courses')
          .select('course_id')
          .eq('teacher_id', teacherData.id);
        const courseIds = (tcRows ?? []).map((r: any) => r.course_id as string);
        setTeacherCourses(courseIds);

        // 6. Load all data
        await loadEverything(teacherData, programIds, deptIds);

      } catch (err: any) {
        console.error('Init error:', err);
        setErrorMsg(err?.message ?? 'Failed to load data. Please retry.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  // ── Load programs + semesters ─────────────────────────────────────────────

  const loadEverything = async (
    teacher:    TeacherData,
    programIds: string[],
    deptIds:    string[],
  ) => {
    try {
      // ── Programs ──────────────────────────────────────────────────────────
      let rawPrograms: any[] = [];

      if (programIds.length > 0) {
        // Priority 1 — explicitly assigned programs
        const { data, error } = await supabase
          .from('programs')
          .select('*')
          .in('id', programIds);
        if (error) throw error;
        rawPrograms = data ?? [];

      } else if (deptIds.length > 0) {
        // Priority 2 — programs in teacher's departments
        const { data, error } = await supabase
          .from('programs')
          .select('*')
          .in('department_id', deptIds);
        if (error) throw error;
        rawPrograms = data ?? [];

      } else {
        // Priority 3 — fallback: show ALL programs so UI is never empty
        const { data, error } = await supabase
          .from('programs')
          .select('*')
          .limit(50);
        if (error) throw error;
        rawPrograms = data ?? [];
      }

      const mappedPrograms = rawPrograms.map(mapProgram);
      setPrograms(mappedPrograms);

      // ── Semesters ─────────────────────────────────────────────────────────
      if (mappedPrograms.length > 0) {
        const pIds = mappedPrograms.map(p => p.id);
        const { data: semData, error: semError } = await supabase
          .from('semesters')
          .select('*')
          .in('program_id', pIds)
          .order('start_date', { ascending: false });

        if (semError) throw semError;

        const mappedSems = (semData ?? []).map(mapSemester);
        setSemesters(mappedSems);
        if (mappedSems.length > 0) setSelectedSemester(mappedSems[0]);
      }

      // ── Auto-select first program + load its courses ───────────────────────
      if (mappedPrograms.length > 0) {
        const first = mappedPrograms[0];
        setSelectedProgram(first);
        await loadCoursesForProgram(first.id);
      }

    } catch (err: any) {
      console.error('loadEverything error:', err);
      setErrorMsg(err?.message ?? 'Failed to load programs.');
    }
  };

  // ── Load courses for a program ────────────────────────────────────────────

  const loadCoursesForProgram = async (programId: string) => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('program_id', programId);
      if (error) throw error;
      setCourses((data ?? []).map(mapCourse));
    } catch (err: any) {
      console.error('loadCourses error:', err);
      setCourses([]);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectProgram = async (program: Program) => {
    setSelectedProgram(program);
    await loadCoursesForProgram(program.id);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const totalStudents         = programs.reduce((s, p) => s + p.totalStudents,  0);
  const totalCourses          = programs.reduce((s, p) => s + p.totalCourses,   0);
  const totalAtRisk           = programs.reduce((s, p) => s + p.atRiskStudents, 0);
  const activeSemestersCount  = semesters.filter(s => s.status === 'active').length;

  // ── Loading / Error screens ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-lg text-gray-700 font-medium">Loading your programs…</p>
          <p className="text-sm text-gray-500 mt-2">Fetching assigned data</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold">Failed to Load Data</AlertTitle>
          <AlertDescription className="mt-2">
            {errorMsg}
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 hover:bg-red-700"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">My Programs &amp; Courses</h1>
                {teacherDepartments.length > 0 && (
                  <p className="text-white/90 text-sm mt-1">
                    {teacherDepartments.map(d => d.name).join(', ')}
                  </p>
                )}
              </div>
            </div>
            {currentTeacher && (
              <p className="text-white/95 text-base">
                Welcome, {currentTeacher.full_name}
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-lg"
          >
            <FileText className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Access Info */}
      <Alert className="border-indigo-200 bg-indigo-50">
        <Info className="h-5 w-5 text-indigo-600" />
        <AlertTitle className="text-indigo-900 font-semibold">Your Access</AlertTitle>
        <AlertDescription className="text-indigo-700 space-y-1">
          {teacherProgramIds.length > 0 ? (
            <span className="block">You have access to {teacherProgramIds.length} assigned program(s).</span>
          ) : teacherDepartments.length > 0 ? (
            <span className="block">
              Showing programs from: {teacherDepartments.map(d => d.name).join(', ')}
            </span>
          ) : (
            <span className="block">Showing all available programs (no department assigned).</span>
          )}
          {teacherCourses.length > 0 && (
            <span className="block">You are teaching {teacherCourses.length} course(s).</span>
          )}
          {semesters.length > 0 && (
            <span className="block">
              {semesters.length} semester(s) found · {activeSemestersCount} active
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* View Toggle */}
      <Card className="shadow-xl border-0 overflow-hidden">
        <CardContent className="p-6 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold text-gray-700">View Mode:</span>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {(['programs', 'semesters'] as const).map(v => (
                <Button
                  key={v}
                  variant={view === v ? 'default' : 'outline'}
                  onClick={() => setView(v)}
                  className={`h-14 transition-all ${
                    view === v
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {v === 'programs'
                    ? <GraduationCap className="h-5 w-5 mr-2" />
                    : <Calendar className="h-5 w-5 mr-2" />}
                  <div className="text-left">
                    <div className="font-bold capitalize">{v}</div>
                    <div className="text-xs opacity-80">
                      {v === 'programs' ? 'Degree programs' : 'Academic terms'}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'My Programs',       value: programs.length,   sub: 'Assigned programs',  color: 'from-blue-500 to-blue-600',   Icon: GraduationCap },
          { label: 'Total Students',    value: totalStudents,     sub: 'In my programs',     color: 'from-purple-500 to-purple-600',Icon: Users },
          { label: 'My Courses',        value: totalCourses,      sub: 'Teaching this term', color: 'from-green-500 to-green-600',  Icon: BookOpen },
          { label: 'At-Risk Students',  value: totalAtRisk,       sub: 'Need attention',     color: 'from-red-500 to-red-600',     Icon: AlertCircle },
        ].map(({ label, value, sub, color, Icon }) => (
          <Card key={label} className={`border-0 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 bg-gradient-to-br ${color} text-white overflow-hidden`}>
            <CardContent className="pt-6 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="relative z-10">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm w-fit mb-3">
                  <Icon className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium opacity-90">{label}</p>
                <p className="text-4xl font-bold mt-2">{value}</p>
                <p className="text-xs opacity-75 mt-1">{sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── PROGRAMS VIEW ─────────────────────────────────────────────────── */}
      {view === 'programs' && (
        programs.length === 0 ? (
          <Card className="text-center py-16 shadow-xl border-0">
            <CardContent>
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-12 w-12 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Programs Found</h3>
              <p className="text-gray-500 text-sm">Contact your administrator to get assigned to programs.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Program List Panel */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="sticky top-6 shadow-xl border-0">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">Select Program</CardTitle>
                      <CardDescription className="text-sm">Click to view details</CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 font-semibold">
                      {programs.length} total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 max-h-[600px] overflow-y-auto">
                  <div className="space-y-3">
                    {programs.map(program => {
                      const isAssigned = teacherProgramIds.includes(program.id);
                      const isSelected = selectedProgram?.id === program.id;
                      return (
                        <Card
                          key={program.id}
                          onClick={() => handleSelectProgram(program)}
                          className={`cursor-pointer transition-all transform hover:scale-[1.02] ${
                            isSelected
                              ? 'ring-2 ring-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg'
                              : 'hover:shadow-lg hover:bg-gray-50'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start space-x-3 flex-1">
                                <div className={`w-4 h-4 rounded-full mt-1 ${program.color} shadow-md flex-shrink-0`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <p className="font-bold text-gray-900 truncate">{program.name}</p>
                                    {isAssigned && (
                                      <Badge className="bg-green-600 text-white text-xs px-2 py-0">Assigned</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 font-medium">{program.code}</p>
                                  {program.degree && (
                                    <Badge variant="outline" className="mt-2 text-xs font-semibold">
                                      {program.degree}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {isSelected && <CheckCircle2 className="h-6 w-6 text-indigo-600 flex-shrink-0" />}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                              <div className="text-center p-2 bg-blue-50 rounded-lg">
                                <p className="text-xs text-gray-600 font-medium">Students</p>
                                <p className="font-bold text-blue-600 text-lg">{program.totalStudents}</p>
                              </div>
                              <div className="text-center p-2 bg-purple-50 rounded-lg">
                                <p className="text-xs text-gray-600 font-medium">Courses</p>
                                <p className="font-bold text-purple-600 text-lg">{program.totalCourses}</p>
                              </div>
                            </div>
                            {program.atRiskStudents > 0 && (
                              <div className="mt-2 p-2 bg-red-50 rounded-lg flex items-center justify-between border border-red-200">
                                <span className="text-xs text-red-700 font-semibold">At Risk</span>
                                <Badge variant="destructive" className="text-xs font-bold">{program.atRiskStudents}</Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Program Details Panel */}
            {selectedProgram && (
              <div className="lg:col-span-8">
                {/* Hero */}
                <Card className="mb-6 shadow-2xl border-0 overflow-hidden">
                  <div className={`${selectedProgram.color} p-8 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
                    <div className="relative z-10 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Award className="h-6 w-6" />
                          </div>
                          <span className="text-sm font-semibold opacity-90">Currently Viewing</span>
                        </div>
                        <h2 className="text-4xl font-bold mb-3">{selectedProgram.name}</h2>
                        <div className="flex items-center space-x-4 text-white/95">
                          <span className="font-semibold">{selectedProgram.code}</span>
                          {selectedProgram.degree && <><span>•</span><span>{selectedProgram.degree}</span></>}
                        </div>
                      </div>
                      <div className="text-right bg-white/20 rounded-2xl p-5 backdrop-blur-sm">
                        <div className="text-5xl font-bold">{selectedProgram.totalStudents}</div>
                        <div className="text-sm opacity-90 font-medium mt-1">Students</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                  <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl">
                    {[
                      { value: 'overview',     Icon: BarChart3,  label: 'Overview'     },
                      { value: 'courses',      Icon: BookOpen,   label: 'Courses'      },
                      { value: 'students',     Icon: Users,      label: 'Students'     },
                      { value: 'performance',  Icon: TrendingUp, label: 'Performance'  },
                    ].map(({ value, Icon, label }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="flex flex-col items-center py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg"
                      >
                        <Icon className="h-5 w-5 mb-1" />
                        <span className="text-xs font-bold">{label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {/* Overview */}
                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Avg Attendance',  value: selectedProgram.avgAttendance,  unit: '%', color: 'green',  Icon: TrendingUp,  sub: 'Strong performance' },
                        { label: 'Avg Performance', value: selectedProgram.avgPerformance, unit: '%', color: 'blue',   Icon: BarChart3,   sub: 'Academic scores'    },
                        { label: 'Fee Compliance',  value: selectedProgram.feeCompliance,  unit: '%', color: 'purple', Icon: DollarSign,  sub: 'Payment rate'       },
                        { label: 'At-Risk',         value: selectedProgram.atRiskStudents, unit: '',  color: 'red',    Icon: AlertCircle, sub: 'Need attention'     },
                      ].map(({ label, value, unit, color, Icon, sub }) => (
                        <Card key={label} className={`border-0 shadow-lg bg-gradient-to-br from-${color}-50 to-${color}-100`}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                              <p className={`text-sm font-semibold text-${color}-800`}>{label}</p>
                              <Icon className={`h-4 w-4 text-${color}-600`} />
                            </div>
                            <p className={`text-3xl font-bold text-${color}-700 mb-2`}>{value}{unit}</p>
                            <Progress value={unit === '%' ? value : (value / (selectedProgram.totalStudents || 1)) * 100} className="h-2 mb-1" />
                            <p className={`text-xs text-${color}-600 font-medium`}>{sub}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Active Semesters */}
                    <Card className="shadow-lg border-0">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold">Active Semesters</CardTitle>
                        <CardDescription>Currently running semesters in {selectedProgram.name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {selectedProgram.activeSemesters.length > 0 ? (
                          <div className="space-y-3">
                            {selectedProgram.activeSemesters.map((sem, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 hover:shadow-md transition-all"
                              >
                                <div className="flex items-center space-x-4">
                                  <div className="p-3 bg-indigo-100 rounded-xl">
                                    <Calendar className="h-6 w-6 text-indigo-600" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 text-lg">{sem}</p>
                                    <p className="text-sm text-gray-600 font-medium">In Progress</p>
                                  </div>
                                </div>
                                <Button size="sm" variant="outline" className="font-semibold">
                                  View Details <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-8">No active semesters for this program</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Courses */}
                  <TabsContent value="courses">
                    <Card className="shadow-lg border-0">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold">Program Courses</CardTitle>
                        <CardDescription>All courses under {selectedProgram.name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {courses.length > 0 ? (
                          <div className="space-y-3">
                            {courses.map(course => {
                              const isTeaching = teacherCourses.includes(course.id);
                              return (
                                <div
                                  key={course.id}
                                  className={`flex items-center justify-between p-5 border-2 rounded-xl transition-all shadow-sm hover:shadow-md ${
                                    isTeaching
                                      ? 'bg-green-50 border-green-300 ring-2 ring-green-200'
                                      : 'hover:bg-gray-50 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center space-x-4 flex-1">
                                    <div className={`p-3 rounded-xl ${isTeaching ? 'bg-green-200' : 'bg-indigo-100'}`}>
                                      <BookOpen className={`h-6 w-6 ${isTeaching ? 'text-green-700' : 'text-indigo-600'}`} />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <p className="font-bold text-gray-900 text-lg">
                                          {course.code} – {course.name}
                                        </p>
                                        {isTeaching && (
                                          <Badge className="bg-green-600 text-white text-xs font-bold">Teaching</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 font-medium">
                                        Section {course.section ?? 'N/A'} · {course.instructor ?? 'TBA'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 font-semibold">
                                      {course.students} students
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant={isTeaching ? 'default' : 'outline'}
                                      className={isTeaching ? 'font-semibold bg-green-600 hover:bg-green-700' : 'font-semibold'}
                                    >
                                      {isTeaching ? 'Manage' : 'View'}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <BookOpen className="h-10 w-10 text-gray-400" />
                            </div>
                            <p className="text-gray-600 font-medium">No courses found for this program</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Students */}
                  <TabsContent value="students">
                    <Card className="shadow-lg border-0">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold">Student Overview</CardTitle>
                        <CardDescription>Performance and risk analysis</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            {
                              label: 'High Performers', sub: '>85% average',
                              value: Math.floor(selectedProgram.totalStudents * 0.45),
                              color: 'green', Icon: TrendingUp,
                            },
                            {
                              label: 'Average', sub: '60–85% average',
                              value: Math.floor(selectedProgram.totalStudents * 0.45),
                              color: 'yellow', Icon: BarChart3,
                            },
                            {
                              label: 'At-Risk', sub: '<60% average',
                              value: selectedProgram.atRiskStudents,
                              color: 'red', Icon: AlertCircle,
                            },
                          ].map(({ label, sub, value, color, Icon }) => (
                            <div
                              key={label}
                              className={`p-6 bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-xl border-2 border-${color}-200`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className={`text-sm font-bold text-${color}-800`}>{label}</p>
                                <Icon className={`h-5 w-5 text-${color}-600`} />
                              </div>
                              <p className={`text-4xl font-bold text-${color}-700`}>{value}</p>
                              <p className={`text-xs text-${color}-600 mt-1 font-medium`}>{sub}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Performance */}
                  <TabsContent value="performance">
                    <Card className="shadow-lg border-0">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold">Performance Metrics</CardTitle>
                        <CardDescription>Analytics for {selectedProgram.name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                          <h4 className="font-bold text-lg mb-4 text-gray-900">Academic Performance</h4>
                          <div className="space-y-4">
                            {[
                              { label: 'Class Average GPA',      pct: 80, display: '3.2', color: 'blue'   },
                              { label: 'Assignment Completion',  pct: 92, display: '92%', color: 'green'  },
                              { label: 'Exam Pass Rate',         pct: 88, display: '88%', color: 'purple' },
                            ].map(({ label, pct, display, color }) => (
                              <div key={label}>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                                  <span className={`text-lg font-bold text-${color}-600`}>{display}</span>
                                </div>
                                <Progress value={pct} className="h-3" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        )
      )}

      {/* ── SEMESTERS VIEW ────────────────────────────────────────────────── */}
      {view === 'semesters' && (
        semesters.length === 0 ? (
          <Card className="text-center py-16 shadow-xl border-0">
            <CardContent>
              <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Semesters Found</h3>
              <p className="text-gray-500 text-sm">Semesters will appear once they are created for your programs.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Semester List Panel */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="sticky top-6 shadow-xl border-0">
                <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">Select Semester</CardTitle>
                      <CardDescription className="text-sm">Click to view details</CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 font-semibold">
                      {semesters.length} total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 max-h-[600px] overflow-y-auto">
                  <div className="space-y-3">
                    {semesters.map(semester => {
                      const semProgram = programs.find(p => p.id === semester.programId);
                      const isSelected = selectedSemester?.id === semester.id;
                      return (
                        <Card
                          key={semester.id}
                          onClick={() => setSelectedSemester(semester)}
                          className={`cursor-pointer transition-all transform hover:scale-[1.02] ${
                            isSelected
                              ? 'ring-2 ring-green-500 bg-gradient-to-br from-green-50 to-blue-50 shadow-lg'
                              : 'hover:shadow-lg hover:bg-gray-50'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <p className="font-bold text-gray-900">{semester.name}</p>
                                <p className="text-sm text-gray-600 font-medium">
                                  {semester.semesterType} {semester.year}
                                </p>
                                {semProgram && (
                                  <p className="text-xs text-gray-500 mt-1">{semProgram.name}</p>
                                )}
                                <Badge
                                  variant={
                                    semester.status === 'active'   ? 'default'   :
                                    semester.status === 'upcoming' ? 'secondary' : 'outline'
                                  }
                                  className="mt-2 capitalize font-semibold"
                                >
                                  {semester.status}
                                </Badge>
                              </div>
                              {isSelected && <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                              <div className="text-center p-2 bg-blue-50 rounded-lg">
                                <p className="text-xs text-gray-600 font-medium">Courses</p>
                                <p className="font-bold text-blue-600 text-lg">{semester.totalCourses}</p>
                              </div>
                              <div className="text-center p-2 bg-purple-50 rounded-lg">
                                <p className="text-xs text-gray-600 font-medium">Students</p>
                                <p className="font-bold text-purple-600 text-lg">{semester.totalStudents}</p>
                              </div>
                            </div>
                            {semester.status === 'active' && (
                              <div className="mt-3">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-gray-600 font-medium">Progress</span>
                                  <span className="text-xs font-bold text-gray-900">{semester.progress}%</span>
                                </div>
                                <Progress value={semester.progress} className="h-2" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Semester Details Panel */}
            {selectedSemester && (
              <div className="lg:col-span-8">
                <Card className="mb-6 shadow-2xl border-0 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-600 to-blue-600 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
                    <div className="relative z-10 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Calendar className="h-6 w-6" />
                          </div>
                          <span className="text-sm font-semibold opacity-90">Currently Viewing</span>
                        </div>
                        <h2 className="text-4xl font-bold mb-3">{selectedSemester.name}</h2>
                        <div className="flex items-center space-x-4 text-white/95 flex-wrap gap-2">
                          <span className="font-medium">{selectedSemester.semesterType} {selectedSemester.year}</span>
                          {selectedSemester.startDate && selectedSemester.endDate && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-sm">
                                {new Date(selectedSemester.startDate).toLocaleDateString()} → {new Date(selectedSemester.endDate).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-white/20 text-white border-white/40 capitalize text-lg px-4 py-2 font-bold">
                        {selectedSemester.status}
                      </Badge>
                    </div>
                  </div>
                </Card>

                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Semester Information</CardTitle>
                    <CardDescription>Overview for {selectedSemester.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {[
                        { label: 'Total Courses',     value: selectedSemester.totalCourses,  color: 'blue',   Icon: BookOpen  },
                        { label: 'Enrolled Students', value: selectedSemester.totalStudents, color: 'purple', Icon: Users     },
                        { label: 'Progress',          value: `${selectedSemester.progress}%`,color: 'green',  Icon: BarChart3 },
                      ].map(({ label, value, color, Icon }) => (
                        <div
                          key={label}
                          className={`p-6 bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-xl border-2 border-${color}-200`}
                        >
                          <Icon className={`h-8 w-8 text-${color}-600 mb-3`} />
                          <p className={`text-sm font-semibold text-${color}-800 mb-1`}>{label}</p>
                          <p className={`text-4xl font-bold text-${color}-700`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-600 mb-1">Credits Offered</p>
                            <p className="text-2xl font-bold text-gray-900">{selectedSemester.creditsOffered}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-600 mb-1">Duration</p>
                            <p className="text-lg font-bold text-gray-900">
                              {selectedSemester.startDate && selectedSemester.endDate
                                ? `${Math.ceil(
                                    (new Date(selectedSemester.endDate).getTime() - new Date(selectedSemester.startDate).getTime())
                                    / (1000 * 60 * 60 * 24 * 7)
                                  )} weeks`
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {selectedSemester.status === 'active' && (
                        <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-green-900">Semester Progress</p>
                            <span className="text-sm font-bold text-green-700">{selectedSemester.progress}%</span>
                          </div>
                          <Progress value={selectedSemester.progress} className="h-3" />
                          <p className="text-xs text-green-600 mt-2">
                            {selectedSemester.progress === 100
                              ? 'Semester completed'
                              : selectedSemester.progress === 0
                              ? 'Semester not yet started'
                              : 'Semester in progress'}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}