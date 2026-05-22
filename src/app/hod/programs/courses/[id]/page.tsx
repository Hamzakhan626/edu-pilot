/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  BookOpen,
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  Eye,
  Download,
  Users,
  UserPlus,
  UserMinus,
  Mail,
  Phone,
  MoreVertical,
  Filter,
  Activity,
  ListChecks,
} from 'lucide-react';

// ---------- Type definitions ----------
type Course = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
  teacher_id: string | null;
  teacher: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  order_number: number;
  duration_minutes: number | null;
  is_published: boolean;
  file_url?: string | null;
};

type EnrolledStudent = {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_date: string;
  status: 'enrolled' | 'completed' | 'dropped' | 'failed';
  grade: string | null;
  student: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
};

type AvailableStudent = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
};

type Quiz = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  question_count?: number;
  created_at: string;
};

export default function HoDCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  // ---------- States ----------
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({ totalDuration: 0, publishedLessons: 0, avgLessonDuration: 0 });

  // Modals & form
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<EnrolledStudent | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizCreating, setQuizCreating] = useState(false);

  // ---------- Data fetching (optimised) ----------

  const loadCourseAndLessons = async () => {
    try {
      setLoading(true);

      // 1) Course + teacher in one query
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*, teacher:users!teacher_id(id, name, email)')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData as unknown as Course);

      // 2) Lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_number', { ascending: true });

      if (lessonsError) throw lessonsError;
      const lessonsList = lessonsData || [];
      setLessons(lessonsList);

      const totalDuration = lessonsList.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
      const publishedLessons = lessonsList.filter(l => l.is_published).length;
      const avgLessonDuration = lessonsList.length > 0 ? Math.round(totalDuration / lessonsList.length) : 0;
      setStats({ totalDuration, publishedLessons, avgLessonDuration });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const loadEnrolledStudents = async () => {
    try {
      setStudentsLoading(true);

      const { data, error } = await supabase
        .from('student_courses')
        .select('*, student:users!student_id(id, email, full_name, phone, avatar_url)')
        .eq('course_id', courseId)
        .order('enrollment_date', { ascending: false });

      if (error) throw error;

      const transformed: EnrolledStudent[] = (data || []).map((enrollment: any) => ({
        ...enrollment,
        student: enrollment.student || {
          id: enrollment.student_id,
          email: 'Unknown',
          full_name: 'Unknown',
          phone: null,
          avatar_url: null,
        },
      }));

      setEnrolledStudents(transformed);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadAvailableStudents = async () => {
    try {
      const { data: allStudents, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone')
        .eq('role', 'student')
        .order('full_name');

      if (error) throw error;

      const enrolledIds = enrolledStudents.map(e => e.student_id);
      const available = (allStudents || []).filter(s => !enrolledIds.includes(s.id));
      setAvailableStudents(available);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load available students');
    }
  };

  const loadQuizzes = async () => {
    try {
      setQuizzesLoading(true);
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (err: any) {
      toast.error('Failed to load quizzes');
    } finally {
      setQuizzesLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      void loadCourseAndLessons();
      void loadEnrolledStudents();
      void loadQuizzes();
    }
  }, [courseId]);

  useEffect(() => {
    if (showEnrollModal) {
      void loadAvailableStudents();
    }
  }, [showEnrollModal, enrolledStudents]);

  // ---------- Event handlers ----------

  const handleEnrollStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }
    try {
      setEnrolling(true);
      const enrollments = selectedStudents.map(studentId => ({
        student_id: studentId,
        course_id: courseId,
        status: 'enrolled',
      }));

      const { error } = await supabase.from('student_courses').insert(enrollments);
      if (error) throw error;

      toast.success(`Enrolled ${selectedStudents.length} student(s)`);
      setShowEnrollModal(false);
      setSelectedStudents([]);
      void loadEnrolledStudents();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to enroll students');
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToRemove) return;
    try {
      const { error } = await supabase
        .from('student_courses')
        .delete()
        .eq('id', studentToRemove.id);
      if (error) throw error;

      toast.success('Student removed');
      setStudentToRemove(null);
      void loadEnrolledStudents();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove student');
    }
  };

  const handleUpdateStatus = async (enrollmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('student_courses')
        .update({ status: newStatus })
        .eq('id', enrollmentId);
      if (error) throw error;

      toast.success('Status updated');
      void loadEnrolledStudents();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
      toast.success('Lesson deleted');
      setLessons(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete lesson');
    }
  };

  const handleDownloadLesson = async (lesson: Lesson) => {
    // Basic download logic – adjust as needed
    try {
      if (lesson.file_url) {
        const link = document.createElement('a');
        link.href = lesson.file_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = lesson.slug || 'lesson';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.info('No file attached');
      }
    } catch (err: any) {
      toast.error('Download failed');
    }
  };

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) return;
    try {
      setQuizCreating(true);
      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          course_id: courseId,
          title: quizTitle.trim(),
          description: quizDescription.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Quiz created');
      setQuizzes(prev => [data, ...prev]);
      setShowQuizModal(false);
      setQuizTitle('');
      setQuizDescription('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create quiz');
    } finally {
      setQuizCreating(false);
    }
  };

  // ---------- Filtered lists ----------
  const filteredLessons = useMemo(() => {
    const q = search.toLowerCase().trim();
    return lessons.filter(l =>
      !q || l.title.toLowerCase().includes(q) || (l.description ?? '').toLowerCase().includes(q)
    );
  }, [lessons, search]);

  const filteredEnrolledStudents = useMemo(() => {
    const q = enrollmentSearch.toLowerCase().trim();
    return enrolledStudents.filter(e => {
      const st = e.student;
      const matches = !q ||
        st.full_name?.toLowerCase().includes(q) ||
        st.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matches && matchesStatus;
    });
  }, [enrolledStudents, enrollmentSearch, statusFilter]);

  const filteredAvailable = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    return availableStudents.filter(s =>
      !q || s.full_name?.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [availableStudents, studentSearch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enrolled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'dropped': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // ---------- Loading state ----------
  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/hod/programs')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Programs
              </Button>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{course.code}</Badge>
                  <span className="text-sm text-slate-500">
                    {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-sm text-slate-400">•</span>
                  <span className="text-sm text-slate-500">
                    {enrolledStudents.length} student{enrolledStudents.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard icon={BookOpen} color="purple" label="Total Lessons" value={lessons.length} />
          <StatCard icon={Users} color="blue" label="Enrolled" value={enrolledStudents.length} />
          <StatCard icon={Clock} color="orange" label="Duration" value={`${stats.totalDuration}m`} />
          <StatCard icon={CheckCircle} color="green" label="Published" value={stats.publishedLessons} />
          <StatCard icon={Activity} color="indigo" label="Avg. Lesson" value={`${stats.avgLessonDuration}m`} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="lessons" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="lessons">
              <BookOpen className="h-4 w-4 mr-2" /> Lessons ({lessons.length})
            </TabsTrigger>
            <TabsTrigger value="students">
              <Users className="h-4 w-4 mr-2" /> Students ({enrolledStudents.length})
            </TabsTrigger>
            <TabsTrigger value="quizzes">
              <ListChecks className="h-4 w-4 mr-2" /> Quizzes ({quizzes.length})
            </TabsTrigger>
          </TabsList>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Course Lessons</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search lessons..."
                  className="pl-9"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
            ) : filteredLessons.length === 0 ? (
              <EmptyState icon={BookOpen} message="No lessons found" />
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 hidden sm:grid grid-cols-12 gap-4 text-sm font-medium text-slate-500">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Title</div>
                  <div className="col-span-2">Duration</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {filteredLessons.map(lesson => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    onEdit={() => router.push(`/hod/lessons/${lesson.id}/edit`)}
                    onDelete={() => handleDeleteLesson(lesson.id)}
                    onDownload={() => handleDownloadLesson(lesson)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Enrolled Students</h2>
              <div className="flex items-center gap-4">
                <FilterSelect value={statusFilter} onChange={setStatusFilter} />
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={enrollmentSearch}
                    onChange={e => setEnrollmentSearch(e.target.value)}
                    placeholder="Search students..."
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => setShowEnrollModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" /> Enroll
                </Button>
              </div>
            </div>

            {studentsLoading ? (
              <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
            ) : filteredEnrolledStudents.length === 0 ? (
              <EmptyState icon={Users} message="No students enrolled" />
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 hidden sm:grid grid-cols-12 gap-4 text-sm font-medium text-slate-500">
                  <div className="col-span-4">Student</div>
                  <div className="col-span-3">Contact</div>
                  <div className="col-span-2">Enrolled</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
                {filteredEnrolledStudents.map(enrollment => (
                  <StudentRow
                    key={enrollment.id}
                    enrollment={enrollment}
                    onUpdateStatus={(status: string) => handleUpdateStatus(enrollment.id, status)}
                    onRemove={() => setStudentToRemove(enrollment)}
                    onViewProfile={() => router.push(`/hod/students/${enrollment.student_id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Quizzes</h2>
              <Dialog open={showQuizModal} onOpenChange={setShowQuizModal}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quiz
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] bg-white">
                  <DialogHeader>
                    <DialogTitle>Create New Quiz</DialogTitle>
                    <DialogDescription>
                      Add a quiz for {course?.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Quiz Title *</Label>
                      <Input
                        value={quizTitle}
                        onChange={e => setQuizTitle(e.target.value)}
                        placeholder="e.g., Mid-Term Assessment"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={quizDescription}
                        onChange={e => setQuizDescription(e.target.value)}
                        placeholder="Optional description..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowQuizModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateQuiz} disabled={quizCreating || !quizTitle.trim()}>
                      {quizCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {quizzesLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <ListChecks className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">No quizzes yet</p>
                <Button variant="outline" onClick={() => setShowQuizModal(true)}>
                  Create your first quiz
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map(quiz => (
                  <Card key={quiz.id} className="border-slate-200 hover:border-purple-200 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">{quiz.title}</h3>
                          {quiz.description && (
                            <p className="text-sm text-slate-500 mt-1">{quiz.description}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-2">
                            {quiz.question_count || 0} question{(quiz.question_count || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/hod/programs/courses/${courseId}/quizzes/${quiz.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Manage Questions
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Enroll Students Modal */}
      <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Enroll Students in {course.name}</DialogTitle>
            <DialogDescription>Select students to add.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <Input
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="Search available students..."
              className="mb-4"
            />
            {filteredAvailable.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No available students.</p>
            ) : (
              <div className="space-y-2">
                {filteredAvailable.map(student => (
                  <StudentSelectItem
                    key={student.id}
                    student={student}
                    selected={selectedStudents.includes(student.id)}
                    onToggle={() =>
                      setSelectedStudents(prev =>
                        prev.includes(student.id)
                          ? prev.filter(id => id !== student.id)
                          : [...prev, student.id]
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-slate-600">{selectedStudents.length} selected</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowEnrollModal(false); setSelectedStudents([]); }}>
                  Cancel
                </Button>
                <Button onClick={handleEnrollStudents} disabled={selectedStudents.length === 0 || enrolling}>
                  {enrolling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enroll {selectedStudents.length > 0 && `(${selectedStudents.length})`}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student Confirmation */}
      <AlertDialog open={!!studentToRemove} onOpenChange={() => setStudentToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{studentToRemove?.student.full_name || studentToRemove?.student.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveStudent} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------- Reusable sub-components ----------

const StatCard = ({ icon: Icon, color, label, value }: any) => (
  <Card className="border-slate-200">
    <CardContent className="p-5 flex items-center gap-3">
      <div className={`w-12 h-12 rounded-lg bg-${color}-100 flex items-center justify-center`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({ icon: Icon, message }: any) => (
  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
    <Icon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
    <p className="text-slate-500">{message}</p>
  </div>
);

const FilterSelect = ({ value, onChange }: any) => (
  <div className="flex items-center gap-2">
    <Filter className="h-4 w-4 text-slate-400" />
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="enrolled">Enrolled</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
        <SelectItem value="dropped">Dropped</SelectItem>
        <SelectItem value="failed">Failed</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

const LessonRow = ({ lesson, onEdit, onDelete, onDownload }: any) => (
  <div className="bg-white rounded-lg border border-slate-200 p-4 hover:border-purple-200 transition-colors">
    <div className="grid grid-cols-12 gap-4 items-center">
      <div className="col-span-1">
        <div className="w-8 h-8 rounded-md bg-purple-100 flex items-center justify-center font-semibold text-purple-700">
          {lesson.order_number}
        </div>
      </div>
      <div className="col-span-5">
        <h3 className="font-medium text-slate-900">{lesson.title}</h3>
        {lesson.description && <p className="text-sm text-slate-500 line-clamp-1">{lesson.description}</p>}
      </div>
      <div className="col-span-2 text-slate-600">{lesson.duration_minutes ? `${lesson.duration_minutes}m` : '—'}</div>
      <div className="col-span-2">
        {lesson.is_published ? (
          <Badge className="bg-green-100 text-green-800 border-green-200">Published</Badge>
        ) : (
          <Badge variant="outline">Draft</Badge>
        )}
      </div>
      <div className="col-span-2 flex justify-end gap-2">
        <TooltipProvider>
          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" onClick={onDownload}><Download className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Download</TooltipContent></Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" onClick={onEdit}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-red-500" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
        </TooltipProvider>
      </div>
    </div>
  </div>
);

const StudentRow = ({ enrollment, onUpdateStatus, onRemove, onViewProfile }: any) => (
  <div className="bg-white rounded-lg border border-slate-200 p-4 hover:border-blue-200 transition-colors">
    <div className="grid grid-cols-12 gap-4 items-center">
      <div className="col-span-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
          {enrollment.student.full_name?.charAt(0).toUpperCase() || enrollment.student.email.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="font-medium text-slate-900">{enrollment.student.full_name || 'No Name'}</h3>
          <p className="text-sm text-slate-500">{enrollment.student.email}</p>
        </div>
      </div>
      <div className="col-span-3 text-slate-600">{enrollment.student.phone || '—'}</div>
      <div className="col-span-2 text-slate-600">{new Date(enrollment.enrollment_date).toLocaleDateString()}</div>
      <div className="col-span-2">
        <Select value={enrollment.status} onValueChange={onUpdateStatus}>
          <SelectTrigger className={`w-full ${getStatusClass(enrollment.status)}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enrolled">Enrolled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="dropped">Dropped</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-1 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewProfile}><Eye className="h-4 w-4 mr-2" /> View Profile</DropdownMenuItem>
            <DropdownMenuItem><Mail className="h-4 w-4 mr-2" /> Send Email</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={onRemove}><UserMinus className="h-4 w-4 mr-2" /> Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
);

const StudentSelectItem = ({ student, selected, onToggle }: any) => (
  <div
    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
      selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
    }`}
    onClick={onToggle}
  >
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
        selected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
      }`}>
        {selected && <CheckCircle className="h-4 w-4 text-white" />}
      </div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
        {student.full_name?.charAt(0)?.toUpperCase() || student.email.charAt(0).toUpperCase()}
      </div>
      <div>
        <h4 className="font-medium text-slate-900">{student.full_name || 'No Name'}</h4>
        <p className="text-sm text-slate-500">{student.email}</p>
      </div>
    </div>
  </div>
);

const getStatusClass = (status: string) => {
  switch (status) {
    case 'enrolled': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'dropped': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'failed': return 'bg-red-100 text-red-800 border-red-200';
    default: return '';
  }
};