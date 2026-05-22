/* eslint-disable @typescript-eslint/no-unused-vars */
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Users,
  Settings,
  DollarSign,
  Calendar,
  AlertCircle,
  BarChart3,
  FileText,
  Clock,
  GraduationCap,
  Filter,
  ChevronRight,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Types
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
  totalStudents: number | null;
  totalCourses: number | null;
  color: string | null;
  avgAttendance: number | null;
  avgPerformance: number | null;
  atRiskStudents: number | null;
  feeCompliance: number | null;
  activeSemesters: string[] | null;
};

type Semester = {
  id: string;
  name: string;
  status: 'active' | 'upcoming' | 'planning';
  startDate: string | null;
  endDate: string | null;
  courses: number | null;
  students: number | null;
  progress: number | null;
};

type Course = {
  id: string;
  program_id: string;
  semester_id: string | null;
  code: string;
  name: string;
  instructor: string | null;
  students: number | null;
  section: string | null;
};

const mockEngagementMetrics = [
  { metric: 'Daily Active Users', value: '2,340', change: '+12%', trend: 'up' },
  { metric: 'Quiz Completion Rate', value: '89%', change: '+5%', trend: 'up' },
  { metric: 'Avg. Streak Length', value: '8.5 days', change: '+2.1', trend: 'up' },
  { metric: 'Assignment Submission', value: '92%', change: '-3%', trend: 'down' },
];

const mockFeeStats = [
  { label: 'Total Collection', value: '$845,430', percentage: 94 },
  { label: 'Pending Amount', value: '$52,250', percentage: 6 },
  { label: 'Overdue', value: '$8,100', percentage: 2 },
  { label: 'Installment Plans', value: '67 Active', percentage: null },
];

const mockAtRiskStudents = [
  {
    id: '1',
    name: 'Example Student A',
    program: 'BS-CS',
    semester: '5th',
    reason: 'Low Attendance (65%)',
    severity: 'high',
  },
  {
    id: '2',
    name: 'Example Student B',
    program: 'BS-EE',
    semester: '3rd',
    reason: 'Failing Grades (52%)',
    severity: 'high',
  },
  {
    id: '3',
    name: 'Example Student C',
    program: 'BBA',
    semester: '4th',
    reason: 'Missing Assignments (4)',
    severity: 'medium',
  },
];

