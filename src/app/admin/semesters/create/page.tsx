/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  Calendar,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  Sparkles,
  GraduationCap,
  BookOpen,
  Users,
  Award,
  Clock,
} from 'lucide-react';

import { supabase } from '@/lib/supabase/client';

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

const SEMESTER_TYPES = ['Fall', 'Spring', 'Summer', 'Winter'];

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming', color: 'bg-blue-500', icon: Clock },
  { value: 'active', label: 'Active', color: 'bg-green-500', icon: Sparkles },
  { value: 'completed', label: 'Completed', color: 'bg-gray-500', icon: Award },
];

// Component that uses useSearchParams - must be wrapped in Suspense
function CreateSemesterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get('id');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formProgress, setFormProgress] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    semester_type: '',
    year: new Date().getFullYear().toString(),
    department_id: '',
    program_id: '',
    start_date: '',
    end_date: '',
    status: 'upcoming',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate form progress
  useEffect(() => {
    const fields = [
      formData.name,
      formData.semester_type,
      formData.year,
      formData.department_id,
      formData.program_id,
      formData.start_date,
      formData.end_date,
    ];
    const filled = fields.filter(f => f && f.trim()).length;
    setFormProgress((filled / fields.length) * 100);
  }, [formData]);

  // Auth guard
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
      }
    };

    void checkAuth();
  }, [router]);

  // Load departments + programs
  useEffect(() => {
    const loadLookups = async () => {
      try {
        setLoadingLookups(true);
        setError(null);

        const [{ data: deptData, error: deptErr }, { data: progData, error: progErr }] =
          await Promise.all([
            supabase
              .from('departments')
              .select('id, name, code')
              .order('name'),
            supabase
              .from('programs')
              .select('id, name, code, department_id')
              .order('name'),
          ]);

        if (deptErr) {
          console.error('Failed to load departments:', deptErr);
          setError('Failed to load departments. Please refresh the page.');
        } else {
          const departmentsSafe: Department[] = (deptData ?? []).map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code,
          }));
          setDepartments(departmentsSafe);
        }

        if (progErr) {
          console.error('Failed to load programs:', progErr);
          setError((prev) => prev || 'Failed to load programs. Please refresh.');
        } else {
          const programsSafe: Program[] = (progData ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            department_id: p.department_id,
          }));
          setPrograms(programsSafe);
        }
      } catch (err: any) {
        console.error('Failed to load lookups', err);
        setError('Failed to load data. Please refresh the page.');
      } finally {
        setLoadingLookups(false);
      }
    };

    void loadLookups();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'department_id'
        ? { program_id: '' }
        : {}),
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Semester name is required';
    }

    if (!formData.department_id) {
      newErrors.department_id = 'Department is required';
    }

    if (!formData.program_id) {
      newErrors.program_id = 'Program is required';
    }

    if (!formData.semester_type) {
      newErrors.semester_type = 'Semester type is required';
    }

    if (!formData.year) {
      newErrors.year = 'Year is required';
    } else if (!/^\d{4}$/.test(formData.year)) {
      newErrors.year = 'Year must be a 4-digit number';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end <= start) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
      }

      if (!session) {
        setError('Your session has expired. Please log in again.');
        setLoading(false);
        router.push('/login');
        return;
      }

      // Check admin role
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', session.user.id)
        .single();

      if (userError || !userProfile) {
        throw new Error('User profile not found in database.');
      }

      if (userProfile.role !== 'admin') {
        throw new Error(
          `Permission denied. Your role is "${userProfile.role}", not "admin".`,
        );
      }

      // CHECK FOR EXISTING SEMESTER FIRST
      const { data: existingSemester, error: checkError } = await supabase
        .from('semesters')
        .select('id, name')
        .eq('program_id', formData.program_id)
        .eq('semester_type', formData.semester_type)
        .eq('year', parseInt(formData.year, 10))
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing semester:', checkError);
        throw new Error('Failed to check for existing semesters.');
      }

      if (existingSemester) {
        throw new Error(
          `A semester "${existingSemester.name}" with type "${formData.semester_type}" and year ${formData.year} already exists for this program. Please use a different combination.`
        );
      }

      const nowIso = new Date().toISOString();

      const semesterData = {
        name: formData.name.trim(),
        semester_type: formData.semester_type,
        year: parseInt(formData.year, 10),
        program_id: formData.program_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
        total_courses: 0,
        total_students: 0,
        credits_offered: 0,
        created_by: session.user.id,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const { error: insertError } = await supabase
        .from('semesters')
        .insert([semesterData]);

      if (insertError) {
        console.error(
          'Full insert error:',
          JSON.stringify(insertError, null, 2),
        );
        throw insertError;
      }

      setSuccess(true);

      setTimeout(() => {
        router.push('/admin/semesters');
      }, 2000);
    } catch (err: any) {
      console.error('Create semester error:', err);

      let errorMessage = 'Failed to create semester. ';

      if (err.message?.includes('role is not "admin"')) {
        errorMessage =
          'Permission denied: You must be an administrator to create semesters.';
      } else if (err.code === '42501') {
        errorMessage =
          'Security policy error. Check RLS policies on semesters table.';
      } else if (
        err.code === '23505' ||
        err.message?.includes('unique_semester_per_program') ||
        err.details?.includes('unique_semester_per_program')
      ) {
        errorMessage =
          'A semester with this type and year already exists for this program. Please use a different combination.';
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage += 'Please check your input and try again.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = formData.department_id
    ? programs.filter((p) => p.department_id === formData.department_id)
    : [];

  if (loadingLookups) {
    return (
      <div className="flex items-center justify-center min-h-screen ">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-indigo-600" />
            <Sparkles className="h-6 w-6 text-purple-400 absolute top-0 right-0 animate-pulse" />
          </div>
          <p className="text-gray-600 font-medium">Loading your workspace...</p>
          <p className="text-sm text-gray-400 mt-1">Preparing departments and programs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-5xl mx-auto space-y-6 p-6 py-8">
        {/* Header with back button */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/semesters')}
            disabled={loading}
            className="hover:bg-white/80 transition-all hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {editingId ? 'Edit Semester' : 'Create New Semester'}
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {editingId
                    ? 'Update details for this academic semester'
                    : 'Set up a new academic term for your institution'}
                </p>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 border-indigo-200 px-3 py-1"
          >
            <Shield className="h-3 w-3 mr-1" />
            Admin Only
          </Badge>
        </div>

        {/* Progress Bar */}
        {!success && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Form Progress</p>
                <p className="text-sm font-semibold text-indigo-600">{Math.round(formProgress)}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${formProgress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-0 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg animate-in slide-in-from-top">
            <div className="flex items-center space-x-3">
              <div className="bg-green-500 rounded-full p-1">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <AlertDescription className="text-green-800 font-medium">
                  🎉 Semester created successfully!
                </AlertDescription>
                <p className="text-sm text-green-600 mt-1">
                  Redirecting you to the semesters page...
                </p>
              </div>
            </div>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="shadow-lg animate-in slide-in-from-top">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Warning Alerts */}
        {departments.length === 0 && (
          <Alert className="border-amber-200 bg-amber-50 shadow-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              No departments found. Please create a department first before
              adding semesters.
            </AlertDescription>
          </Alert>
        )}

        {programs.length === 0 && (
          <Alert className="border-amber-200 bg-amber-50 shadow-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              No programs found. Please create a program first before adding
              semesters.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Context Section */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur hover:shadow-xl transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center text-lg">
                  <BookOpen className="h-5 w-5 mr-2 text-indigo-600" />
                  Academic Context
                </CardTitle>
                <CardDescription className="text-xs">
                  Select the department and program for this semester
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department_id" className="flex items-center">
                      Department <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select
                      value={formData.department_id}
                      onValueChange={(value) =>
                        handleSelectChange('department_id', value)
                      }
                      disabled={departments.length === 0}
                    >
                      <SelectTrigger
                        className={`${
                          errors.department_id
                            ? 'border-red-500 bg-red-50'
                            : 'bg-white hover:border-indigo-300'
                        } transition-colors`}
                      >
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            <div className="flex items-center">
                              <Badge variant="outline" className="mr-2 text-xs">
                                {dept.code}
                              </Badge>
                              {dept.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.department_id && (
                      <p className="text-xs text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.department_id}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="program_id" className="flex items-center">
                      Program <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select
                      value={formData.program_id}
                      onValueChange={(value) =>
                        handleSelectChange('program_id', value)
                      }
                      disabled={
                        filteredPrograms.length === 0 || !formData.department_id
                      }
                    >
                      <SelectTrigger
                        className={`${
                          errors.program_id
                            ? 'border-red-500 bg-red-50'
                            : 'bg-white hover:border-indigo-300'
                        } transition-colors`}
                      >
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {filteredPrograms.map((prog) => (
                          <SelectItem key={prog.id} value={prog.id}>
                            <div className="flex items-center">
                              <Badge variant="outline" className="mr-2 text-xs">
                                {prog.code}
                              </Badge>
                              {prog.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.program_id && (
                      <p className="text-xs text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.program_id}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identity Section */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur hover:shadow-xl transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center text-lg">
                  <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                  Semester Identity
                </CardTitle>
                <CardDescription className="text-xs">
                  Define the name, type, and academic year
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center">
                    Semester name <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Fall 2026 – BSCS"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`${
                      errors.name ? 'border-red-500 bg-red-50' : 'hover:border-indigo-300'
                    } transition-colors`}
                  />
                  <p className="text-xs text-gray-400 flex items-center">
                    💡 Use a clear label including season and year
                  </p>
                  {errors.name && (
                    <p className="text-xs text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="semester_type" className="flex items-center">
                      Semester type <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Select
                      value={formData.semester_type}
                      onValueChange={(value) =>
                        handleSelectChange('semester_type', value)
                      }
                    >
                      <SelectTrigger
                        className={`${
                          errors.semester_type
                            ? 'border-red-500 bg-red-50'
                            : 'bg-white hover:border-indigo-300'
                        } transition-colors`}
                      >
                        <SelectValue placeholder="Select semester type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {SEMESTER_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center">
                              {type === 'Fall' && '🍂'}
                              {type === 'Spring' && '🌸'}
                              {type === 'Summer' && '☀️'}
                              {type === 'Winter' && '❄️'}
                              <span className="ml-2">{type}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.semester_type && (
                      <p className="text-xs text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.semester_type}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year" className="flex items-center">
                      Year <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="year"
                      name="year"
                      type="number"
                      placeholder="e.g., 2026"
                      value={formData.year}
                      onChange={handleInputChange}
                      className={`${
                        errors.year ? 'border-red-500 bg-red-50' : 'hover:border-indigo-300'
                      } transition-colors`}
                    />
                    {errors.year && (
                      <p className="text-xs text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.year}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Section */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur hover:shadow-xl transition-shadow">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50">
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="h-5 w-5 mr-2 text-green-600" />
                  Timeline & Status
                </CardTitle>
                <CardDescription className="text-xs">
                  Set the semester duration and current status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="flex items-center">
                      Start date <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className={`${
                        errors.start_date ? 'border-red-500 bg-red-50' : 'hover:border-indigo-300'
                      } transition-colors`}
                    />
                    {errors.start_date && (
                      <p className="text-xs text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.start_date}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date" className="flex items-center">
                      End date <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="end_date"
                      name="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className={`${
                        errors.end_date ? 'border-red-500 bg-red-50' : 'hover:border-indigo-300'
                      } transition-colors`}
                    />
                    {errors.end_date && (
                      <p className="text-xs text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.end_date}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger className="bg-white hover:border-indigo-300 transition-colors">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {STATUS_OPTIONS.map((status) => {
                        const Icon = status.icon;
                        return (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center">
                              <div
                                className={`w-2 h-2 rounded-full ${status.color} mr-2`}
                              ></div>
                              <Icon className="h-4 w-4 mr-2 text-gray-500" />
                              {status.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-indigo-50/30 backdrop-blur">
                <CardHeader className="border-b bg-white/50">
                  <CardTitle className="text-base flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 text-indigo-600" />
                    Live Preview
                  </CardTitle>
                  <CardDescription className="text-xs">
                    See how your semester will appear
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="border-2 border-dashed border-indigo-200 rounded-xl p-5 bg-white/80 hover:border-indigo-300 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-bold text-lg text-gray-900">
                            {formData.name || 'Semester Name'}
                          </h3>
                          {formData.status && (
                            <Badge
                              className={`${
                                formData.status === 'active'
                                  ? 'bg-green-500'
                                  : formData.status === 'upcoming'
                                  ? 'bg-blue-500'
                                  : 'bg-gray-500'
                              } text-white`}
                            >
                              {formData.status.charAt(0).toUpperCase() +
                                formData.status.slice(1)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          {formData.semester_type && (
                            <>
                              {formData.semester_type === 'Fall' && '🍂'}
                              {formData.semester_type === 'Spring' && '🌸'}
                              {formData.semester_type === 'Summer' && '☀️'}
                              {formData.semester_type === 'Winter' && '❄️'}
                            </>
                          )}
                          <span className="font-medium">
                            {formData.semester_type || 'Type'} {formData.year || 'Year'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                        <span className="font-medium">
                          {formData.start_date
                            ? new Date(formData.start_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Start date'}
                        </span>
                        <span className="mx-2">→</span>
                        <span className="font-medium">
                          {formData.end_date
                            ? new Date(formData.end_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'End date'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-blue-50 rounded-lg p-2">
                          <BookOpen className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                          <p className="text-xs font-semibold text-blue-900">0</p>
                          <p className="text-xs text-blue-600">Courses</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <Users className="h-4 w-4 mx-auto text-green-600 mb-1" />
                          <p className="text-xs font-semibold text-green-900">0</p>
                          <p className="text-xs text-green-600">Students</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2">
                          <Award className="h-4 w-4 mx-auto text-purple-600 mb-1" />
                          <p className="text-xs font-semibold text-purple-900">0</p>
                          <p className="text-xs text-purple-600">Credits</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Tips */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50 to-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center text-amber-800">
                    💡 Quick Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-amber-700 space-y-2">
                  <p className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Use descriptive names like "Fall 2026 - Computer Science"</span>
                  </p>
                  <p className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Each program can only have one semester per type/year</span>
                  </p>
                  <p className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Set status to "upcoming" for future semesters</span>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {formProgress === 100 ? (
                  <span className="text-green-600 font-medium flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    All fields completed!
                  </span>
                ) : (
                  <span>Fill in all required fields to continue</span>
                )}
              </div>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/semesters')}
                  disabled={loading}
                  className="hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    loading || departments.length === 0 || programs.length === 0
                  }
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating semester...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {editingId ? 'Save changes' : 'Create semester'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main export with Suspense wrapper
export default function CreateSemesterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600 font-medium">Loading page...</p>
        </div>
      </div>
    }>
      <CreateSemesterContent />
    </Suspense>
  );
}