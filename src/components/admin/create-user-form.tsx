/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { createUserByAdmin, type UserRole, supabase } from '@/lib/auth';
import { toast } from 'sonner';
import {
  ArrowLeft,
  UserPlus,
  Search,
  Mail,
  Hash,
  Building2,
  BadgeCheck,
  Loader2,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

type Department = { id: string; name: string; code?: string | null };

type ProgramLite = {
  id: string;
  name: string;
  code: string;
  department_id: string;
  department_name?: string;
};

type CourseLite = {
  id: string;
  name: string;
  code: string;
  semester: number;
  program_name: string;
  program_id: string;
};

type StudentLite = {
  id: string;
  full_name: string;
  enrollment_number: string | null;
  email: string;
  semester: number | null;
  department_name: string | null;
};

type FormState = {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  semester: string;
  enrollment_number: string;
  admission_year: string;
  department_id: string;
  program_id: string;
  parent_student_ids: string[];
  teacher_department_ids: string[];
  teacher_program_ids: string[];
  teacher_course_ids: string[];
  teacher_academic_year: string;
};

const roleLabels: Record<UserRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin',
  parent: 'Parent',
  hr: 'HR',
  hod: 'Head of Department',
  finance: 'Finance',
  staff: 'Staff',
};

const roleOptions: UserRole[] = [
  'student',
  'teacher',
  'parent',
  'admin',
  'hr',
  'hod',
  'finance',
  'staff',
];

const defaultState: FormState = {
  full_name: '',
  email: '',
  password: '',
  role: 'student',
  phone: '',
  date_of_birth: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  semester: '',
  enrollment_number: '',
  admission_year: '',
  department_id: '',
  program_id: '',
  parent_student_ids: [],
  teacher_department_ids: [],
  teacher_program_ids: [],
  teacher_course_ids: [],
  teacher_academic_year: new Date().getFullYear().toString(),
};

