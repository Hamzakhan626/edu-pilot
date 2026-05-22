/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars *//* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/auth';
import { toast } from 'sonner';
import {
  Building2,
  Loader2,
  Plus,
  ArrowLeft,
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  TrendingUp,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Department = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
};

type DepartmentStats = {
  total_students: number;
  total_teachers: number;
  active_courses: number;
  programs_count: number;
  avg_attendance: number;
  active_streaks: number;
};

type Course = {
  id: string;
  name: string;
  code: string;
  semester: number;
  teacher_id: string | null;
  teacher_name: string | null;
  credit_hours?: number;
};

type Program = {
  id: string;
  name: string;
  code: string;
  duration_years: number;
  degree: string | null;
  courses_count: number;
  courses: Course[];
  expanded?: boolean;
};

type Teacher = {
  id: string;
  name: string;
  email: string;
  assigned_courses: number;
};

export default function DepartmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [deptStats, setDeptStats] = useState<DepartmentStats | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedProgramForCourse, setSelectedProgramForCourse] =
    useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const [programForm, setProgramForm] = useState({
    name: '',
    code: '',
    degree: '',
    duration_years: 4,
  });

  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    semester: 1,
    credit_hours: 3,
    program_id: '',
    teacher_id: '',
  });

  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const loadDepartment = async (deptId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supaErr } = await supabase
        .from('departments')
        .select('id, name, code, description, created_at')
        .eq('id', deptId)
        .single();

      if (supaErr) throw supaErr;
      if (!data) {
        toast.error('Department not found');
        router.push('/admin/departments');
        return;
      }

      setDepartment(data as Department);
    } catch (err: any) {
      setError(err?.message || 'Failed to load department');
      toast.error(err?.message || 'Failed to load department');
      router.push('/admin/departments');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentDetails = async (deptId: string) => {
    if (!deptId) return;

    try {
      setLoadingDetails(true);

      // 1) Stats
      try {
        const { count: studentCount, error: studentError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
          .eq('department_id', deptId);

        const { count: teacherCount, error: teacherError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'teacher')
          .eq('department_id', deptId);

        const { count: programCount, error: programError } = await supabase
          .from('programs')
          .select('*', { count: 'exact', head: true })
          .eq('department_id', deptId);

        const { data: programsForCourseCount, error: programsError } =
          await supabase
            .from('programs')
            .select('id')
            .eq('department_id', deptId);

        let courseCount = 0;
        if (!programsError && programsForCourseCount?.length) {
          const programIds = programsForCourseCount.map((p) => p.id);
          const { count: courseCountResult, error: courseError } =
            await supabase
              .from('courses')
              .select('*', { count: 'exact', head: true })
              .in('program_id', programIds);

          if (!courseError && courseCountResult != null) {
            courseCount = courseCountResult;
          }
        }

        setDeptStats({
          total_students: studentError ? 0 : studentCount || 0,
          total_teachers: teacherError ? 0 : teacherCount || 0,
          active_courses: courseCount,
          programs_count: programError ? 0 : programCount || 0,
          avg_attendance: 0,
          active_streaks: 0,
        });
      } catch {
        setDeptStats({
          total_students: 0,
          total_teachers: 0,
          active_courses: 0,
          programs_count: 0,
          avg_attendance: 0,
          active_streaks: 0,
        });
      }

      // 2) Programs + Courses
      try {
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select('id, name, code, degree')
          .eq('department_id', deptId)
          .order('name', { ascending: true });

        if (programsError) {
          setPrograms([]);
        } else {
          const programsWithCourses: Program[] = await Promise.all(
            (programsData || []).map(async (prog: any) => {
              try {
                const { data: coursesData, error: coursesError } =
                  await supabase
                    .from('courses')
                    .select(
                      `
                      id,
                      name,
                      code,
                      semester,
                      credits,
                      teacher_id
                    `,
                    )
                    .eq('program_id', prog.id)
                    .order('semester', { ascending: true })
                    .order('name', { ascending: true });

                if (coursesError) {
                  console.error(
                    `Error fetching courses for program ${prog.id}:`,
                    coursesError.message || JSON.stringify(coursesError),
                  );
                  return {
                    id: prog.id,
                    name: prog.name,
                    code: prog.code,
                    degree: prog.degree ?? null,
                    duration_years: 4,
                    courses_count: 0,
                    courses: [],
                    expanded: false,
                  };
                }

                const coursesWithTeachers: Course[] = await Promise.all(
                  (coursesData || []).map(async (c: any) => {
                    let teacherName: string | null = null;

                    if (c.teacher_id) {
                      try {
                        const { data: teacherData } = await supabase
                          .from('users')
                          .select('full_name')
                          .eq('id', c.teacher_id)
                          .single();

                        if (teacherData) teacherName = teacherData.full_name;
                      } catch {
                        // ignore
                      }
                    }

                    return {
                      id: c.id,
                      name: c.name,
                      code: c.code,
                      semester: c.semester || 1,
                      credit_hours: c.credits || 3,
                      teacher_id: c.teacher_id,
                      teacher_name: teacherName,
                    };
                  }),
                );

                return {
                  id: prog.id,
                  name: prog.name,
                  code: prog.code,
                  degree: prog.degree ?? null,
                  duration_years: 4,
                  courses_count: coursesWithTeachers.length,
                  courses: coursesWithTeachers,
                  expanded: false,
                };
              } catch (err: any) {
                console.error(
                  `Error processing program ${prog.id}:`,
                  err?.message || err,
                );
                return {
                  id: prog.id,
                  name: prog.name,
                  code: prog.code,
                  degree: prog.degree ?? null,
                  duration_years: 4,
                  courses_count: 0,
                  courses: [],
                  expanded: false,
                };
              }
            }),
          );

          setPrograms(programsWithCourses);
        }
      } catch {
        setPrograms([]);
      }

      // 3) Teachers
      try {
        const { data: teachersData, error: teachersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('role', 'teacher')
          .eq('department_id', deptId);

        if (teachersError) {
          setTeachers([]);
        } else {
          const teachersWithCounts = await Promise.all(
            (teachersData || []).map(async (t: any) => {
              try {
                const { count, error: countError } = await supabase
                  .from('courses')
                  .select('*', { count: 'exact', head: true })
                  .eq('teacher_id', t.id);

                return {
                  id: t.id,
                  name: t.full_name,
                  email: t.email,
                  assigned_courses: countError ? 0 : count || 0,
                };
              } catch {
                return {
                  id: t.id,
                  name: t.full_name,
                  email: t.email,
                  assigned_courses: 0,
                };
              }
            }),
          );

          setTeachers(teachersWithCounts);
        }
      } catch {
        setTeachers([]);
      }
    } catch (err: any) {
      console.error('Error loading department details:', err?.message || err);
      toast.error('Failed to load department details');
      setPrograms([]);
      setTeachers([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (id) {
      void loadDepartment(id);
    } else {
      toast.error('Department ID not found');
      router.push('/admin/departments');
    }
  }, [id]);

  useEffect(() => {
    if (department) {
      void loadDepartmentDetails(department.id);
    }
  }, [department]);

  const handleUpdateDepartment = async () => {
    if (!department) return;

    try {
      setSubmitting(true);

      const { error: updateErr } = await supabase
        .from('departments')
        .update({
          name: deptForm.name,
          description: deptForm.description || null,
        })
        .eq('id', department.id);

      if (updateErr) throw updateErr;
      toast.success('Department updated successfully');

      setDepartment({
        ...department,
        name: deptForm.name,
        description: deptForm.description || null,
      });
      setShowDeptDialog(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!department) return;
    if (
      !confirm(
        'Are you sure? This will delete all programs and courses in this department.',
      )
    )
      return;

    try {
      const { error: delErr } = await supabase
        .from('departments')
        .delete()
        .eq('id', department.id);

      if (delErr) throw delErr;
      toast.success('Department deleted successfully');
      router.push('/admin/departments');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete department');
    }
  };

  const handleSaveProgram = async () => {
    if (!department) return;

    try {
      setSubmitting(true);

      const payload = {
        name: programForm.name,
        code: programForm.code,
        degree: programForm.degree || null,
        duration_years: programForm.duration_years || 4,
        department_id: department.id,
      };

      if (editingItem && editingItem.type === 'program') {
        const { error } = await supabase
          .from('programs')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Program updated successfully');
      } else {
        const { error } = await supabase.from('programs').insert(payload);
        if (error) throw error;
        toast.success('Program created successfully');
      }

      setShowProgramDialog(false);
      setProgramForm({
        name: '',
        code: '',
        degree: '',
        duration_years: 4,
      });
      setEditingItem(null);
      void loadDepartmentDetails(department.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save program');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!department) return;

    try {
      setSubmitting(true);

      const payload: any = {
        name: courseForm.name,
        code: courseForm.code,
        semester: courseForm.semester,
        credits: courseForm.credit_hours,
        program_id: courseForm.program_id || selectedProgramForCourse,
        teacher_id: courseForm.teacher_id || null,
        department_id: department.id,
      };

      if (!payload.program_id) {
        toast.error('Please select a program for this course');
        setSubmitting(false);
        return;
      }

      if (editingItem && editingItem.type === 'course') {
        const { error } = await supabase
          .from('courses')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Course updated successfully');
      } else {
        const { error } = await supabase.from('courses').insert(payload);
        if (error) throw error;
        toast.success('Course created successfully');
      }

      setShowCourseDialog(false);
      setCourseForm({
        name: '',
        code: '',
        semester: 1,
        credit_hours: 3,
        program_id: '',
        teacher_id: '',
      });
      setEditingItem(null);
      setSelectedProgramForCourse(null);
      void loadDepartmentDetails(department.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!department) return;
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      toast.success('Course deleted successfully');
      void loadDepartmentDetails(department.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete course');
    }
  };

  const handleSaveTeacher = async () => {
    if (!department) return;

    try {
      setSubmitting(true);

      if (editingItem && editingItem.type === 'teacher') {
        const { error } = await supabase
          .from('users')
          .update({
            full_name: teacherForm.name,
            email: teacherForm.email,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Teacher updated successfully');
      } else {
        const { error } = await supabase.from('users').insert({
          full_name: teacherForm.name,
          email: teacherForm.email,
          password_hash: null,
          role: 'teacher',
          department_id: department.id,
        });

        if (error) throw error;
        toast.success('Teacher created successfully');
      }

      setShowTeacherDialog(false);
      setTeacherForm({ name: '', email: '', password: '' });
      setEditingItem(null);
      void loadDepartmentDetails(department.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!department) return;
    if (
      !confirm('Are you sure? This will unassign all courses from this teacher.')
    )
      return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', teacherId);

      if (error) throw error;
      toast.success('Teacher deleted successfully');
      void loadDepartmentDetails(department.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete teacher');
    }
  };

  const toggleProgramExpansion = (programId: string) => {
    setPrograms((prev) =>
      prev.map((p) =>
        p.id === programId ? { ...p, expanded: !p.expanded } : p,
      ),
    );
  };

  const groupCoursesBySemester = (courses: Course[]) => {
    const grouped: { [sem: number]: Course[] } = {};
    courses.forEach((course) => {
      if (!grouped[course.semester]) grouped[course.semester] = [];
      grouped[course.semester].push(course);
    });
    return grouped;
  };

  const openEditDepartment = () => {
    if (!department) return;
    setDeptForm({
      name: department.name,
      code: department.code,
      description: department.description || '',
    });
    setShowDeptDialog(true);
  };

  const openEditProgram = (program: Program) => {
    setEditingItem({ type: 'program', id: program.id });
    setProgramForm({
      name: program.name,
      code: program.code,
      degree: program.degree || '',
      duration_years: program.duration_years,
    });
    setShowProgramDialog(true);
  };

  const openEditCourse = (course: Course, programId: string) => {
    setEditingItem({ type: 'course', id: course.id });
    setCourseForm({
      name: course.name,
      code: course.code,
      semester: course.semester,
      credit_hours: course.credit_hours ?? 3,
      program_id: programId,
      teacher_id: course.teacher_id || '',
    });
    setShowCourseDialog(true);
  };

  const openEditTeacher = (teacher: Teacher) => {
    setEditingItem({ type: 'teacher', id: teacher.id });
    setTeacherForm({
      name: teacher.name,
      email: teacher.email,
      password: '',
    });
    setShowTeacherDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-2 text-slate-600">Loading department...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-red-600 font-medium mb-2">Error: {error}</p>
        <Button onClick={() => router.push('/admin/departments')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Departments
        </Button>
      </div>
    );
  }

  if (!department) return null;

  const programsBySemesterUI = (
    <Tabs defaultValue="programs" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="programs">Programs & Courses</TabsTrigger>
        <TabsTrigger value="faculty">Faculty</TabsTrigger>
      </TabsList>

      {/* Programs & Courses */}
      <TabsContent value="programs" className="space-y-4">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Programs & Their Courses</CardTitle>
                <CardDescription>
                  Academic programs with all courses organized by semester.
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600"
                onClick={() => {
                  setEditingItem({ type: 'program', id: null });
                  setProgramForm({
                    name: '',
                    code: '',
                    degree: '',
                    duration_years: 4,
                  });
                  setShowProgramDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Program
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {programs.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium mb-1">
                  No programs found
                </p>
                <p className="text-sm text-slate-400">
                  Add a program to start organizing courses.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {programs.map((prog) => {
                  const coursesBySemester = groupCoursesBySemester(
                    prog.courses,
                  );
                  const semesters = Object.keys(coursesBySemester)
                    .map((n) => Number(n))
                    .sort((a, b) => a - b);

                  function handleDeleteProgram(id: string) {
                    throw new Error('Function not implemented.');
                  }

                  return (
                    <Card key={prog.id} className="border shadow-sm">
                      <CardContent className="p-0">
                        <div
                          className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 cursor-pointer hover:from-purple-100 hover:to-pink-100 transition-colors"
                          onClick={() => toggleProgramExpansion(prog.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                                  {prog.name}
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {prog.code}
                                  </Badge>
                                </h3>
                                <div className="flex gap-3 mt-1 text-sm text-slate-600">
                                  {prog.degree && (
                                    <span className="flex items-center gap-1">
                                      <GraduationCap className="h-3 w-3" />
                                      {prog.degree}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {prog.duration_years} years
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {prog.courses_count} courses
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditProgram(prog);
                                }}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteProgram(prog.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                              {prog.expanded ? (
                                <ChevronUp className="h-5 w-5 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {prog.expanded && (
                          <div className="p-4 space-y-6 bg-white">
                            {prog.courses.length === 0 ? (
                              <div className="text-center py-4">
                                <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                                <p className="text-slate-500">
                                  No courses added yet
                                </p>
                              </div>
                            ) : (
                              semesters.map((semester) => (
                                <div
                                  key={semester}
                                  className="space-y-3"
                                >
                                  <h4 className="font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                                    <Calendar className="h-4 w-4 text-purple-600" />
                                    Semester {semester}
                                    <Badge
                                      variant="secondary"
                                      className="ml-2"
                                    >
                                      {
                                        coursesBySemester[semester].length
                                      }{' '}
                                      courses
                                    </Badge>
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {coursesBySemester[semester].map(
                                      (course) => (
                                        <Card
                                          key={course.id}
                                          className="border shadow-sm hover:shadow-md transition-shadow"
                                        >
                                          <CardContent className="p-3">
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <h5 className="font-medium text-slate-900 text-sm">
                                                  {course.name}
                                                </h5>
                                                <div className="flex items-center gap-2 mt-1">
                                                  <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                  >
                                                    {course.code}
                                                  </Badge>
                                                  {course.credit_hours && (
                                                    <span className="text-xs text-slate-500">
                                                      {course.credit_hours}{' '}
                                                      credits
                                                    </span>
                                                  )}
                                                </div>
                                                <p className="text-xs text-slate-600 mt-1">
                                                  {course.teacher_name ? (
                                                    <span className="flex items-center gap-1">
                                                      <GraduationCap className="h-3 w-3" />
                                                      {course.teacher_name}
                                                    </span>
                                                  ) : (
                                                    <span className="text-amber-600">
                                                      No teacher assigned
                                                    </span>
                                                  )}
                                                </p>
                                              </div>
                                              <div className="flex gap-1">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-7 w-7 p-0"
                                                  onClick={() =>
                                                    openEditCourse(
                                                      course,
                                                      prog.id,
                                                    )
                                                  }
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-7 w-7 p-0"
                                                  onClick={() =>
                                                    void handleDeleteCourse(
                                                      course.id,
                                                    )
                                                  }
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ),
                                    )}
                                  </div>
                                </div>
                              ))
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-dashed"
                              onClick={() => {
                                setSelectedProgramForCourse(prog.id);
                                setEditingItem({
                                  type: 'course',
                                  id: null,
                                });
                                setCourseForm({
                                  name: '',
                                  code: '',
                                  semester: 1,
                                  credit_hours: 3,
                                  program_id: prog.id,
                                  teacher_id: '',
                                });
                                setShowCourseDialog(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Course to {prog.name}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Faculty */}
      <TabsContent value="faculty" className="space-y-4">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Faculty Members</CardTitle>
                <CardDescription>
                  Teachers assigned to this department
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600"
                onClick={() => {
                  setEditingItem({ type: 'teacher', id: null });
                  setTeacherForm({ name: '', email: '', password: '' });
                  setShowTeacherDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium mb-1">
                  No teachers found
                </p>
                <p className="text-sm text-slate-400">
                  Add teachers to assign them to courses
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase tracking-wide text-xs">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase tracking-wide text-xs">
                        Email
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase tracking-wide text-xs">
                        Assigned Courses
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase tracking-wide text-xs">
                        Workload
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase tracking-wide text-xs">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {teacher.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {teacher.email}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">
                            {teacher.assigned_courses} courses
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  teacher.assigned_courses > 5
                                    ? 'bg-red-500'
                                    : teacher.assigned_courses > 3
                                    ? 'bg-amber-500'
                                    : 'bg-green-500'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    (teacher.assigned_courses / 6) * 100,
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-500">
                              {teacher.assigned_courses > 5
                                ? 'High'
                                : teacher.assigned_courses > 3
                                ? 'Medium'
                                : 'Low'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditTeacher(teacher)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                void handleDeleteTeacher(teacher.id)
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/departments')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-purple-600" />
              {department.name}
            </h1>
            <p className="text-sm text-slate-500">
              {department.code} • {department.description || 'No description'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEditDepartment}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeleteDepartment}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      {loadingDetails ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-2 text-slate-600">Loading details...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">
                      Students
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {deptStats?.total_students || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">
                      Teachers
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {deptStats?.total_teachers || 0}
                    </p>
                  </div>
                  <GraduationCap className="h-8 w-8 text-blue-600 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">
                      Active Courses
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {deptStats?.active_courses || 0}
                    </p>
                  </div>
                  <BookOpen className="h-8 w-8 text-green-600 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">
                      Programs
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {deptStats?.programs_count || programs.length}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-amber-600 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-50 to-red-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">
                      Avg Attendance
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {deptStats?.avg_attendance || 0}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-rose-600 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-violet-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">
                      Active Streaks
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {deptStats?.active_streaks || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-indigo-600 opacity-70" />
                </div>
              </CardContent>
            </Card>
          </div>

          {programsBySemesterUI}
        </>
      )}

      {/* Edit Department Dialog */}
      <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={deptForm.name}
                onChange={(e) =>
                  setDeptForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Computer Science"
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input value={deptForm.code} disabled placeholder="CS" />
              <p className="text-xs text-slate-500 mt-1">
                Code cannot be changed as it is used in URLs.
              </p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={deptForm.description}
                onChange={(e) =>
                  setDeptForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Department description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeptDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateDepartment} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Program Dialog */}
      <Dialog open={showProgramDialog} onOpenChange={setShowProgramDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem && editingItem.type === 'program'
                ? 'Edit Program'
                : 'New Program'}
            </DialogTitle>
            <DialogDescription>
              {editingItem && editingItem.type === 'program'
                ? 'Update program information'
                : 'Create a new program'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={programForm.name}
                onChange={(e) =>
                  setProgramForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="BS Computer Science"
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={programForm.code}
                onChange={(e) =>
                  setProgramForm((prev) => ({
                    ...prev,
                    code: e.target.value,
                  }))
                }
                placeholder="BSCS"
              />
            </div>
            <div>
              <Label>Degree</Label>
              <Input
                value={programForm.degree}
                onChange={(e) =>
                  setProgramForm((prev) => ({
                    ...prev,
                    degree: e.target.value,
                  }))
                }
                placeholder="Bachelor of Science"
              />
            </div>
            <div>
              <Label>Duration Years</Label>
              <Input
                type="number"
                value={programForm.duration_years}
                onChange={(e) =>
                  setProgramForm((prev) => ({
                    ...prev,
                    duration_years: parseInt(e.target.value, 10) || 4,
                  }))
                }
                min={1}
                max={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProgramDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProgram} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Dialog – fixed background & dropdown */}
      <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
        <DialogContent className="bg-white sm:max-w-lg shadow-xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem && editingItem.type === 'course'
                ? 'Edit Course'
                : 'New Course'}
            </DialogTitle>
            <DialogDescription>
              {editingItem && editingItem.type === 'course'
                ? 'Update course information'
                : 'Create a new course'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Program</Label>
              <Select
                value={courseForm.program_id || selectedProgramForCourse || ''}
                onValueChange={(val) =>
                  setCourseForm((prev) => ({ ...prev, program_id: val }))
                }
              >
                <SelectTrigger className="w-full bg-white border border-slate-200">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={courseForm.name}
                onChange={(e) =>
                  setCourseForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Data Structures"
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={courseForm.code}
                onChange={(e) =>
                  setCourseForm((prev) => ({
                    ...prev,
                    code: e.target.value,
                  }))
                }
                placeholder="CS-201"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Semester</Label>
                <Input
                  type="number"
                  value={courseForm.semester}
                  onChange={(e) =>
                    setCourseForm((prev) => ({
                      ...prev,
                      semester: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  min={1}
                  max={8}
                />
              </div>
              <div>
                <Label>Credit Hours</Label>
                <Input
                  type="number"
                  value={courseForm.credit_hours}
                  onChange={(e) =>
                    setCourseForm((prev) => ({
                      ...prev,
                      credit_hours: parseInt(e.target.value, 10) || 3,
                    }))
                  }
                  min={1}
                  max={6}
                />
              </div>
            </div>
            <div>
              <Label>Teacher (Optional)</Label>
              <Select
                value={courseForm.teacher_id || 'none'}
                onValueChange={(val) =>
                  setCourseForm((prev) => ({
                    ...prev,
                    teacher_id: val === 'none' ? '' : val,
                  }))
                }
              >
                <SelectTrigger className="w-full bg-white border border-slate-200">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No teacher</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCourseDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCourse} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Dialog */}
      <Dialog open={showTeacherDialog} onOpenChange={setShowTeacherDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem && editingItem.type === 'teacher'
                ? 'Edit Teacher'
                : 'New Teacher'}
            </DialogTitle>
            <DialogDescription>
              {editingItem && editingItem.type === 'teacher'
                ? 'Update teacher information'
                : 'Add a new teacher'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={teacherForm.name}
                onChange={(e) =>
                  setTeacherForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={teacherForm.email}
                onChange={(e) =>
                  setTeacherForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="john@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTeacherDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTeacher} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
