/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth';
import { toast } from 'sonner';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  BookOpen,
  Plus,
  Search,
  GraduationCap,
  Building2,
  Calendar,
  Hash,
  Loader2,
  Trash2,
  Edit,
  Eye,
  ArrowRight,
  Users,
  FileText,
  Brain,
  Clock,
  TrendingUp,
  BookMarked,
  Award,
  Filter,
  BarChart3,
} from 'lucide-react';

type Department = {
  id: string;
  name: string;
  code: string;
};

type Program = {
  id: string;
  name: string;
  code: string;
  department_id: string;
};

type Teacher = {
  id: string;
  full_name: string;
  email: string;
};

type Course = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  department_id: string;
  program_id: string | null;
  teacher_id: string | null;
  credits: number;
  semester: number;
  section: string | null;
  instructor: string | null;
  students: number | null;
  slug: string;
  created_at: string;
};

type CourseStats = {
  course_id: string;
  student_count: number;
  lesson_count: number;
  quiz_count: number;
  total_duration: number;
};

type EnrichedCourse = Course & {
  stats: CourseStats;
  teacher?: Teacher;
};

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<EnrichedCourse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all base data
      const [deptRes, programRes, courseRes, teacherRes] = await Promise.all([
        supabase
          .from('departments')
          .select('id, name, code')
          .order('name', { ascending: true }),
        supabase
          .from('programs')
          .select('id, name, code, department_id')
          .order('name', { ascending: true }),
        supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id, full_name, email')
          .eq('role', 'teacher')
          .order('full_name', { ascending: true }),
      ]);

      if (deptRes.error) throw deptRes.error;
      if (programRes.error) throw programRes.error;
      if (courseRes.error) throw courseRes.error;
      if (teacherRes.error) throw teacherRes.error;

      setDepartments((deptRes.data || []) as Department[]);
      setPrograms((programRes.data || []) as Program[]);
      setTeachers((teacherRes.data || []) as Teacher[]);

      const coursesData = courseRes.data || [];

      // Get course IDs
      const courseIds = coursesData.map((c: Course) => c.id);

      if (courseIds.length === 0) {
        setCourses([]);
        return;
      }

      // Fetch stats for all courses in parallel
      const [enrollmentsRes, lessonsRes, quizzesRes] = await Promise.all([
        supabase
          .from('student_courses')
          .select('course_id')
          .in('course_id', courseIds),
        supabase
          .from('lessons')
          .select('course_id, duration_minutes')
          .in('course_id', courseIds),
        supabase
          .from('quizzes')
          .select('course_id')
          .in('course_id', courseIds),
      ]);

      if (enrollmentsRes.error) console.error('Enrollments error:', enrollmentsRes.error);
      if (lessonsRes.error) console.error('Lessons error:', lessonsRes.error);
      if (quizzesRes.error) console.error('Quizzes error:', quizzesRes.error);

      // Calculate stats for each course
      const courseStatsMap = new Map<string, CourseStats>();

      coursesData.forEach((course: Course) => {
        const studentCount = (enrollmentsRes.data || []).filter(
          (e: any) => e.course_id === course.id
        ).length;

        const courseLessons = (lessonsRes.data || []).filter(
          (l: any) => l.course_id === course.id
        );
        const lessonCount = courseLessons.length;
        const totalDuration = courseLessons.reduce(
          (sum: number, l: any) => sum + (l.duration_minutes || 0),
          0
        );

        const quizCount = (quizzesRes.data || []).filter(
          (q: any) => q.course_id === course.id
        ).length;

        courseStatsMap.set(course.id, {
          course_id: course.id,
          student_count: studentCount,
          lesson_count: lessonCount,
          quiz_count: quizCount,
          total_duration: totalDuration,
        });
      });

      // Enrich courses with stats and teacher info
      const enrichedCourses: EnrichedCourse[] = coursesData.map((course: Course) => {
        const stats = courseStatsMap.get(course.id) || {
          course_id: course.id,
          student_count: 0,
          lesson_count: 0,
          quiz_count: 0,
          total_duration: 0,
        };

        const teacher = course.teacher_id
          ? teacherRes.data?.find((t: Teacher) => t.id === course.teacher_id)
          : undefined;

        return {
          ...course,
          stats,
          teacher,
        };
      });

      setCourses(enrichedCourses);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load courses');
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const getDepartment = (id: string) =>
    departments.find((d) => d.id === id) || null;

  const getProgram = (id: string | null) =>
    programs.find((p) => p.id === id) || null;

  const filteredCourses = useMemo(() => {
    const q = search.toLowerCase().trim();
    return courses.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        (c.section ?? '').toLowerCase().includes(q) ||
        (c.instructor ?? '').toLowerCase().includes(q) ||
        (c.teacher?.full_name ?? '').toLowerCase().includes(q);

      const matchesDept =
        deptFilter === 'all' || c.department_id === deptFilter;

      const matchesProgram =
        programFilter === 'all' ||
        (c.program_id && c.program_id === programFilter);

      const matchesSemester =
        semesterFilter === 'all' ||
        c.semester === Number(semesterFilter);

      const matchesTeacher =
        teacherFilter === 'all' ||
        (c.teacher_id && c.teacher_id === teacherFilter);

      return matchesSearch && matchesDept && matchesProgram && matchesSemester && matchesTeacher;
    });
  }, [courses, search, deptFilter, programFilter, semesterFilter, teacherFilter]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    return {
      totalCourses: courses.length,
      totalStudents: courses.reduce((sum, c) => sum + (c.stats.student_count || 0), 0),
      totalLessons: courses.reduce((sum, c) => sum + (c.stats.lesson_count || 0), 0),
      totalQuizzes: courses.reduce((sum, c) => sum + (c.stats.quiz_count || 0), 0),
      totalDuration: courses.reduce((sum, c) => sum + (c.stats.total_duration || 0), 0),
      avgStudentsPerCourse: courses.length > 0
        ? Math.round(courses.reduce((sum, c) => sum + (c.stats.student_count || 0), 0) / courses.length)
        : 0,
    };
  }, [courses]);

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course? This will also delete all associated lessons, quizzes, and enrollments.')) return;

    try {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
      toast.success('Course deleted successfully');
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete course');
    }
  };

  const handleViewCourse = (courseId: string) => {
    router.push(`/admin/courses/${courseId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-purple-600" />
            Courses Management
          </h1>
          <p className="text-sm text-slate-500">
            Manage courses, lessons, quizzes, and student enrollments
          </p>
        </div>
        
        <Button
          asChild
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Link href="/admin/courses/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Courses</p>
                <p className="text-2xl font-bold text-slate-900">
                  {overallStats.totalCourses}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Students</p>
                <p className="text-2xl font-bold text-slate-900">
                  {overallStats.totalStudents}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Lessons</p>
                <p className="text-2xl font-bold text-slate-900">
                  {overallStats.totalLessons}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Brain className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Quizzes</p>
                <p className="text-2xl font-bold text-slate-900">
                  {overallStats.totalQuizzes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Hours</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Math.round(overallStats.totalDuration / 60)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Avg Students</p>
                <p className="text-2xl font-bold text-slate-900">
                  {overallStats.avgStudentsPerCourse}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-sm font-semibold">
              Filters & Search
            </CardTitle>
          </div>
          <CardDescription>
            Find courses by department, program, semester, teacher, or keywords
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by course name, code, instructor, section, or teacher..."
                className="pl-10 bg-white h-11"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select
                value={deptFilter}
                onValueChange={(val) => {
                  setDeptFilter(val);
                  setProgramFilter('all');
                }}
              >
                <SelectTrigger className="bg-white h-11">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={programFilter}
                onValueChange={(val) => setProgramFilter(val)}
              >
                <SelectTrigger className="bg-white h-11">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs
                    .filter(
                      (p) =>
                        deptFilter === 'all' || p.department_id === deptFilter,
                    )
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select
                value={semesterFilter}
                onValueChange={(val) => setSemesterFilter(val)}
              >
                <SelectTrigger className="bg-white h-11">
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Semesters</SelectItem>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      Semester {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={teacherFilter}
                onValueChange={(val) => setTeacherFilter(val)}
              >
                <SelectTrigger className="bg-white h-11">
                  <SelectValue placeholder="All Teachers" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Display */}
            {(search || deptFilter !== 'all' || programFilter !== 'all' || semesterFilter !== 'all' || teacherFilter !== 'all') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-600">Active filters:</span>
                {search && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {search}
                    <button
                      onClick={() => setSearch('')}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {deptFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Dept: {departments.find(d => d.id === deptFilter)?.name}
                    <button
                      onClick={() => setDeptFilter('all')}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {programFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Program: {programs.find(p => p.id === programFilter)?.name}
                    <button
                      onClick={() => setProgramFilter('all')}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {semesterFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Semester: {semesterFilter}
                    <button
                      onClick={() => setSemesterFilter('all')}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {teacherFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Teacher: {teachers.find(t => t.id === teacherFilter)?.full_name}
                    <button
                      onClick={() => setTeacherFilter('all')}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearch('');
                    setDeptFilter('all');
                    setProgramFilter('all');
                    setSemesterFilter('all');
                    setTeacherFilter('all');
                  }}
                  className="text-xs h-7"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Courses Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Loading courses...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
            <BookOpen className="h-16 w-16 mb-3 text-slate-400" />
            <p className="font-medium mb-1 text-lg">No courses found</p>
            <p className="text-sm mb-4">
              {search || deptFilter !== 'all' || programFilter !== 'all' || semesterFilter !== 'all' || teacherFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first course to get started'}
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              <Link href="/admin/courses/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Link>
            </Button>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const dept = getDepartment(course.department_id);
            const prog = course.program_id
              ? getProgram(course.program_id)
              : null;

            return (
              <Card 
                key={course.id} 
                className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-200 cursor-pointer group"
                onClick={() => handleViewCourse(course.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-1">
                        {course.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs font-mono">
                          {course.code}
                        </Badge>
                        {course.section && (
                          <Badge variant="secondary" className="text-xs">
                            Sec {course.section}
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                        >
                          {course.credits} Credits
                        </Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                  </div>
                  
                  {course.description && (
                    <CardDescription className="line-clamp-2 text-sm mt-2">
                      {course.description}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Department, Program, Teacher */}
                  <div className="space-y-2">
                    {dept && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="line-clamp-1">{dept.name}</span>
                      </div>
                    )}
                    
                    {prog && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                        <span className="line-clamp-1">{prog.name}</span>
                      </div>
                    )}

                    {course.teacher && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Award className="h-3.5 w-3.5 text-slate-400" />
                        <span className="line-clamp-1">{course.teacher.full_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-slate-500">Students</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {course.stats.student_count}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-slate-500">Lessons</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {course.stats.lesson_count}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="text-xs text-slate-500">Quizzes</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {course.stats.quiz_count}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-xs text-slate-500">Duration</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {course.stats.total_duration} min
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Semester Info */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Semester {course.semester}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(course.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-white hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300"
                    >
                      <Link href={`/admin/courses/create?edit=${course.id}`}>
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Link>
                    </Button>

                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                    >
                      <Link href={`/admin/courses/${course.id}`}>
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View
                      </Link>
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteCourse(course.id);
                      }}
                      className="bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Results Summary */}
      {!loading && filteredCourses.length > 0 && (
        <div className="text-center text-sm text-slate-500 pb-4">
          Showing {filteredCourses.length} of {courses.length} courses
        </div>
      )}
    </div>
  );
}