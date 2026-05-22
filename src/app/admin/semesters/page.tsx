/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/semesters/page.tsx
'use client';

import { useEffect, useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  CalendarRange,
  Plus,
  Loader2,
  AlertCircle,
  Shield,
  Edit,
  Trash2,
  BookOpen,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  GraduationCap,
} from 'lucide-react';

import { supabase } from '@/lib/supabase/client';

type Semester = {
  id: string;
  name: string;
  semester_type: string;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  total_courses: number | null;
  total_students: number | null;
  credits_offered: number | null;
  program: {
    id: string;
    name: string;
    code: string;
  } | null;
};

const STATUS_STYLES: Record<string, { label: string; className: string; icon: any }> = {
  upcoming: {
    label: 'Upcoming',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Clock,
  },
  active: {
    label: 'Active',
    className: 'bg-green-50 text-green-700 border-green-200',
    icon: TrendingUp,
  },
  completed: {
    label: 'Completed',
    className: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: Calendar,
  },
};

export default function SemestersPage() {
  const router = useRouter();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auth + admin guard
  useEffect(() => {
    const checkAuthAndRole = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace('/login');
          return;
        }

        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', session.user.id)
          .single();

        if (userError || !userProfile) {
          setError('User profile not found. Please contact administrator.');
          return;
        }

        if (userProfile.role !== 'admin') {
          setError(
            'Access denied: Only administrators can view semesters page.',
          );
          return;
        }
      } catch (err: any) {
        console.error('Auth check error:', err);
        setError('Failed to verify your session. Please log in again.');
      } finally {
        setAuthChecking(false);
      }
    };

    void checkAuthAndRole();
  }, [router]);

  // Load semesters
  useEffect(() => {
    if (authChecking || error) return;

    const loadSemesters = async () => {
      setLoading(true);
      try {
        const { data, error: semError } = await supabase
          .from('semesters')
          .select(
            `
            id,
            name,
            semester_type,
            year,
            start_date,
            end_date,
            status,
            total_courses,
            total_students,
            credits_offered,
            program:programs (
              id,
              name,
              code
            )
          `,
          )
          .order('year', { ascending: false })
          .order('start_date', { ascending: false });

        if (semError) {
          console.error('Failed to load semesters (debug):', semError);
          setError(
            semError.message ||
              'Failed to load semesters. Please check Supabase schema and RLS.',
          );
          return;
        }

        const safeSemesters: Semester[] = (data ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          semester_type: s.semester_type,
          year: s.year,
          start_date: s.start_date,
          end_date: s.end_date,
          status: s.status,
          total_courses: s.total_courses ?? 0,
          total_students: s.total_students ?? 0,
          credits_offered: s.credits_offered ?? 0,
          program: s.program
            ? {
                id: s.program.id,
                name: s.program.name,
                code: s.program.code,
              }
            : null,
        }));

        setSemesters(safeSemesters);
      } catch (err: any) {
        console.error('Load semesters error:', err);
        setError('Failed to load semesters. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    void loadSemesters();
  }, [authChecking, error]);

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const key = status?.toLowerCase();
    const cfg = STATUS_STYLES[key] ?? {
      label: status || 'Unknown',
      className: 'bg-gray-50 text-gray-700 border-gray-200',
      icon: Calendar,
    };
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`${cfg.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  const handleView = (id: string) => {
    router.push(`/admin/semesters/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/admin/semesters/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this semester?')) return;

    try {
      setDeletingId(id);
      const { error: delError } = await supabase
        .from('semesters')
        .delete()
        .eq('id', id);

      if (delError) {
        console.error('Delete semester error:', delError);
        setError(
          delError.message ||
            'Failed to delete semester. Check RLS policies or dependencies.',
        );
        return;
      }

      setSemesters((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      console.error('Delete semester error (catch):', err);
      setError('Failed to delete semester. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Calculate statistics
  const stats = {
    total: semesters.length,
    active: semesters.filter((s) => s.status === 'active').length,
    upcoming: semesters.filter((s) => s.status === 'upcoming').length,
    totalStudents: semesters.reduce((sum, s) => sum + (s.total_students || 0), 0),
  };

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary relative" />
          </div>
          <p className="text-gray-600 font-medium">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-200">
              <CalendarRange className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Semesters
                </h1>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Admin Only
                </Badge>
              </div>
              <p className="text-gray-600 mt-2">
                Manage academic semesters across all programs
              </p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/admin/semesters/create')}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-200 transition-all duration-200"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            New Semester
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-sm font-medium text-blue-100">
                Total Semesters
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold">{stats.total}</p>
                  <p className="text-xs text-blue-100 mt-1">All time</p>
                </div>
                <CalendarRange className="h-10 w-10 text-white/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-sm font-medium text-green-100">
                Active Now
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold">{stats.active}</p>
                  <p className="text-xs text-green-100 mt-1">Running</p>
                </div>
                <TrendingUp className="h-10 w-10 text-white/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-sm font-medium text-purple-100">
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold">{stats.upcoming}</p>
                  <p className="text-xs text-purple-100 mt-1">Scheduled</p>
                </div>
                <Clock className="h-10 w-10 text-white/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-sm font-medium text-orange-100">
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold">{stats.totalStudents}</p>
                  <p className="text-xs text-orange-100 mt-1">Enrolled</p>
                </div>
                <GraduationCap className="h-10 w-10 text-white/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Content */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="text-xl">All Semesters</CardTitle>
            <CardDescription>
              View and manage semesters by program, year, and status
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4 text-gray-500">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                    <Loader2 className="h-8 w-8 animate-spin relative text-primary" />
                  </div>
                  <span className="font-medium">Loading semesters...</span>
                </div>
              </div>
            ) : semesters.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center bg-gray-50/50">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-gray-100">
                    <CalendarRange className="h-12 w-12 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No semesters found
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Create your first semester to start organizing academic terms and managing courses.
                </p>
                <Button
                  onClick={() => router.push('/admin/semesters/create')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Semester
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {semesters.map((sem) => (
                  <div
                    key={sem.id}
                    className="group border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer"
                    onClick={() => handleView(sem.id)}
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-bold text-xl text-gray-900 group-hover:text-blue-600 transition-colors">
                          {sem.name}
                        </h2>
                        {getStatusBadge(sem.status)}
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        {sem.semester_type} {sem.year}
                        {sem.program && (
                          <span className="text-gray-400">
                            {' '}
                            • {sem.program.name} ({sem.program.code})
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {formatDate(sem.start_date)} → {formatDate(sem.end_date)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700">
                          <BookOpen className="h-4 w-4" />
                          <span className="font-semibold">{sem.total_courses ?? 0}</span>
                          <span className="text-blue-600">courses</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700">
                          <Users className="h-4 w-4" />
                          <span className="font-semibold">{sem.total_students ?? 0}</span>
                          <span className="text-purple-600">students</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700">
                          <GraduationCap className="h-4 w-4" />
                          <span className="font-semibold">{sem.credits_offered ?? 0}</span>
                          <span className="text-green-600">credits</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(sem.id)}
                        className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(sem.id)}
                        disabled={deletingId === sem.id}
                        className="hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      >
                        {deletingId === sem.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}