export default function AdminCreateUserPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormState>(defaultState);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<ProgramLite[]>([]);
  const [allPrograms, setAllPrograms] = useState<ProgramLite[]>([]); // For teachers
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [studentsQuery, setStudentsQuery] = useState('');
  const [coursesQuery, setCoursesQuery] = useState('');
  const [programsQuery, setProgramsQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  const isStudent = formData.role === 'student';
  const isParent = formData.role === 'parent';
  const isTeacher = formData.role === 'teacher';

  // Student and HOD must pick exactly one department
  const needsSingleDepartment = isStudent || formData.role === 'hod';

  // Teacher can pick multiple departments
  const needsMultipleDepartments = isTeacher;

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [
          { data: deptData },
          { data: progData },
          { data: studentData },
        ] = await Promise.all([
          supabase.from('departments').select('id, name, code'),
          supabase
            .from('programs')
            .select('id, name, code, department_id, department:departments(name)')
            .order('name', { ascending: true }),
          supabase
            .from('users')
            .select(
              `
              id,
              full_name,
              enrollment_number,
              email,
              semester,
              department:departments(name)
            `,
            )
            .eq('role', 'student')
            .order('full_name', { ascending: true }),
        ]);

        setDepartments((deptData || []) as Department[]);

        const mappedPrograms: ProgramLite[] =
          (progData || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            department_id: p.department_id,
            department_name: p.department?.name ?? 'N/A',
          })) || [];
        setAllPrograms(mappedPrograms);

        const mappedStudents: StudentLite[] =
          (studentData || []).map((s: any) => ({
            id: s.id,
            full_name: s.full_name,
            enrollment_number: s.enrollment_number,
            email: s.email,
            semester: s.semester,
            department_name: s.department?.name ?? null,
          })) || [];
        setStudents(mappedStudents);
      } catch (e) {
        console.error('Lookup load error', e);
        toast.error('Failed to load reference data');
      } finally {
        setLookupsLoading(false);
      }
    };

    void loadLookups();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as UserRole;
    setFormData((prev) => ({
      ...prev,
      role,
      semester: '',
      enrollment_number: '',
      admission_year: '',
      department_id: '',
      program_id: '',
      parent_student_ids: [],
      teacher_department_ids: [],
      teacher_program_ids: [],
      teacher_course_ids: [],
    }));
    setPrograms([]);
    setCourses([]);
  };

  // For students/HOD: single department selection
  const handleDepartmentChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const department_id = e.target.value;
    setFormData((prev) => ({
      ...prev,
      department_id,
      program_id: '',
    }));

    if (!department_id) {
      setPrograms([]);
      return;
    }

    // Filter programs for this department
    const deptPrograms = allPrograms.filter(
      (p) => p.department_id === department_id,
    );
    setPrograms(deptPrograms);
  };

  // For students: program selection
  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const program_id = e.target.value;
    setFormData((prev) => ({
      ...prev,
      program_id,
    }));
  };

  // For teachers: toggle department selection
  const toggleTeacherDepartment = (departmentId: string) => {
    setFormData((prev) => {
      const exists = prev.teacher_department_ids.includes(departmentId);
      const newDeptIds = exists
        ? prev.teacher_department_ids.filter((id) => id !== departmentId)
        : [...prev.teacher_department_ids, departmentId];

      // Clear programs and courses that don't belong to selected departments
      const validPrograms = prev.teacher_program_ids.filter((pid) => {
        const prog = allPrograms.find((p) => p.id === pid);
        return prog && newDeptIds.includes(prog.department_id);
      });

      const validCourses = prev.teacher_course_ids.filter((cid) => {
        const course = courses.find((c) => c.id === cid);
        if (!course) return false;
        return validPrograms.includes(course.program_id);
      });

      return {
        ...prev,
        teacher_department_ids: newDeptIds,
        teacher_program_ids: validPrograms,
        teacher_course_ids: validCourses,
      };
    });
  };

  // For teachers: toggle program selection
  const toggleTeacherProgram = async (programId: string) => {
    setFormData((prev) => {
      const exists = prev.teacher_program_ids.includes(programId);
      const newProgIds = exists
        ? prev.teacher_program_ids.filter((id) => id !== programId)
        : [...prev.teacher_program_ids, programId];

      // If removing a program, remove its courses
      const validCourses = prev.teacher_course_ids.filter((cid) => {
        const course = courses.find((c) => c.id === cid);
        if (!course) return false;
        return newProgIds.includes(course.program_id);
      });

      return {
        ...prev,
        teacher_program_ids: newProgIds,
        teacher_course_ids: validCourses,
      };
    });

    // Load courses for all selected programs (after state update)
    setFormData((prev) => {
      const exists = prev.teacher_program_ids.includes(programId);
      const newProgIds = exists
        ? prev.teacher_program_ids.filter((id) => id !== programId)
        : [...prev.teacher_program_ids, programId];
      void loadCoursesForPrograms(newProgIds);
      return prev; // no-op state change; side-effect only
    });
  };

  const loadCoursesForPrograms = async (programIds: string[]) => {
    if (programIds.length === 0) {
      setCourses([]);
      return;
    }

    const { data, error } = await supabase
      .from('courses')
      .select(
        `
        id,
        name,
        code,
        semester,
        program:programs(id, name)
      `,
      )
      .in('program_id', programIds)
      .order('semester', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      toast.error('Failed to load courses for selected programs');
      setCourses([]);
      return;
    }

    const mappedCourses: CourseLite[] =
      (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        semester: c.semester,
        program_name: c.program?.name ?? 'N/A',
        program_id: c.program?.id ?? '',
      })) || [];

    setCourses(mappedCourses);
  };

  // Reload courses whenever teacher programs change
  useEffect(() => {
    if (isTeacher && formData.teacher_program_ids.length > 0) {
      void loadCoursesForPrograms(formData.teacher_program_ids);
    } else if (isTeacher) {
      setCourses([]);
    }
  }, [formData.teacher_program_ids, isTeacher]);

  const toggleParentStudent = (studentId: string) => {
    setFormData((prev) => {
      const exists = prev.parent_student_ids.includes(studentId);
      return {
        ...prev,
        parent_student_ids: exists
          ? prev.parent_student_ids.filter((id) => id !== studentId)
          : [...prev.parent_student_ids, studentId],
      };
    });
  };

  const toggleTeacherCourse = (courseId: string) => {
    setFormData((prev) => {
      const exists = prev.teacher_course_ids.includes(courseId);
      return {
        ...prev,
        teacher_course_ids: exists
          ? prev.teacher_course_ids.filter((id) => id !== courseId)
          : [...prev.teacher_course_ids, courseId],
      };
    });
  };

  const selectedStudents = formData.parent_student_ids
    .map((id) => students.find((s) => s.id === id))
    .filter(Boolean) as StudentLite[];

  const selectedDepartments = formData.teacher_department_ids
    .map((id) => departments.find((d) => d.id === id))
    .filter(Boolean) as Department[];

  const selectedPrograms = formData.teacher_program_ids
    .map((id) => allPrograms.find((p) => p.id === id))
    .filter(Boolean) as ProgramLite[];

  const selectedCourses = formData.teacher_course_ids
    .map((id) => courses.find((c) => c.id === id))
    .filter(Boolean) as CourseLite[];

  const filteredStudents = students.filter((s) => {
    if (!studentsQuery.trim()) return true;
    const q = studentsQuery.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      (s.enrollment_number ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.department_name ?? '').toLowerCase().includes(q)
    );
  });

  const availablePrograms = allPrograms.filter((p) =>
    formData.teacher_department_ids.includes(p.department_id),
  );

  const filteredPrograms = availablePrograms.filter((p) => {
    if (!programsQuery.trim()) return true;
    const q = programsQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.department_name ?? '').toLowerCase().includes(q)
    );
  });

  const filteredCourses = courses.filter((c) => {
    if (!coursesQuery.trim()) return true;
    const q = coursesQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email || !formData.password) {
      toast.error('Please fill in full name, email and password');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (isStudent) {
      if (!formData.enrollment_number || !formData.semester) {
        toast.error('Student must have enrollment number and semester');
        return;
      }
      if (!formData.department_id || !formData.program_id) {
        toast.error('Please select both department and program for the student');
        return;
      }
    }

    if (needsSingleDepartment && !formData.department_id) {
      toast.error('Please select a department');
      return;
    }

    if (isTeacher) {
      if (formData.teacher_department_ids.length === 0) {
        toast.error('Please select at least one department for the teacher');
        return;
      }
      if (formData.teacher_program_ids.length === 0) {
        toast.error('Please select at least one program for the teacher');
        return;
      }
      if (formData.teacher_course_ids.length === 0) {
        toast.error('Please assign at least one course to this teacher');
        return;
      }
    }

    if (isParent && formData.parent_student_ids.length === 0) {
      toast.error('Please link at least one student to this parent');
      return;
    }

    setLoading(true);

    try {
      // FIX: pass program_id in extras so createUserByAdmin can store it
      // (either via student_profiles table or program_id column on users - see auth.ts)
      const userId = await createUserByAdmin(
        formData.full_name,
        formData.email,
        formData.password,
        formData.role,
        {
          department_id: needsSingleDepartment ? formData.department_id : undefined,
          program_id: isStudent ? formData.program_id || undefined : undefined,
          semester: isStudent && formData.semester ? Number(formData.semester) : undefined,
          enrollment_number: isStudent ? formData.enrollment_number || undefined : undefined,
          admission_year:
            isStudent && formData.admission_year
              ? Number(formData.admission_year)
              : undefined,
          parent_student_ids: isParent ? formData.parent_student_ids : undefined,
        },
      );

      // If teacher, insert into junction tables
      if (isTeacher) {
        // 1. Insert teacher departments
        const teacherDeptRecords = formData.teacher_department_ids.map((deptId) => ({
          teacher_id: userId,
          department_id: deptId,
        }));

        const { error: tdError } = await supabase
          .from('teacher_departments')
          .insert(teacherDeptRecords);

        if (tdError) {
          console.error('Teacher departments insert error:', tdError);
          toast.error('User created but failed to assign departments');
          setLoading(false);
          return;
        }

        // 2. Insert teacher programs
        const teacherProgRecords = formData.teacher_program_ids.map((progId) => ({
          teacher_id: userId,
          program_id: progId,
        }));

        const { error: tpError } = await supabase
          .from('teacher_programs')
          .insert(teacherProgRecords);

        if (tpError) {
          console.error('Teacher programs insert error:', tpError);
          toast.error('User created but failed to assign programs');
          setLoading(false);
          return;
        }

        // 3. Insert teacher courses
        const teacherCourseRecords = formData.teacher_course_ids.map((courseId) => ({
          teacher_id: userId,
          course_id: courseId,
          academic_year: formData.teacher_academic_year,
        }));

        const { error: tcError } = await supabase
          .from('teacher_courses')
          .insert(teacherCourseRecords);

        if (tcError) {
          console.error('Teacher courses insert error:', tcError);
          toast.error('User created but failed to assign courses');
          setLoading(false);
          return;
        }
      }

      toast.success(`${roleLabels[formData.role]} account created successfully!`);
      router.push('/admin/dashboard');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create user';
      toast.error(message);
      console.error('User creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Create New User</h1>
              <p className="text-sm text-slate-600 mt-1">
                Fill the form to create a new {roleLabels[formData.role]} in the system.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">All changes validated</span>
            </span>
          </div>
        </div>

        {/* Main layout */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <UserPlus className="h-4 w-4 text-purple-600" />
                  </div>
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Core identity and login credentials for this user.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      required
                      disabled={loading}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      required
                      disabled={loading}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Min. 6 characters"
                      required
                      minLength={6}
                      disabled={loading}
                      className="h-10"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      The user will be prompted to change this password later.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleRoleChange}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white h-10 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={loading}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact & address */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-slate-600" />
                  </div>
                  Contact & Address
                </CardTitle>
                <CardDescription>
                  Optional details used for communication and records.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Phone</label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+92 300 0000000"
                      disabled={loading}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Date of Birth
                    </label>
                    <Input
                      name="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Country</label>
                    <Input
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="Pakistan"
                      disabled={loading}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Address</label>
                    <Textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Street address"
                      rows={2}
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">City</label>
                      <Input
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="City"
                        disabled={loading}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">State</label>
                      <Input
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="State"
                        disabled={loading}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Postal Code
                      </label>
                      <Input
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                        placeholder="00000"
                        disabled={loading}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Academic / department info for STUDENTS and HOD */}
            {needsSingleDepartment && (
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                    </div>
                    Academic & Department
                  </CardTitle>
                  <CardDescription>
                    Assign the user to the correct department and capture academic information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleDepartmentChange}
                      className={`w-full rounded-md px-3 py-2 text-sm bg-white h-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        !formData.department_id
                          ? 'border-2 border-red-400'
                          : 'border border-slate-300'
                      }`}
                      disabled={loading || lookupsLoading}
                      required
                    >
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.code ? `(${d.code})` : ''}
                        </option>
                      ))}
                    </select>
                    {formData.role === 'hod' && (
                      <p className="text-[11px] text-blue-700 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        This user will have full department-level access and analytics.
                      </p>
                    )}
                  </div>

                  {isStudent && formData.department_id && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Program <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="program_id"
                        value={formData.program_id}
                        onChange={handleProgramChange}
                        className={`w-full rounded-md px-3 py-2 text-sm bg-white h-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          !formData.program_id
                            ? 'border-2 border-red-400'
                            : 'border border-slate-300'
                        }`}
                        disabled={loading || programs.length === 0}
                        required
                      >
                        <option value="">
                          {programs.length === 0
                            ? 'No programs found for this department'
                            : 'Select program'}
                        </option>
                        {programs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isStudent && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Enrollment Number <span className="text-red-500">*</span>
                        </label>
                        <Input
                          name="enrollment_number"
                          value={formData.enrollment_number}
                          onChange={handleInputChange}
                          placeholder="CS-2025-001"
                          required
                          disabled={loading}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Semester <span className="text-red-500">*</span>
                        </label>
                        <Input
                          name="semester"
                          type="number"
                          min={1}
                          max={8}
                          value={formData.semester}
                          onChange={handleInputChange}
                          placeholder="1-8"
                          required
                          disabled={loading}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Admission Year
                        </label>
                        <Input
                          name="admission_year"
                          type="number"
                          min={2000}
                          max={2100}
                          value={formData.admission_year}
                          onChange={handleInputChange}
                          placeholder="2024"
                          disabled={loading}
                          className="h-10"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* TEACHER DEPARTMENT & PROGRAM ASSIGNMENT */}
            {isTeacher && (
              <>
                <Card className="shadow-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader className="border-b border-blue-200 bg-white/50">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-blue-900">
                      <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      Assign Departments to Teacher
                      <span className="ml-auto text-sm font-normal text-blue-700">
                        Required <span className="text-red-500">*</span>
                      </span>
                    </CardTitle>
                    <CardDescription className="text-base">
                      Select one or more departments where this teacher will teach.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {selectedDepartments.length > 0 && (
                      <div className="p-4 bg-emerald-500 border border-emerald-600 rounded-lg shadow-sm">
                        <p className="text-sm font-bold text-white flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5" />
                          {selectedDepartments.length} department{selectedDepartments.length !== 1 ? 's' : ''} assigned
                        </p>
                      </div>
                    )}

                    <div className="max-h-80 overflow-y-auto space-y-2 border-2 border-blue-200 rounded-lg p-4 bg-white">
                      {departments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
                          <p className="text-base font-medium text-slate-600">No departments available</p>
                        </div>
                      ) : (
                        departments.map((d) => {
                          const selected = formData.teacher_department_ids.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggleTeacherDepartment(d.id)}
                              className={`w-full text-left rounded-lg border-2 px-4 py-4 flex items-center gap-4 transition-all ${
                                selected
                                  ? 'border-blue-500 bg-blue-100 shadow-md'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                              }`}
                              disabled={loading}
                            >
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-bold text-slate-900 text-base">{d.name}</span>
                                  {selected && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                                </div>
                                {d.code && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium">
                                    <Hash className="h-3 w-3" />
                                    {d.code}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* TEACHER PROGRAMS */}
                {formData.teacher_department_ids.length > 0 && (
                  <Card className="shadow-lg border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50">
                    <CardHeader className="border-b border-indigo-200 bg-white/50">
                      <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-900">
                        <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                          <GraduationCap className="h-5 w-5 text-white" />
                        </div>
                        Assign Programs to Teacher
                        <span className="ml-auto text-sm font-normal text-indigo-700">
                          Required <span className="text-red-500">*</span>
                        </span>
                      </CardTitle>
                      <CardDescription className="text-base">
                        Select programs from the assigned departments that this teacher will teach.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      {selectedPrograms.length > 0 && (
                        <div className="p-4 bg-emerald-500 border border-emerald-600 rounded-lg shadow-sm">
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            {selectedPrograms.length} program{selectedPrograms.length !== 1 ? 's' : ''} assigned
                          </p>
                        </div>
                      )}

                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Search programs by name or code..."
                          value={programsQuery}
                          onChange={(e) => setProgramsQuery(e.target.value)}
                          className="pl-9 h-11 text-base border-2 border-indigo-200 focus:border-indigo-400"
                          disabled={availablePrograms.length === 0}
                        />
                      </div>

                      <div className="max-h-80 overflow-y-auto space-y-2 border-2 border-indigo-200 rounded-lg p-4 bg-white">
                        {availablePrograms.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
                            <p className="text-base font-medium text-slate-600">
                              No programs available in selected departments
                            </p>
                          </div>
                        ) : filteredPrograms.length === 0 ? (
                          <p className="text-sm text-slate-500 px-1 py-8 text-center">
                            No programs match your search.
                          </p>
                        ) : (
                          filteredPrograms.map((p) => {
                            const selected = formData.teacher_program_ids.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => toggleTeacherProgram(p.id)}
                                className={`w-full text-left rounded-lg border-2 px-4 py-4 flex items-center gap-4 transition-all ${
                                  selected
                                    ? 'border-indigo-500 bg-indigo-100 shadow-md'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                                }`}
                                disabled={loading}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-slate-900 text-base">{p.name}</span>
                                    {selected && <CheckCircle2 className="h-5 w-5 text-indigo-600" />}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium">
                                      <Hash className="h-3 w-3" />
                                      {p.code}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 rounded-md text-xs font-medium text-blue-700">
                                      <Building2 className="h-3 w-3" />
                                      {p.department_name}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Academic year for teachers */}
                {formData.teacher_program_ids.length > 0 && (
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="border-b bg-slate-50">
                      <CardTitle className="text-base font-semibold">Academic Year</CardTitle>
                      <CardDescription>
                        Specify the academic year for course assignments.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Input
                        name="teacher_academic_year"
                        value={formData.teacher_academic_year}
                        onChange={handleInputChange}
                        placeholder="2024-2025"
                        required
                        disabled={loading}
                        className="h-10"
                      />
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        The academic year for course assignments (e.g., 2024-2025 or 2025).
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* TEACHER COURSE ASSIGNMENT */}
                {formData.teacher_program_ids.length > 0 && (
                  <Card className="shadow-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
                    <CardHeader className="border-b border-purple-200 bg-white/50">
                      <CardTitle className="text-lg font-bold flex items-center gap-2 text-purple-900">
                        <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        Assign Courses to Teacher
                        <span className="ml-auto text-sm font-normal text-purple-700">
                          Required <span className="text-red-500">*</span>
                        </span>
                      </CardTitle>
                      <CardDescription className="text-base">
                        Select courses from the assigned programs that this teacher will teach.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      {selectedCourses.length > 0 && (
                        <div className="p-4 bg-emerald-500 border border-emerald-600 rounded-lg shadow-sm">
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} assigned
                          </p>
                        </div>
                      )}

                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Search courses by name or code..."
                          value={coursesQuery}
                          onChange={(e) => setCoursesQuery(e.target.value)}
                          className="pl-9 h-11 text-base border-2 border-purple-200 focus:border-purple-400"
                          disabled={courses.length === 0}
                        />
                      </div>

                      {selectedCourses.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-white rounded-lg border-2 border-purple-200">
                          {selectedCourses.map((c) => (
                            <div
                              key={c.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 border border-purple-300 rounded-full text-sm font-medium text-purple-900"
                            >
                              <span>{c.code}</span>
                              <button
                                type="button"
                                onClick={() => toggleTeacherCourse(c.id)}
                                className="hover:bg-purple-200 rounded-full p-0.5"
                                disabled={loading}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="max-h-80 overflow-y-auto space-y-2 border-2 border-purple-200 rounded-lg p-4 bg-white">
                        {courses.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
                            <p className="text-base font-medium text-slate-600">
                              No courses available for selected programs
                            </p>
                          </div>
                        ) : filteredCourses.length === 0 ? (
                          <p className="text-sm text-slate-500 px-1 py-8 text-center">
                            No courses match your search.
                          </p>
                        ) : (
                          filteredCourses.map((c) => {
                            const selected = formData.teacher_course_ids.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleTeacherCourse(c.id)}
                                className={`w-full text-left rounded-lg border-2 px-4 py-4 flex items-center gap-4 transition-all ${
                                  selected
                                    ? 'border-purple-500 bg-purple-100 shadow-md'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                                }`}
                                disabled={loading}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-slate-900 text-base">{c.name}</span>
                                    {selected && <CheckCircle2 className="h-5 w-5 text-purple-600" />}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium">
                                      <Hash className="h-3 w-3" />
                                      {c.code}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 rounded-md text-xs font-medium text-blue-700">
                                      Semester {c.semester}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 rounded-md text-xs font-medium text-indigo-700">
                                      {c.program_name}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Parent linking */}
            {isParent && (
              <Card className="shadow-lg border-2 border-purple-300">
                <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-white" />
                    </div>
                    Link Students to Parent
                    <span className="ml-auto text-sm font-normal text-purple-700">
                      Required <span className="text-red-500">*</span>
                    </span>
                  </CardTitle>
                  <CardDescription className="text-base">
                    Search and select students to link to this parent account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name, enrollment, email"
                      value={studentsQuery}
                      onChange={(e) => setStudentsQuery(e.target.value)}
                      className="pl-9 h-11 text-base"
                      disabled={lookupsLoading}
                    />
                  </div>

                  {selectedStudents.length > 0 && (
                    <div className="p-4 bg-emerald-500 border border-emerald-600 rounded-lg">
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} linked
                      </p>
                    </div>
                  )}

                  <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-4 bg-slate-50">
                    {lookupsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <p className="text-sm text-slate-500 px-1 py-8 text-center">No students found.</p>
                    ) : (
                      filteredStudents.map((s) => {
                        const selected = formData.parent_student_ids.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleParentStudent(s.id)}
                            className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-all ${
                              selected
                                ? 'border-purple-500 bg-purple-100 shadow-sm'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                            disabled={loading}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-900">{s.full_name}</span>
                              {selected && <CheckCircle2 className="h-5 w-5 text-purple-600" />}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              {s.enrollment_number && (
                                <span className="inline-flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  {s.enrollment_number}
                                </span>
                              )}
                              {s.department_name && (
                                <span className="inline-flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {s.department_name}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="h-11 px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-11 px-8 shadow-lg shadow-purple-500/30 text-base font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Create {roleLabels[formData.role]}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right: role explanation */}
          <div className="space-y-6">
            <Card className="shadow-sm border-slate-200 sticky top-6">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="text-sm font-semibold">Role Overview</CardTitle>
                <CardDescription>Key responsibilities for {roleLabels[formData.role]}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-slate-600 pt-4">
                {formData.role === 'admin' && (
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>Full access to all users and system settings</li>
                    <li>Can create, update, and deactivate accounts</li>
                    <li>Manages departments and programs</li>
                  </ul>
                )}
                {formData.role === 'teacher' && (
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>Can teach across multiple departments and programs</li>
                    <li>Manages assigned classes and courses</li>
                    <li>Takes attendance and grades assessments</li>
                    <li>Views only assigned students</li>
                    <li>Must be assigned to at least one course</li>
                  </ul>
                )}
                {formData.role === 'hod' && (
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>Oversees entire department operations</li>
                    <li>Reviews analytics and approves requests</li>
                    <li>Manages teachers and students in department</li>
                  </ul>
                )}
                {formData.role === 'student' && (
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>Access to enrolled classes and materials</li>
                    <li>Views grades and attendance records</li>
                    <li>Takes quizzes and submits assignments</li>
                  </ul>
                )}
                {formData.role === 'parent' && (
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>Views linked students' academic progress</li>
                    <li>Receives notifications about important events</li>
                    <li>Can view fees and payment history</li>
                  </ul>
                )}
                {(formData.role === 'hr' ||
                  formData.role === 'finance' ||
                  formData.role === 'staff') && (
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>Supports administrative operations</li>
                    <li>Access scoped to job responsibilities</li>
                    <li>Manages relevant department tasks</li>
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}