export default function AdminProgramsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);

  const [view, setView] = useState<'programs' | 'semesters'>('programs');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load departments
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('id, name, code')
          .order('name');

        if (error) throw error;

        const deptsSafe: Department[] = (data ?? []).map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
        }));

        setDepartments(deptsSafe);
      } catch (err: any) {
        console.error('Failed to load departments', err);
      }
    };

    loadDepartments();
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        let programsQuery = supabase.from('programs').select('*');
        
        if (selectedDepartmentId && selectedDepartmentId !== 'all') {
          programsQuery = programsQuery.eq('department_id', selectedDepartmentId);
        }
        
        const { data: programsData, error: programsError } = await programsQuery;

        if (programsError) throw programsError;

        const programsSafe: Program[] = (programsData ?? []).map((p: any) => ({
          id: p.id,
          department_id: p.department_id,
          name: p.name,
          code: p.code,
          degree: p.degree,
          totalStudents: p.total_students ?? 0,
          totalCourses: p.total_courses ?? 0,
          color: p.color ?? 'bg-blue-500',
          avgAttendance: p.avg_attendance ?? 0,
          avgPerformance: p.avg_performance ?? 0,
          atRiskStudents: p.at_risk_students ?? 0,
          feeCompliance: p.fee_compliance ?? 0,
          activeSemesters: p.active_semesters ?? [],
        }));

        setPrograms(programsSafe);

        const { data: semestersData, error: semestersError } = await supabase
          .from('semesters')
          .select('*')
          .order('start_date', { ascending: false });

        if (semestersError) throw semestersError;

        const semestersSafe: Semester[] = (semestersData ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          startDate: s.start_date ?? null,
          endDate: s.end_date ?? null,
          courses: s.courses ?? 0,
          students: s.students ?? 0,
          progress: s.progress ?? 0,
        }));

        setSemesters(semestersSafe);

        if (programsSafe.length > 0) {
          const firstProgram = programsSafe[0];
          setSelectedProgram(firstProgram);

          const { data: coursesData, error: coursesError } = await supabase
            .from('courses')
            .select('*')
            .eq('program_id', firstProgram.id);

          if (coursesError) throw coursesError;

          const coursesSafe: Course[] = (coursesData ?? []).map((c: any) => ({
            id: c.id,
            program_id: c.program_id,
            semester_id: c.semester_id,
            code: c.code,
            name: c.name,
            instructor: c.instructor,
            students: c.students ?? 0,
            section: c.section,
          }));

          setCourses(coursesSafe);
        } else {
          setSelectedProgram(null);
          setCourses([]);
        }

        if (semestersSafe.length > 0) {
          setSelectedSemester(semestersSafe[0]);
        } else {
          setSelectedSemester(null);
        }
      } catch (err: any) {
        console.error('loadData error', err);
        setErrorMsg(err.message ?? 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDepartmentId]);

  const handleSelectProgram = async (program: Program) => {
    setSelectedProgram(program);

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('program_id', program.id);

    if (error) {
      console.error('Courses error', error);
      return;
    }

    const coursesSafe: Course[] = (data ?? []).map((c: any) => ({
      id: c.id,
      program_id: c.program_id,
      semester_id: c.semester_id,
      code: c.code,
      name: c.name,
      instructor: c.instructor,
      students: c.students ?? 0,
      section: c.section,
    }));

    setCourses(coursesSafe);
  };

  const handleSelectSemester = (semester: Semester) => {
    setSelectedSemester(semester);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-gray-600">Loading academic data...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center">
              <XCircle className="h-6 w-6 mr-2" />
              Failed to Load Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{errorMsg}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPrograms = programs.length;
  const totalStudents = programs.reduce((sum, p) => sum + (p.totalStudents ?? 0), 0);
  const activeSemestersCount = semesters.filter((s) => s.status === 'active').length;
  const totalAtRisk = programs.reduce((sum, p) => sum + (p.atRiskStudents ?? 0), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header with Clear Context */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Academic Management</h1>
            <p className="text-white/90">
              Manage programs, semesters, courses, and track student performance
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
              <FileText className="mr-2 h-4 w-4" />
              Export Reports
            </Button>
            <Button 
              className="bg-white text-blue-600 hover:bg-blue-50"
              onClick={() => router.push('/admin/programs/create')}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              {view === 'programs' ? 'Create Program' : 'Create Semester'}
            </Button>
          </div>
        </div>
      </div>

      {/* View Toggle with Clear Labels */}
      <Card className="shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">I want to view:</span>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <Button
                variant={view === 'programs' ? 'default' : 'outline'}
                onClick={() => setView('programs')}
                className="h-12"
              >
                <GraduationCap className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold">Programs</div>
                  <div className="text-xs opacity-80">BS, MS, PhD programs</div>
                </div>
              </Button>
              <Button
                variant={view === 'semesters' ? 'default' : 'outline'}
                onClick={() => setView('semesters')}
                className="h-12"
              >
                <Calendar className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-semibold">Semesters</div>
                  <div className="text-xs opacity-80">Fall, Spring schedules</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Filter with Clear Context */}
      {view === 'programs' && departments.length > 0 && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Filter className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <label className="text-sm font-semibold text-blue-900 mb-2 block">
                  Filter Programs by Department
                </label>
                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                  <SelectTrigger className="w-full md:w-[400px] bg-white">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="font-medium">All Departments</span>
                      <span className="text-gray-500 ml-2">({totalPrograms} programs)</span>
                    </SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats with Icons and Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Programs</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">{totalPrograms}</p>
                <p className="text-xs text-gray-500 mt-1">Active academic programs</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-xl">
                <GraduationCap className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">{totalStudents}</p>
                <p className="text-xs text-gray-500 mt-1">Enrolled students</p>
              </div>
              <div className="p-4 bg-purple-100 rounded-xl">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Semesters</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">{activeSemestersCount}</p>
                <p className="text-xs text-gray-500 mt-1">Currently running</p>
              </div>
              <div className="p-4 bg-green-100 rounded-xl">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">At-Risk Students</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">{totalAtRisk}</p>
                <p className="text-xs text-red-600 mt-1">Need attention</p>
              </div>
              <div className="p-4 bg-red-100 rounded-xl">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programs View */}
      {view === 'programs' && (
        <>
          {programs.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Programs Found
                </h3>
                <p className="text-gray-600 mb-6">
                  {selectedDepartmentId !== 'all'
                    ? 'This department has no programs yet. Try selecting "All Departments" or create a new program.'
                    : 'Get started by creating your first academic program.'}
                </p>
                <Button size="lg" onClick={() => router.push('/admin/programs/create')}>
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Create Your First Program
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Program Selection Panel - Enhanced */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="sticky top-6 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Select a Program</CardTitle>
                        <CardDescription>Click to view details</CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-sm">
                        {programs.length} total
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 max-h-[600px] overflow-y-auto">
                    <div className="space-y-3">
                      {programs.map((program) => (
                        <Card
                          key={program.id}
                          className={`cursor-pointer transition-all ${
                            selectedProgram?.id === program.id
                              ? 'ring-2 ring-blue-500 bg-blue-50 shadow-md scale-[1.02]'
                              : 'hover:shadow-md hover:bg-gray-50'
                          }`}
                          onClick={() => handleSelectProgram(program)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start space-x-3 flex-1">
                                <div className={`w-4 h-4 rounded-full mt-1 ${program.color} flex-shrink-0`} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 truncate">{program.name}</p>
                                  <p className="text-sm text-gray-600">{program.code}</p>
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {program.degree}
                                  </Badge>
                                </div>
                              </div>
                              {selectedProgram?.id === program.id && (
                                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <p className="text-xs text-gray-600">Students</p>
                                <p className="font-bold text-blue-600">{program.totalStudents ?? 0}</p>
                              </div>
                              <div className="text-center p-2 bg-purple-50 rounded">
                                <p className="text-xs text-gray-600">Courses</p>
                                <p className="font-bold text-purple-600">{program.totalCourses ?? 0}</p>
                              </div>
                            </div>
                            
                            {(program.atRiskStudents ?? 0) > 0 && (
                              <div className="mt-2 p-2 bg-red-50 rounded flex items-center justify-between">
                                <span className="text-xs text-red-700 font-medium">At Risk</span>
                                <Badge variant="destructive" className="text-xs">
                                  {program.atRiskStudents}
                                </Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Program Details Panel - Enhanced */}
              {selectedProgram && (
                <div className="lg:col-span-8">
                  {/* Selected Program Header */}
                  <Card className="mb-6 shadow-lg border-0 overflow-hidden">
                    <div className={`${selectedProgram.color} p-6 text-white`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Award className="h-6 w-6" />
                            <span className="text-sm font-medium opacity-90">Currently Viewing</span>
                          </div>
                          <h2 className="text-3xl font-bold mb-2">{selectedProgram.name}</h2>
                          <div className="flex items-center space-x-4 text-white/90">
                            <span className="flex items-center">
                              <span className="font-medium">{selectedProgram.code}</span>
                            </span>
                            <span>•</span>
                            <span>{selectedProgram.degree}</span>
                          </div>
                        </div>
                        <div className="text-right bg-white/20 rounded-lg p-4">
                          <div className="text-4xl font-bold">{selectedProgram.totalStudents ?? 0}</div>
                          <div className="text-sm opacity-90">Students Enrolled</div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Tabs with Better Labels */}
                  <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-gray-100">
                      <TabsTrigger value="overview" className="flex flex-col items-center py-3">
                        <BarChart3 className="h-5 w-5 mb-1" />
                        <span className="text-xs font-medium">Overview</span>
                      </TabsTrigger>
                      <TabsTrigger value="courses" className="flex flex-col items-center py-3">
                        <BookOpen className="h-5 w-5 mb-1" />
                        <span className="text-xs font-medium">Courses</span>
                      </TabsTrigger>
                      <TabsTrigger value="students" className="flex flex-col items-center py-3">
                        <Users className="h-5 w-5 mb-1" />
                        <span className="text-xs font-medium">Students</span>
                      </TabsTrigger>
                      <TabsTrigger value="fees" className="flex flex-col items-center py-3">
                        <DollarSign className="h-5 w-5 mb-1" />
                        <span className="text-xs font-medium">Fees</span>
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="flex flex-col items-center py-3">
                        <Settings className="h-5 w-5 mb-1" />
                        <span className="text-xs font-medium">Settings</span>
                      </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-l-4 border-l-green-500">
                          <CardContent className="pt-6">
                            <p className="text-sm font-medium text-gray-600 mb-1">Avg Attendance</p>
                            <p className="text-3xl font-bold text-gray-900 mb-2">
                              {selectedProgram.avgAttendance ?? 0}%
                            </p>
                            <Progress value={selectedProgram.avgAttendance ?? 0} className="h-2 mb-1" />
                            <p className="text-xs text-green-600 flex items-center">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Good performance
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-6">
                            <p className="text-sm font-medium text-gray-600 mb-1">Avg Performance</p>
                            <p className="text-3xl font-bold text-gray-900 mb-2">
                              {selectedProgram.avgPerformance ?? 0}%
                            </p>
                            <Progress value={selectedProgram.avgPerformance ?? 0} className="h-2 mb-1" />
                            <p className="text-xs text-blue-600 flex items-center">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Academic scores
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-purple-500">
                          <CardContent className="pt-6">
                            <p className="text-sm font-medium text-gray-600 mb-1">Fee Compliance</p>
                            <p className="text-3xl font-bold text-gray-900 mb-2">
                              {selectedProgram.feeCompliance ?? 0}%
                            </p>
                            <Progress value={selectedProgram.feeCompliance ?? 0} className="h-2 mb-1" />
                            <p className="text-xs text-purple-600 flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Payment rate
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-red-500">
                          <CardContent className="pt-6">
                            <p className="text-sm font-medium text-gray-600 mb-1">At-Risk Students</p>
                            <p className="text-3xl font-bold text-gray-900 mb-2">
                              {selectedProgram.atRiskStudents ?? 0}
                            </p>
                            {(selectedProgram.atRiskStudents ?? 0) > 0 ? (
                              <>
                                <Progress value={((selectedProgram.atRiskStudents ?? 0) / (selectedProgram.totalStudents ?? 1)) * 100} className="h-2 mb-1 bg-red-100" />
                                <p className="text-xs text-red-600 flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Need intervention
                                </p>
                              </>
                            ) : (
                              <Badge variant="secondary" className="bg-green-50 text-green-700">
                                All Good
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Rest of Overview Content */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Active Semesters for {selectedProgram.name}</CardTitle>
                          <CardDescription>
                            Currently running semesters in this program
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {(selectedProgram.activeSemesters ?? []).length > 0 ? (
                            <div className="space-y-3">
                              {(selectedProgram.activeSemesters ?? []).map((sem, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                      <Calendar className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">{sem}</p>
                                      <p className="text-sm text-gray-600">In Progress</p>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="outline">
                                    View Details
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center text-gray-500 py-8">
                              No active semesters for this program
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Courses Tab */}
                    <TabsContent value="courses">
                      <Card>
                        <CardHeader>
                          <CardTitle>Courses in {selectedProgram.name}</CardTitle>
                          <CardDescription>
                            All courses offered under this program
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {courses.length > 0 ? (
                            <div className="space-y-3">
                              {courses.map((course) => (
                                <div
                                  key={course.id}
                                  className="flex items-center justify-between p-4 border-2 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
                                >
                                  <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                      <BookOpen className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {course.code} - {course.name}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Section {course.section ?? 'N/A'} • {course.instructor ?? 'TBA'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                      {course.students ?? 0} students
                                    </Badge>
                                    <Button size="sm" variant="outline">
                                      Details
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-600">No courses found for this program</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Students Tab */}
                    <TabsContent value="students">
                      <Card>
                        <CardHeader>
                          <CardTitle>Student Overview</CardTitle>
                          <CardDescription>Performance and risk analysis</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-green-800">High Performers</p>
                                <TrendingUp className="h-5 w-5 text-green-600" />
                              </div>
                              <p className="text-3xl font-bold text-green-700">124</p>
                              <p className="text-xs text-green-600 mt-1">&gt;85% average</p>
                            </div>
                            <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border-2 border-yellow-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-yellow-800">Average</p>
                                <BarChart3 className="h-5 w-5 text-yellow-600" />
                              </div>
                              <p className="text-3xl font-bold text-yellow-700">172</p>
                              <p className="text-xs text-yellow-600 mt-1">60-85% average</p>
                            </div>
                            <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border-2 border-red-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-red-800">At-Risk</p>
                                <AlertCircle className="h-5 w-5 text-red-600" />
                              </div>
                              <p className="text-3xl font-bold text-red-700">{selectedProgram.atRiskStudents ?? 0}</p>
                              <p className="text-xs text-red-600 mt-1">&lt;60% average</p>
                            </div>
                          </div>

                          {(selectedProgram.atRiskStudents ?? 0) > 0 && (
                            <div>
                              <h4 className="font-semibold text-lg mb-4 flex items-center">
                                <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
                                Students Needing Attention
                              </h4>
                              <div className="space-y-3">
                                {mockAtRiskStudents
                                  .filter((s) => s.program === selectedProgram.code)
                                  .map((student) => (
                                    <div
                                      key={student.id}
                                      className="flex items-center justify-between p-4 bg-red-50 rounded-lg border-2 border-red-200 hover:bg-red-100 transition-colors"
                                    >
                                      <div className="flex items-center space-x-4">
                                        <div className={`w-3 h-3 rounded-full ${student.severity === 'high' ? 'bg-red-600 animate-pulse' : 'bg-orange-600'}`} />
                                        <div>
                                          <p className="font-semibold text-gray-900">{student.name}</p>
                                          <p className="text-sm text-gray-600">
                                            {student.semester} Semester • {student.reason}
                                          </p>
                                        </div>
                                      </div>
                                      <Button size="sm" variant="outline">
                                        View Profile
                                      </Button>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Fees Tab */}
                    <TabsContent value="fees">
                      <Card>
                        <CardHeader>
                          <CardTitle>Fee Collection Status</CardTitle>
                          <CardDescription>Track payments for {selectedProgram.name} students</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {mockFeeStats.map((stat, idx) => (
                              <div key={idx} className="p-4 border-2 rounded-lg bg-gradient-to-br from-gray-50 to-white">
                                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                                <p className="text-2xl font-bold mt-2 text-gray-900">{stat.value}</p>
                                {stat.percentage !== null && (
                                  <Progress value={stat.percentage} className="h-2 mt-3" />
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-lg mb-2 flex items-center text-orange-900">
                                  <Clock className="h-5 w-5 mr-2 text-orange-600" />
                                  Pending Approvals
                                </h4>
                                <p className="text-gray-700 mb-4">
                                  18 students have pending installment plan requests
                                </p>
                                <Button size="sm" variant="default" className="bg-orange-600 hover:bg-orange-700">
                                  Review Requests
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </div>
                              <Badge variant="secondary" className="text-lg px-3 py-1">18</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings">
                      <Card>
                        <CardHeader>
                          <CardTitle>Program Configuration</CardTitle>
                          <CardDescription>View and modify program settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <label className="text-sm font-semibold text-gray-700">Program Code</label>
                              <p className="text-lg font-medium mt-1">{selectedProgram.code}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <label className="text-sm font-semibold text-gray-700">Degree Type</label>
                              <p className="text-lg font-medium mt-1">{selectedProgram.degree}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <label className="text-sm font-semibold text-gray-700">Total Credits Required</label>
                              <p className="text-lg font-medium mt-1">132 Credits</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <label className="text-sm font-semibold text-gray-700">Program Duration</label>
                              <p className="text-lg font-medium mt-1">4 Years (8 Semesters)</p>
                            </div>
                          </div>

                          <div className="pt-6 border-t">
                            <h4 className="font-semibold text-lg mb-4">Academic Requirements</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <span className="font-medium text-gray-700">Minimum CGPA</span>
                                <span className="text-xl font-bold text-blue-600">2.5</span>
                              </div>
                              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <span className="font-medium text-gray-700">Maximum Semester Load</span>
                                <span className="text-xl font-bold text-purple-600">21 Credits</span>
                              </div>
                              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                                <span className="font-medium text-gray-700">Attendance Requirement</span>
                                <span className="text-xl font-bold text-green-600">75%</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-6 border-t flex justify-between items-center">
                            <Button variant="outline" size="lg">
                              <Settings className="mr-2 h-4 w-4" />
                              Edit Program
                            </Button>
                            <Button variant="destructive" size="lg">
                              Archive Program
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Semesters View - Similar enhancements */}
      {view === 'semesters' && (
        <>
          {semesters.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Semesters Found
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your first semester to start organizing courses and schedules.
                </p>
                <Button size="lg">
                  <Calendar className="mr-2 h-5 w-5" />
                  Create Your First Semester
                </Button>
              </CardContent>
            </Card>
          ) : (
            selectedSemester && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Semester Selection Panel */}
                <div className="lg:col-span-4 space-y-4">
                  <Card className="sticky top-6 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Select a Semester</CardTitle>
                          <CardDescription>Click to view schedule</CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-sm">
                          {semesters.length} total
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 max-h-[600px] overflow-y-auto">
                      <div className="space-y-3">
                        {semesters.map((semester) => (
                          <Card
                            key={semester.id}
                            className={`cursor-pointer transition-all ${
                              selectedSemester.id === semester.id
                                ? 'ring-2 ring-green-500 bg-green-50 shadow-md scale-[1.02]'
                                : 'hover:shadow-md hover:bg-gray-50'
                            }`}
                            onClick={() => handleSelectSemester(semester)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">{semester.name}</p>
                                  <Badge
                                    variant={
                                      semester.status === 'active'
                                        ? 'default'
                                        : semester.status === 'upcoming'
                                        ? 'secondary'
                                        : 'outline'
                                    }
                                    className="mt-2 capitalize"
                                  >
                                    {semester.status}
                                  </Badge>
                                </div>
                                {selectedSemester.id === semester.id && (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                                <div className="text-center p-2 bg-blue-50 rounded">
                                  <p className="text-xs text-gray-600">Courses</p>
                                  <p className="font-bold text-blue-600">{semester.courses ?? 0}</p>
                                </div>
                                <div className="text-center p-2 bg-purple-50 rounded">
                                  <p className="text-xs text-gray-600">Students</p>
                                  <p className="font-bold text-purple-600">{semester.students ?? 0}</p>
                                </div>
                              </div>

                              {semester.status === 'active' && (
                                <div className="mt-3">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-gray-600">Progress</span>
                                    <span className="text-xs font-bold text-gray-900">{semester.progress ?? 0}%</span>
                                  </div>
                                  <Progress value={semester.progress ?? 0} className="h-2" />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Semester Details Panel */}
                <div className="lg:col-span-8">
                  <Card className="mb-6 shadow-lg border-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Calendar className="h-6 w-6" />
                            <span className="text-sm font-medium opacity-90">Currently Viewing</span>
                          </div>
                          <h2 className="text-3xl font-bold mb-2">{selectedSemester.name}</h2>
                          <div className="flex items-center space-x-4 text-white/90">
                            <span>{selectedSemester.startDate}</span>
                            <span>→</span>
                            <span>{selectedSemester.endDate}</span>
                          </div>
                        </div>
                        <Badge
                          variant={selectedSemester.status === 'active' ? 'default' : 'secondary'}
                          className="bg-white/20 text-white border-white/40 capitalize text-lg px-4 py-2"
                        >
                          {selectedSemester.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Semester Information</CardTitle>
                      <CardDescription>Overview and key metrics for {selectedSemester.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200">
                          <BookOpen className="h-8 w-8 text-blue-600 mb-3" />
                          <p className="text-sm font-medium text-blue-800 mb-1">Total Courses</p>
                          <p className="text-3xl font-bold text-blue-700">{selectedSemester.courses ?? 0}</p>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200">
                          <Users className="h-8 w-8 text-purple-600 mb-3" />
                          <p className="text-sm font-medium text-purple-800 mb-1">Enrolled Students</p>
                          <p className="text-3xl font-bold text-purple-700">{selectedSemester.students ?? 0}</p>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200">
                          <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
                          <p className="text-sm font-medium text-green-800 mb-1">Progress</p>
                          <p className="text-3xl font-bold text-green-700">{selectedSemester.progress ?? 0}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}