/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  RefreshCw,
  GraduationCap,
  AlertCircle,
  BookOpen,
  Users,
  Calendar,
  Search,
  Eye,
  Plus,
} from 'lucide-react';
import { getCurrentUser, logout, User } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';

// Types
type Department = {
  id: string;
  name: string;
  code: string;
  hod_id: string | null;
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
  program_id: string;
  semester_type: string;
  year: number;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  total_courses: number;
  total_students: number;
  credits_offered: number;
};

type Course = {
  id: string;
  program_id: string;
  semester_id: string | null;
  department_id: string;
  code: string;
  name: string;
  instructor: string | null;
  students: number;
  section: string | null;
  credits: number;
  semester: number;
  teacher_id: string | null;
};

export default function HoDProgramsPage() {
  const router = useRouter();
  
  // Auth & Department state
  const [user, setUser] = useState<User | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [programs, setPrograms] = useState<Program[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  
  // Form state for course creation
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    credits: 3,
    semester_number: 1,
    instructor: '',
    section: '',
    description: '',
  });

  // Initialize page
  useEffect(() => {
    initializePage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializePage = async () => {
    try {
      setLoading(true);
      
      const currentUser = getCurrentUser();
      
      if (!currentUser) {
        router.push('/login');
        return;
      }
      
      if (currentUser.role !== 'hod' && currentUser.role !== 'admin') {
        setError('You do not have access to this page. HoD or Admin role required.');
        setLoading(false);
        return;
      }
      
      setUser(currentUser);
      
      console.log('Current User:', {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role
      });
      
      // Get user's department
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('hod_id', currentUser.id)
        .maybeSingle();
      
      if (deptError) {
        console.error('Department fetch error:', deptError);
        
        if (currentUser.role === 'admin') {
          setLoading(false);
          return;
        }
        
        setError('Failed to load department information.');
        setLoading(false);
        return;
      }
      
      if (!deptData) {
        if (currentUser.role === 'admin') {
          setDepartment(null);
          setLoading(false);
          return;
        }
        
        // Try to find and auto-assign department
        const { data: unassignedDept } = await supabase
          .from('departments')
          .select('*')
          .is('hod_id', null)
          .limit(1)
          .single();
        
        if (unassignedDept) {
          // Auto-assign this HoD to unassigned department
          const { error: updateError } = await supabase
            .from('departments')
            .update({ hod_id: currentUser.id })
            .eq('id', unassignedDept.id);
          
          if (!updateError) {
            setDepartment({ ...unassignedDept, hod_id: currentUser.id });
            await loadPrograms(unassignedDept.id);
            setLoading(false);
            return;
          }
        }
        
        setError(`You are not assigned to any department. 
          Please contact the administrator to assign you as Head of Department.
          Your User ID: ${currentUser.id}`);
        setLoading(false);
        return;
      }
      
      console.log('Department found:', deptData);
      setDepartment(deptData);
      await loadPrograms(deptData.id);
      setLoading(false);
    } catch (err: any) {
      console.error('Initialization error:', err);
      setError('Failed to initialize page. Please try refreshing.');
      setLoading(false);
    }
  };

  const loadPrograms = async (deptId: string) => {
    try {
      setLoadingPrograms(true);
      
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('*')
        .eq('department_id', deptId)
        .order('name');
      
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
      
      if (programsSafe.length > 0) {
        setSelectedProgram(programsSafe[0]);
        loadSemesters(programsSafe[0].id);
        loadCourses(programsSafe[0].id, deptId);
      }
      
      setLoadingPrograms(false);
    } catch (err: any) {
      console.error('Failed to load programs:', err);
      setLoadingPrograms(false);
    }
  };

  const loadSemesters = async (programId: string) => {
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('program_id', programId)
        .order('year', { ascending: false })
        .order('semester_type');
      
      if (error) throw error;
      
      const semestersSafe: Semester[] = (data ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        program_id: s.program_id,
        semester_type: s.semester_type,
        year: s.year,
        start_date: s.start_date,
        end_date: s.end_date,
        status: s.status,
        total_courses: s.total_courses ?? 0,
        total_students: s.total_students ?? 0,
        credits_offered: s.credits_offered ?? 0,
      }));
      
      setSemesters(semestersSafe);
    } catch (err: any) {
      console.error('Failed to load semesters:', err);
    }
  };

  const loadCourses = async (programId: string, deptId: string) => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('program_id', programId)
        .eq('department_id', deptId)
        .order('semester')
        .order('name');
      
      if (error) throw error;
      
      const coursesSafe: Course[] = (data ?? []).map((c: any) => ({
        id: c.id,
        program_id: c.program_id,
        semester_id: c.semester_id,
        department_id: c.department_id,
        code: c.code,
        name: c.name,
        instructor: c.instructor,
        students: c.students ?? 0,
        section: c.section,
        credits: c.credits,
        semester: c.semester,
        teacher_id: c.teacher_id,
      }));
      
      setCourses(coursesSafe);
    } catch (err: any) {
      console.error('Failed to load courses:', err);
    }
  };

  const handleProgramSelect = (program: Program) => {
    setSelectedProgram(program);
    if (program.department_id) {
      loadSemesters(program.id);
      loadCourses(program.id, program.department_id);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Handle create course
  const handleCreateCourse = async () => {
    if (!selectedProgram || !department) return;
    setFormErrors({});
    
    const errors: Record<string, string> = {};
    if (!courseForm.name.trim()) errors.name = 'Course name is required';
    if (!courseForm.code.trim()) errors.code = 'Course code is required';
    if (courseForm.credits < 1) errors.credits = 'Credits must be at least 1';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([{
          name: courseForm.name.trim(),
          code: courseForm.code.trim().toUpperCase(),
          credits: courseForm.credits,
          semester: courseForm.semester_number,
          instructor: courseForm.instructor || null,
          section: courseForm.section || null,
          description: courseForm.description || null,
          program_id: selectedProgram.id,
          department_id: department.id,
          students: 0,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      const newCourse: Course = {
        id: data.id,
        program_id: data.program_id,
        semester_id: data.semester_id,
        department_id: data.department_id,
        code: data.code,
        name: data.name,
        instructor: data.instructor,
        students: data.students ?? 0,
        section: data.section,
        credits: data.credits,
        semester: data.semester,
        teacher_id: data.teacher_id,
      };
      
      setCourses(prev => [...prev, newCourse]);
      setShowCreateCourse(false);
      resetCourseForm();
      
      // Update total courses count in programs
      const newTotal = courses.length + 1;
      await supabase
        .from('programs')
        .update({ total_courses: newTotal })
        .eq('id', selectedProgram.id);
      
      setPrograms(prev => prev.map(p => 
        p.id === selectedProgram.id ? { ...p, totalCourses: newTotal } : p
      ));
    } catch (err: any) {
      console.error('Failed to create course:', err);
      if (err.code === '23505') {
        setFormErrors({ code: 'A course with this code already exists' });
      } else {
        setFormErrors({ submit: err.message || 'Failed to create course' });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const resetCourseForm = () => {
    setCourseForm({ name: '', code: '', credits: 3, semester_number: 1, instructor: '', section: '', description: '' });
    setFormErrors({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'upcoming': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         program.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (course.instructor && course.instructor.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const departmentStats = [
    { label: 'Total Programs', value: programs.length, icon: GraduationCap, color: 'blue' },
    { label: 'Total Students', value: programs.reduce((sum, p) => sum + p.totalStudents, 0), icon: Users, color: 'green' },
    { label: 'Total Courses', value: programs.reduce((sum, p) => sum + p.totalCourses, 0), icon: BookOpen, color: 'purple' },
    // { label: 'Active Semesters', value: semesters.filter(s => s.status === 'active').length, icon: Calendar, color: 'orange' },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-xl text-gray-600 mb-2">Loading your dashboard...</p>
          <p className="text-sm text-gray-400">Please wait while we set things up</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-white">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={handleRefresh} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main content
  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Programs & Courses Management</h1>
            <p className="text-blue-100">
              {department ? `${department.name} (${department.code}) - Head of Department` : 'Admin View - All Programs'}
            </p>
          </div>
        </div>
      </div>

      {/* Department Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departmentStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Program List Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-gray-900">Programs</CardTitle>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">{programs.length} total</Badge>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search programs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-gray-200"
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              {loadingPrograms ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Loading programs...</p>
                </div>
              ) : filteredPrograms.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No programs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPrograms.map((program) => (
                    <Card
                      key={program.id}
                      className={`cursor-pointer transition-all bg-white ${
                        selectedProgram?.id === program.id
                          ? 'ring-2 ring-blue-500 bg-blue-50 shadow-md'
                          : 'hover:shadow-md hover:bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => handleProgramSelect(program)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${program.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{program.name}</p>
                            <p className="text-sm text-gray-500">{program.code}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs border-gray-200 text-gray-600">
                                {program.totalStudents} Students
                              </Badge>
                              <Badge variant="outline" className="text-xs border-gray-200 text-gray-600">
                                {program.totalCourses} Courses
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Program Details */}
        <div className="lg:col-span-8">
          {selectedProgram ? (
            <div className="space-y-6">
              {/* Program Header */}
              <Card className="border-0 shadow-lg overflow-hidden bg-white">
                <div className={`${selectedProgram.color} p-6 text-white`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedProgram.name}</h2>
                      <p className="text-white/90">{selectedProgram.code} • {selectedProgram.degree}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="overview">
                <TabsList className="grid grid-cols-2 w-full bg-white border border-gray-200 rounded-lg p-1">
                  {/* <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
                    Overview
                  </TabsTrigger> */}
                  <TabsTrigger value="courses" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
                    Courses
                  </TabsTrigger>
                  {/* <TabsTrigger value="semesters" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
                    Semesters
                  </TabsTrigger> */}
                  <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
                    Analytics
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-500">Avg Attendance</p>
                        <p className="text-2xl font-bold text-gray-900">{selectedProgram.avgAttendance}%</p>
                        <Progress value={selectedProgram.avgAttendance} className="h-2 mt-2" />
                      </CardContent>
                    </Card>
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-500">Avg Performance</p>
                        <p className="text-2xl font-bold text-gray-900">{selectedProgram.avgPerformance}%</p>
                        <Progress value={selectedProgram.avgPerformance} className="h-2 mt-2" />
                      </CardContent>
                    </Card>
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-500">Fee Compliance</p>
                        <p className="text-2xl font-bold text-gray-900">{selectedProgram.feeCompliance}%</p>
                        <Progress value={selectedProgram.feeCompliance} className="h-2 mt-2" />
                      </CardContent>
                    </Card>
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-500">At-Risk Students</p>
                        <p className="text-2xl font-bold text-red-600">{selectedProgram.atRiskStudents}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* {semesters.length > 0 && (
                    <Card className="bg-white border border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-gray-900">Active Semesters</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {semesters.filter(s => s.status === 'active').map((sem) => (
                            <div key={sem.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                              <div>
                                <p className="font-semibold text-gray-900">{sem.name}</p>
                                <p className="text-sm text-gray-600">{sem.start_date} to {sem.end_date}</p>
                              </div>
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            </div>
                          ))}
                          {semesters.filter(s => s.status === 'active').length === 0 && (
                            <p className="text-gray-500 text-center py-4">No active semesters</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )} */}
                </TabsContent>

                {/* Courses Tab */}
                <TabsContent value="courses" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Input
                      placeholder="Search courses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm bg-white border-gray-200"
                    />
                    {department && (
                      <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
                        <DialogTrigger asChild>
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Course
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] bg-white">
                          <DialogHeader>
                            <DialogTitle className="text-gray-900">Add New Course</DialogTitle>
                            <DialogDescription className="text-gray-600">
                              Add a course to {selectedProgram?.name || 'selected program'}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="courseName" className="text-gray-700">Course Name *</Label>
                                <Input
                                  id="courseName"
                                  value={courseForm.name}
                                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                                  placeholder="e.g., Data Structures"
                                  className="bg-white border-gray-200"
                                />
                                {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="courseCode" className="text-gray-700">Course Code *</Label>
                                <Input
                                  id="courseCode"
                                  value={courseForm.code}
                                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                                  placeholder="e.g., CS-201"
                                  className="bg-white border-gray-200"
                                />
                                {formErrors.code && <p className="text-sm text-red-500">{formErrors.code}</p>}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="credits" className="text-gray-700">Credits *</Label>
                                <Input
                                  id="credits"
                                  type="number"
                                  min="1"
                                  max="6"
                                  value={courseForm.credits}
                                  onChange={(e) => setCourseForm({ ...courseForm, credits: parseInt(e.target.value) || 0 })}
                                  className="bg-white border-gray-200"
                                />
                                {formErrors.credits && <p className="text-sm text-red-500">{formErrors.credits}</p>}
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="semester" className="text-gray-700">Semester Number</Label>
                                <Select 
                                  value={courseForm.semester_number.toString()} 
                                  onValueChange={(v) => setCourseForm({ ...courseForm, semester_number: parseInt(v) })}
                                >
                                  <SelectTrigger className="bg-white border-gray-200">
                                    <SelectValue placeholder="Select semester" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-gray-200">
                                    {[1,2,3,4,5,6,7,8].map((sem) => (
                                      <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="instructor" className="text-gray-700">Instructor</Label>
                                <Input
                                  id="instructor"
                                  value={courseForm.instructor}
                                  onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                                  placeholder="e.g., Dr. Smith"
                                  className="bg-white border-gray-200"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="section" className="text-gray-700">Section</Label>
                                <Input
                                  id="section"
                                  value={courseForm.section}
                                  onChange={(e) => setCourseForm({ ...courseForm, section: e.target.value })}
                                  placeholder="e.g., A"
                                  className="bg-white border-gray-200"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="description" className="text-gray-700">Description</Label>
                              <Textarea
                                id="description"
                                value={courseForm.description}
                                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                                placeholder="Course description..."
                                rows={3}
                                className="bg-white border-gray-200"
                              />
                            </div>
                            {formErrors.submit && (
                              <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                                {formErrors.submit}
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => { setShowCreateCourse(false); resetCourseForm(); }}
                              className="border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleCreateCourse} 
                              disabled={formLoading}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Add Course
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {filteredCourses.length === 0 ? (
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="text-center py-12">
                        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No courses found</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filteredCourses.map((course) => (
                        <Card key={course.id} className="hover:shadow-md transition-shadow bg-white border border-gray-200">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <BookOpen className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                                    <Badge variant="outline" className="border-gray-200 text-gray-600">{course.code}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Semester {course.semester} • {course.credits} Credits
                                    {course.section && ` • Section ${course.section}`}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Instructor: {course.instructor || 'TBA'}
                                  </p>
                                  <div className="flex gap-2 mt-2">
                                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">{course.students} Students</Badge>
                                  </div>
                                </div>
                              </div>
                             <Button
  size="sm"
  variant="outline"
  className="border-gray-200 text-gray-600 hover:bg-gray-50"
  onClick={() => router.push(`/hod/programs/courses/${course.id}`)}
>
  <Eye className="h-4 w-4 mr-1" />
  View
</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Semesters Tab */}
                {/* <TabsContent value="semesters" className="space-y-4 mt-4">
                  {semesters.length === 0 ? (
                    <Card className="bg-white border border-gray-200">
                      <CardContent className="text-center py-12">
                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No semesters configured for this program</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {semesters.map((semester) => (
                        <Card key={semester.id} className="hover:shadow-md transition-shadow bg-white border border-gray-200">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold text-gray-900">{semester.name}</h3>
                                  <Badge className={getStatusColor(semester.status)}>
                                    {semester.status.charAt(0).toUpperCase() + semester.status.slice(1)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {new Date(semester.start_date).toLocaleDateString()} to {new Date(semester.end_date).toLocaleDateString()}
                                </p>
                                <div className="flex gap-3 mt-2">
                                  <span className="text-sm text-gray-600">{semester.total_courses} Courses</span>
                                  <span className="text-sm text-gray-600">{semester.total_students} Students</span>
                                  <span className="text-sm text-gray-600">{semester.credits_offered} Credits</span>
                                </div>
                              </div>
                              <Button size="sm" variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50">
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent> */}

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-4 mt-4">
                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Program Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Attendance</span>
                            <span className="text-sm font-bold text-gray-900">{selectedProgram.avgAttendance}%</span>
                          </div>
                          <Progress value={selectedProgram.avgAttendance} className="h-3" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Academic Performance</span>
                            <span className="text-sm font-bold text-gray-900">{selectedProgram.avgPerformance}%</span>
                          </div>
                          <Progress value={selectedProgram.avgPerformance} className="h-3" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Fee Compliance</span>
                            <span className="text-sm font-bold text-gray-900">{selectedProgram.feeCompliance}%</span>
                          </div>
                          <Progress value={selectedProgram.feeCompliance} className="h-3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="text-center py-16">
                <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {programs.length === 0 ? 'No Programs Yet' : 'Select a Program'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {programs.length === 0 
                    ? 'There are no programs available for your department yet.'
                    : 'Choose a program from the list to view its details.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

