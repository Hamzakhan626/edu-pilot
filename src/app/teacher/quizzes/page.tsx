/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

/**
 * FILE: app/teacher/quizzes/page.tsx
 *
 * SCHEMA RELATIONSHIPS USED:
 * - users (teacher auth)
 * - teacher_courses (teacher_id -> users.id, course_id -> courses.id)
 * - courses (id, code, name, section, semester, students, program_id, department_id, teacher_id)
 * - programs (id, name, department_id)
 * - departments (id, name)
 * - student_courses (student_id -> users.id, course_id -> courses.id)
 * - quizzes (id, course_id, title, description, total_questions, passing_score, time_limit_minutes,
 *            type, difficulty, scheduled_at, status, allow_late_submission, show_results,
 *            shuffle_questions, created_by, section, created_at, updated_at)
 * - quiz_questions (id, quiz_id, question_text, question_type, options jsonb, correct_answer,
 *                   points, question_order)
 * - quiz_submissions (id, quiz_id, student_id, started_at, submitted_at, time_spent_seconds,
 *                     answers jsonb, auto_score, manual_score, total_score, percentage,
 *                     status, teacher_notes, graded_by, graded_at)
 * - quiz_attempts (id, quiz_id, student_id, score, total_score, percentage, status,
 *                  started_at, completed_at, answers jsonb)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from '@/components/ui/dialog';
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
import {
  Brain,
  Clock,
  Users,
  Target,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Download,
  Copy,
  Send,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  BarChart3,
  RefreshCw,
  Loader2,
  Sparkles,
  Wand2,
  X,
  Check,
  GripVertical,
  PlusCircle,
  MinusCircle,
  FileText,
  Star,
  TrendingUp,
  Award,
  Zap,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  MoreVertical,
  PlayCircle,
  PauseCircle,
  Save,
  AlertTriangle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  code: string;
  name: string;
  section?: string | null;
  semester?: number | null;
  students?: number | null;
  teacher_id?: string | null;
  program_id?: string | null;
  department_id?: string | null;
  program?: { id: string; name: string; department?: { name: string } | null } | null;
}

interface QuizQuestion {
  id?: string;
  quiz_id?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'essay';
  options: string[];
  correct_answer: string;
  points: number;
  question_order: number;
}

interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  total_questions?: number | null;
  passing_score?: number | null;
  time_limit_minutes?: number | null;
  type?: string | null;
  difficulty?: string | null;
  status: string;
  scheduled_at?: string | null;
  allow_late_submission?: boolean;
  show_results?: boolean;
  shuffle_questions?: boolean;
  created_by?: string | null;
  section?: string | null;
  created_at: string;
  updated_at?: string;
  _submissionCount?: number;
  _avgScore?: number | null;
  _questions?: QuizQuestion[];
}

interface StudentWithStats {
  id: string;
  full_name?: string | null;
  email: string;
  enrollment_number?: string | null;
  quizzesTaken: number;
  avgScore: number;
  lastActivity?: string | null;
}

interface QuizSubmissionDetail {
  id: string;
  student_id: string;
  student?: { full_name?: string | null; email: string; enrollment_number?: string | null };
  status: string;
  percentage?: number | null;
  total_score?: number | null;
  submitted_at?: string | null;
  teacher_notes?: string | null;
  graded_at?: string | null;
}

// ─── AI Question Generation ────────────────────────────────────────────────────

async function generateQuestionsWithAI(params: {
  topic: string;
  courseContext: string;
  numQuestions: number;
  difficulty: string;
  type: string;
}): Promise<QuizQuestion[]> {
  const systemPrompt = `You are an expert academic quiz creator. Generate quiz questions strictly as a JSON array. 
Return ONLY a valid JSON array, no markdown, no explanation, no backticks.
Each question object must have these exact fields:
- question_text: string
- question_type: "multiple_choice" | "short_answer" | "essay"
- options: string[] (4 options for multiple_choice, [] for others)
- correct_answer: string (the correct option text for MC, model answer for others)
- points: number (1-5)
- question_order: number (1-based index)`;

  const userPrompt = `Generate ${params.numQuestions} ${params.difficulty} ${params.type === 'multiple_choice' ? 'multiple choice' : 'mixed'} questions about:
Topic: ${params.topic}
Course context: ${params.courseContext}
Difficulty: ${params.difficulty}
All questions must be academically rigorous and appropriate for university level.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) throw new Error(`AI API error: ${response.status}`);
  const data = await response.json();
  const text = data.content?.[0]?.text || '[]';

  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function generateQuizInsights(params: {
  quizTitle: string;
  avgScore: number;
  submissionCount: number;
  passing_score: number;
  studentPerformances: { name: string; score: number }[];
}): Promise<string> {
  const prompt = `Analyze this quiz performance data and give 3-4 concise, actionable insights for a teacher:
Quiz: "${params.quizTitle}"
Average Score: ${params.avgScore}%
Pass Rate: ${params.passing_score}% threshold
Total Submissions: ${params.submissionCount}
Top/Bottom performers: ${JSON.stringify(params.studentPerformances.slice(0, 5))}

Provide insights about learning gaps, pacing recommendations, and which students need extra support. Be specific and concise. Use bullet points.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error('AI insights failed');
  const data = await response.json();
  return data.content?.[0]?.text || 'Unable to generate insights.';
}

// ─── Helper Components ─────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; class: string }> = {
    draft: { label: 'Draft', class: 'bg-amber-100 text-amber-700 border-amber-200' },
    scheduled: { label: 'Scheduled', class: 'bg-blue-100 text-blue-700 border-blue-200' },
    active: { label: 'Active', class: 'bg-green-100 text-green-700 border-green-200' },
    published: { label: 'Published', class: 'bg-green-100 text-green-700 border-green-200' },
    completed: { label: 'Completed', class: 'bg-slate-100 text-slate-600 border-slate-200' },
    cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-600 border-red-200' },
  };
  const s = map[status] ?? { label: status, class: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.class}`}>
      {s.label}
    </span>
  );
};

const DifficultyBadge = ({ difficulty }: { difficulty?: string | null }) => {
  const map: Record<string, string> = {
    easy: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    hard: 'bg-red-100 text-red-700',
  };
  const d = difficulty ?? 'medium';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${map[d] ?? 'bg-slate-100 text-slate-600'}`}>
      {d}
    </span>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TeacherQuizzesPage() {
  // Auth & navigation
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [view, setView] = useState<'courses' | 'course-detail'>('courses');
  const [activeTab, setActiveTab] = useState('overview');

  // Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmissionDetail[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentWithStats | null>(null);

  // AI
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState('10');
  const [aiQuestionType, setAiQuestionType] = useState('multiple_choice');
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<QuizQuestion[]>([]);

  // Create form
  const emptyForm = {
    title: '', description: '', type: 'Quick Quiz', difficulty: 'medium',
    total_questions: '10', time_limit_minutes: '30', passing_score: '70',
    scheduled_at: '', allow_late_submission: false, show_results: true,
    shuffle_questions: false, section: '',
  };
  const [createForm, setCreateForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // ─── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setTeacherId(user.id);
      else { setError('Not authenticated'); setLoading(false); }
    });
  }, []);

  // ─── Fetch Courses ─────────────────────────────────────────────────────────

  const fetchCourses = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    setError(null);
    try {
      // Get course IDs from teacher_courses junction
      const { data: tc, error: tcErr } = await supabase
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', teacherId);

      if (tcErr) throw tcErr;
      const courseIds = (tc ?? []).map((r: any) => r.course_id);

      // Also check courses.teacher_id directly (some rows may not use junction)
      const { data: directCourses, error: dcErr } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', teacherId);

      const directIds = (directCourses ?? []).map((r: any) => r.id);
      const allIds = Array.from(new Set([...courseIds, ...directIds]));

      if (allIds.length === 0) { setCourses([]); setLoading(false); return; }

      const { data: courseData, error: courseErr } = await supabase
        .from('courses')
        .select(`
          id, code, name, section, semester, students, teacher_id,
          program_id, department_id,
          programs:program_id (
            id, name,
            departments:department_id ( name )
          )
        `)
        .in('id', allIds)
        .order('code');

      if (courseErr) throw courseErr;

      const transformed: Course[] = (courseData ?? []).map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        section: c.section,
        semester: c.semester,
        students: c.students,
        teacher_id: c.teacher_id,
        program_id: c.program_id,
        department_id: c.department_id,
        program: c.programs
          ? {
              id: c.programs.id,
              name: c.programs.name,
              department: c.programs.departments ?? null,
            }
          : null,
      }));

      setCourses(transformed);
    } catch (e: any) {
      console.error('fetchCourses:', e);
      setError(e?.message ?? 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => { if (teacherId) fetchCourses(); }, [teacherId, fetchCourses]);

  // ─── Fetch Quizzes ─────────────────────────────────────────────────────────

  const fetchQuizzes = useCallback(async (courseId: string) => {
    setQuizLoading(true);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich each quiz with submission count & avg score
      const enriched = await Promise.all(
        (data ?? []).map(async (quiz: any) => {
          const { data: subs } = await supabase
            .from('quiz_submissions')
            .select('id, percentage, status')
            .eq('quiz_id', quiz.id);

          const submissionCount = subs?.length ?? 0;
          const graded = (subs ?? []).filter((s: any) => s.percentage !== null);
          const avgScore =
            graded.length > 0
              ? Math.round(graded.reduce((a: number, s: any) => a + (s.percentage ?? 0), 0) / graded.length)
              : null;

          // Also fetch question count
          const { count: qCount } = await supabase
            .from('quiz_questions')
            .select('id', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id);

          return {
            ...quiz,
            total_questions: qCount ?? quiz.total_questions ?? 0,
            _submissionCount: submissionCount,
            _avgScore: avgScore,
          } as Quiz;
        })
      );

      setQuizzes(enriched);
    } catch (e: any) {
      console.error('fetchQuizzes:', e);
    } finally {
      setQuizLoading(false);
    }
  }, []);

  // ─── Fetch Students ────────────────────────────────────────────────────────

  const fetchStudents = useCallback(async (courseId: string) => {
    try {
      const { data: sc } = await supabase
        .from('student_courses')
        .select('student_id')
        .eq('course_id', courseId);

      const sIds = (sc ?? []).map((r: any) => r.student_id).filter(Boolean);
      if (sIds.length === 0) { setStudents([]); return; }

      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email, enrollment_number')
        .in('id', sIds);

      // Get quiz attempts for all quizzes in this course
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('id')
        .eq('course_id', courseId);
      const qIds = (quizData ?? []).map((q: any) => q.id);

      const studentsWithStats: StudentWithStats[] = await Promise.all(
        (users ?? []).map(async (u: any) => {
          let quizzesTaken = 0;
          let avgScore = 0;
          let lastActivity: string | null = null;

          if (qIds.length > 0) {
            const { data: attempts } = await supabase
              .from('quiz_submissions')
              .select('percentage, submitted_at, status')
              .eq('student_id', u.id)
              .in('quiz_id', qIds)
              .eq('status', 'submitted');

            quizzesTaken = attempts?.length ?? 0;
            const scored = (attempts ?? []).filter((a: any) => a.percentage !== null);
            avgScore = scored.length > 0
              ? Math.round(scored.reduce((sum: number, a: any) => sum + a.percentage, 0) / scored.length)
              : 0;
            lastActivity = attempts?.sort((a: any, b: any) =>
              new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
            )[0]?.submitted_at ?? null;
          }

          return {
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            enrollment_number: u.enrollment_number,
            quizzesTaken,
            avgScore,
            lastActivity,
          };
        })
      );

      setStudents(studentsWithStats.sort((a, b) => b.avgScore - a.avgScore));
    } catch (e: any) {
      console.error('fetchStudents:', e);
      setStudents([]);
    }
  }, []);

  // ─── Fetch Submissions for a Quiz ─────────────────────────────────────────

  const fetchSubmissions = useCallback(async (quizId: string) => {
    try {
      const { data, error } = await supabase
        .from('quiz_submissions')
        .select('id, student_id, status, percentage, total_score, submitted_at, teacher_notes, graded_at')
        .eq('quiz_id', quizId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Enrich with student info
      const enriched = await Promise.all(
        (data ?? []).map(async (sub: any) => {
          const { data: u } = await supabase
            .from('users')
            .select('full_name, email, enrollment_number')
            .eq('id', sub.student_id)
            .single();
          return { ...sub, student: u ?? undefined };
        })
      );

      setSubmissions(enriched);
    } catch (e: any) {
      console.error('fetchSubmissions:', e);
    }
  }, []);

  // ─── Fetch Questions for a Quiz ────────────────────────────────────────────

  const fetchQuestions = useCallback(async (quizId: string) => {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('question_order');
    if (!error) setQuestions(data ?? []);
  }, []);

  // ─── Course Selection ──────────────────────────────────────────────────────

  const handleSelectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setView('course-detail');
    setActiveTab('overview');
    setSearchTerm('');
    setStatusFilter('all');
    await Promise.all([fetchQuizzes(course.id), fetchStudents(course.id)]);
  };

  const handleBack = () => {
    setView('courses');
    setSelectedCourse(null);
    setQuizzes([]);
    setStudents([]);
    setSubmissions([]);
    setQuestions([]);
    setAiInsights('');
  };

  // ─── Create Quiz ───────────────────────────────────────────────────────────

  const handleCreateQuiz = async () => {
    if (!selectedCourse || !createForm.title.trim()) return;
    setSavingQuiz(true);
    try {
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .insert({
          course_id: selectedCourse.id,
          title: createForm.title.trim(),
          description: createForm.description || null,
          type: createForm.type,
          difficulty: createForm.difficulty,
          total_questions: parseInt(createForm.total_questions) || 10,
          time_limit_minutes: parseInt(createForm.time_limit_minutes) || null,
          passing_score: parseInt(createForm.passing_score) || 70,
          scheduled_at: createForm.scheduled_at || null,
          status: createForm.scheduled_at ? 'scheduled' : 'draft',
          allow_late_submission: createForm.allow_late_submission,
          show_results: createForm.show_results,
          shuffle_questions: createForm.shuffle_questions,
          section: createForm.section || null,
          created_by: teacherId,
        })
        .select()
        .single();

      if (error) throw error;

      // Save AI-generated questions if any
      if (aiGeneratedQuestions.length > 0 && quiz) {
        const qToInsert = aiGeneratedQuestions.map((q, i) => ({
          quiz_id: quiz.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          points: q.points,
          question_order: i + 1,
        }));
        const { error: qErr } = await supabase.from('quiz_questions').insert(qToInsert);
        if (qErr) console.error('Question insert error:', qErr);
      }

      setShowCreateModal(false);
      setCreateForm({ ...emptyForm });
      setAiGeneratedQuestions([]);
      setAiTopic('');
      await fetchQuizzes(selectedCourse.id);
    } catch (e: any) {
      console.error('createQuiz:', e);
      alert(`Failed to create quiz: ${e?.message}`);
    } finally {
      setSavingQuiz(false);
    }
  };

  // ─── Edit Quiz ─────────────────────────────────────────────────────────────

  const openEditModal = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setEditForm({
      title: quiz.title,
      description: quiz.description ?? '',
      type: quiz.type ?? 'Quick Quiz',
      difficulty: quiz.difficulty ?? 'medium',
      total_questions: String(quiz.total_questions ?? 10),
      time_limit_minutes: String(quiz.time_limit_minutes ?? 30),
      passing_score: String(quiz.passing_score ?? 70),
      scheduled_at: quiz.scheduled_at ? quiz.scheduled_at.slice(0, 16) : '',
      allow_late_submission: quiz.allow_late_submission ?? false,
      show_results: quiz.show_results ?? true,
      shuffle_questions: quiz.shuffle_questions ?? false,
      section: quiz.section ?? '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedQuiz || !selectedCourse) return;
    setSavingQuiz(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({
          title: editForm.title.trim(),
          description: editForm.description || null,
          type: editForm.type,
          difficulty: editForm.difficulty,
          total_questions: parseInt(editForm.total_questions) || 10,
          time_limit_minutes: parseInt(editForm.time_limit_minutes) || null,
          passing_score: parseInt(editForm.passing_score) || 70,
          scheduled_at: editForm.scheduled_at || null,
          status: editForm.scheduled_at ? 'scheduled' : selectedQuiz.status,
          allow_late_submission: editForm.allow_late_submission,
          show_results: editForm.show_results,
          shuffle_questions: editForm.shuffle_questions,
          section: editForm.section || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedQuiz.id);

      if (error) throw error;
      setShowEditModal(false);
      await fetchQuizzes(selectedCourse.id);
    } catch (e: any) {
      alert(`Failed to update quiz: ${e?.message}`);
    } finally {
      setSavingQuiz(false);
    }
  };

  // ─── Delete Quiz ───────────────────────────────────────────────────────────

  const handleDeleteQuiz = async () => {
    if (!selectedQuiz || !selectedCourse) return;
    try {
      // Delete questions first (FK)
      await supabase.from('quiz_questions').delete().eq('quiz_id', selectedQuiz.id);
      // Delete submissions
      await supabase.from('quiz_submissions').delete().eq('quiz_id', selectedQuiz.id);
      await supabase.from('quiz_attempts').delete().eq('quiz_id', selectedQuiz.id);
      // Delete quiz
      const { error } = await supabase.from('quizzes').delete().eq('id', selectedQuiz.id);
      if (error) throw error;
      setShowDeleteDialog(false);
      setSelectedQuiz(null);
      await fetchQuizzes(selectedCourse.id);
    } catch (e: any) {
      alert(`Failed to delete: ${e?.message}`);
    }
  };

  // ─── Publish / Unpublish Quiz ──────────────────────────────────────────────

  const handleTogglePublish = async (quiz: Quiz) => {
    if (!selectedCourse) return;
    const newStatus = quiz.status === 'published' || quiz.status === 'active' ? 'draft' : 'published';
    const { error } = await supabase
      .from('quizzes')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', quiz.id);
    if (!error) await fetchQuizzes(selectedCourse.id);
  };

  // ─── AI: Generate Questions ────────────────────────────────────────────────

  const handleAIGenerate = async () => {
    if (!aiTopic.trim() || !selectedCourse) return;
    setAiGenerating(true);
    setAiGeneratedQuestions([]);
    try {
      const questions = await generateQuestionsWithAI({
        topic: aiTopic,
        courseContext: `${selectedCourse.code} - ${selectedCourse.name} (${selectedCourse.program?.name ?? ''})`,
        numQuestions: parseInt(aiNumQuestions) || 10,
        difficulty: createForm.difficulty,
        type: aiQuestionType,
      });
      setAiGeneratedQuestions(questions);
    } catch (e: any) {
      alert(`AI generation failed: ${e?.message}`);
    } finally {
      setAiGenerating(false);
    }
  };

  // ─── AI: Insights for a Quiz ───────────────────────────────────────────────

  const handleGetInsights = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setShowInsightsModal(true);
    setAiInsights('');
    setAiInsightsLoading(true);
    try {
      await fetchSubmissions(quiz.id);
      const subs = await supabase
        .from('quiz_submissions')
        .select('student_id, percentage')
        .eq('quiz_id', quiz.id)
        .not('percentage', 'is', null);

      const perfs = await Promise.all(
        (subs.data ?? []).slice(0, 10).map(async (s: any) => {
          const { data: u } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', s.student_id)
            .single();
          return { name: u?.full_name ?? 'Unknown', score: s.percentage };
        })
      );

      const insights = await generateQuizInsights({
        quizTitle: quiz.title,
        avgScore: quiz._avgScore ?? 0,
        submissionCount: quiz._submissionCount ?? 0,
        passing_score: quiz.passing_score ?? 70,
        studentPerformances: perfs,
      });
      setAiInsights(insights);
    } catch (e: any) {
      setAiInsights(`Could not generate insights: ${e?.message}`);
    } finally {
      setAiInsightsLoading(false);
    }
  };

  // ─── Derived Stats ─────────────────────────────────────────────────────────

  const totalStudents = selectedCourse?.students ?? students.length;
  const activeQuizzes = quizzes.filter(q => q.status === 'active' || q.status === 'published');
  const draftQuizzes = quizzes.filter(q => q.status === 'draft');
  const scheduledQuizzes = quizzes.filter(q => q.status === 'scheduled');
  const completedQuizzes = quizzes.filter(q => q.status === 'completed');

  const classAvgScore =
    students.length > 0
      ? Math.round(students.reduce((s, st) => s + st.avgScore, 0) / students.length)
      : 0;

  const filteredQuizzes = quizzes.filter(q => {
    const matchSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ─── RENDER: Courses List ──────────────────────────────────────────────────

  if (view === 'courses') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Quiz Management</h1>
            <p className="text-slate-500 mt-1">Select a course to manage quizzes and track student performance</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCourses} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'My Courses', value: courses.length, icon: BookOpen, color: 'blue' },
            { label: 'Total Students', value: courses.reduce((s, c) => s + (c.students ?? 0), 0), icon: Users, color: 'green' },
            { label: 'Departments', value: Array.from(new Set(courses.map(c => c.program?.department?.name).filter(Boolean))).length, icon: BarChart3, color: 'purple' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`p-3 rounded-xl bg-${color}-100`}>
                  <Icon className={`h-5 w-5 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-sm text-slate-500">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Course grid */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No courses assigned</h3>
            <p className="text-slate-500 max-w-sm">You don't have any courses yet. Contact your administrator to get courses assigned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {courses.map(course => (
              <Card
                key={course.id}
                className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                onClick={() => handleSelectCourse(course)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors group-hover:translate-x-0.5 transform" />
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {course.code}
                      </span>
                      {course.section && (
                        <span className="text-xs text-slate-500">Sec {course.section}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900 leading-tight">{course.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{course.program?.name ?? 'N/A'}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800">{course.students ?? 0}</p>
                      <p className="text-xs text-slate-500">Students</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800">{course.semester ?? '—'}</p>
                      <p className="text-xs text-slate-500">Semester</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── RENDER: Course Detail ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-slate-600">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Courses
            </Button>
            <span className="text-slate-300">/</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{selectedCourse?.name}</h1>
                <span className="text-sm text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                  {selectedCourse?.code}
                </span>
                {selectedCourse?.section && (
                  <span className="text-sm text-slate-500">· Sec {selectedCourse.section}</span>
                )}
              </div>
              <p className="text-sm text-slate-500">{selectedCourse?.program?.name}</p>
            </div>
          </div>
          <Button
            onClick={() => { setAiGeneratedQuestions([]); setAiTopic(''); setCreateForm({ ...emptyForm }); setShowCreateModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Quiz
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Quizzes', value: quizzes.length, icon: Brain, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Published', value: activeQuizzes.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Students', value: totalStudents, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Class Avg', value: `${classAvgScore}%`, icon: Target, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-5">
                <div className={`p-2.5 ${bg} rounded-lg`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-slate-200 p-1 rounded-lg">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded">
              Overview
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded">
              All Quizzes {quizzes.length > 0 && <span className="ml-1.5 bg-slate-200 text-slate-700 text-xs px-1.5 py-0.5 rounded-full">{quizzes.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded">
              Students {students.length > 0 && <span className="ml-1.5 bg-slate-200 text-slate-700 text-xs px-1.5 py-0.5 rounded-full">{students.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Active/Published Quizzes */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Published Quizzes</CardTitle>
                    <span className="text-sm text-slate-500">{activeQuizzes.length} quiz{activeQuizzes.length !== 1 ? 'zes' : ''}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeQuizzes.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No published quizzes yet</p>
                      <Button variant="link" size="sm" className="text-blue-600 mt-1" onClick={() => setShowCreateModal(true)}>
                        Create one now
                      </Button>
                    </div>
                  ) : (
                    activeQuizzes.slice(0, 4).map(quiz => (
                      <div key={quiz.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{quiz.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-500">{quiz.total_questions ?? 0} questions</span>
                            <span className="text-xs text-slate-500">{quiz._submissionCount ?? 0} submissions</span>
                            {quiz._avgScore !== null && quiz._avgScore !== undefined && (
                              <span className="text-xs font-medium text-green-600">{quiz._avgScore}% avg</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedQuiz(quiz); fetchSubmissions(quiz.id); setShowSubmissionsModal(true); }}>
                            <Eye className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleGetInsights(quiz)}>
                            <Sparkles className="h-4 w-4 text-purple-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Scheduled */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Scheduled & Drafts</CardTitle>
                    <span className="text-sm text-slate-500">{scheduledQuizzes.length + draftQuizzes.length}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(scheduledQuizzes.length + draftQuizzes.length) === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No scheduled or draft quizzes</p>
                    </div>
                  ) : (
                    [...scheduledQuizzes, ...draftQuizzes].slice(0, 4).map(quiz => (
                      <div key={quiz.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 truncate">{quiz.title}</p>
                            <StatusBadge status={quiz.status} />
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-500"><DifficultyBadge difficulty={quiz.difficulty} /></span>
                            {quiz.scheduled_at && (
                              <span className="text-xs text-slate-500">
                                {new Date(quiz.scheduled_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-green-600" onClick={() => handleTogglePublish(quiz)}>
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Publish
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditModal(quiz)}>
                            <Edit className="h-4 w-4 text-slate-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top students */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No students enrolled yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {students.slice(0, 6).map((student, idx) => (
                      <div key={student.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' :
                          idx === 1 ? 'bg-slate-200 text-slate-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {idx < 3 ? ['🥇','🥈','🥉'][idx] : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">{student.full_name ?? 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{student.quizzesTaken} quizzes</p>
                        </div>
                        <span className="text-sm font-bold text-green-600">{student.avgScore}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── All Quizzes Tab ── */}
          <TabsContent value="quizzes" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search quizzes..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {quizLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="text-center py-16">
                <Brain className="h-14 w-14 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-700 mb-1">
                  {quizzes.length === 0 ? 'No quizzes yet' : 'No results found'}
                </h3>
                <p className="text-slate-500 mb-4">
                  {quizzes.length === 0 ? 'Create your first quiz to get started' : 'Try adjusting your search filters'}
                </p>
                {quizzes.length === 0 && (
                  <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quiz
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuizzes.map(quiz => (
                  <Card key={quiz.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-slate-900">{quiz.title}</h3>
                            <StatusBadge status={quiz.status} />
                            <DifficultyBadge difficulty={quiz.difficulty} />
                            {quiz.type && (
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{quiz.type}</span>
                            )}
                          </div>

                          {quiz.description && (
                            <p className="text-sm text-slate-500 mb-2 line-clamp-1">{quiz.description}</p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Brain className="h-4 w-4 text-slate-400" />
                              {quiz.total_questions ?? 0} questions
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-slate-400" />
                              {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'No limit'}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-slate-400" />
                              {quiz._submissionCount ?? 0} submissions
                            </span>
                            {quiz._avgScore !== null && quiz._avgScore !== undefined && (
                              <span className="flex items-center gap-1.5 font-medium text-green-600">
                                <Target className="h-4 w-4" />
                                {quiz._avgScore}% avg
                              </span>
                            )}
                            {quiz.scheduled_at && (
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                {new Date(quiz.scheduled_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePublish(quiz)}
                            className={quiz.status === 'published' || quiz.status === 'active'
                              ? 'text-amber-600 border-amber-300 hover:bg-amber-50'
                              : 'text-green-600 border-green-300 hover:bg-green-50'}
                          >
                            {quiz.status === 'published' || quiz.status === 'active'
                              ? <><PauseCircle className="h-4 w-4 mr-1" />Unpublish</>
                              : <><PlayCircle className="h-4 w-4 mr-1" />Publish</>}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setSelectedQuiz(quiz); fetchSubmissions(quiz.id); setShowSubmissionsModal(true); }}>
                            <Eye className="h-4 w-4 mr-1" />Submissions
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleGetInsights(quiz)} className="text-purple-600 border-purple-300 hover:bg-purple-50">
                            <Sparkles className="h-4 w-4 mr-1" />AI Insights
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditModal(quiz)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => { setSelectedQuiz(quiz); setShowDeleteDialog(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Students Tab ── */}
          <TabsContent value="students" className="space-y-4 mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Enrolled Students</CardTitle>
                    <CardDescription>{students.length} students in this course</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No students enrolled in this course</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {students.map((student, idx) => (
                      <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {(student.full_name ?? 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{student.full_name ?? 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{student.enrollment_number ?? student.email}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 sm:gap-6">
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-600">{student.quizzesTaken}</p>
                            <p className="text-xs text-slate-500">Quizzes</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-lg font-bold ${student.avgScore >= 70 ? 'text-green-600' : student.avgScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {student.avgScore}%
                            </p>
                            <p className="text-xs text-slate-500">Avg Score</p>
                          </div>
                          <div className="flex items-center">
                            <div className="w-24">
                              <Progress value={student.avgScore} className="h-2" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* At risk students */}
            {students.filter(s => s.avgScore < 50 || (s.quizzesTaken === 0 && quizzes.length > 0)).length > 0 && (
              <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Students Needing Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {students
                    .filter(s => s.avgScore < 50 || (s.quizzesTaken === 0 && quizzes.length > 0))
                    .map(student => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div>
                          <p className="font-medium text-slate-900">{student.full_name ?? 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{student.enrollment_number ?? student.email}</p>
                        </div>
                        <div className="flex gap-2">
                          {student.quizzesTaken === 0 && quizzes.length > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200">No submissions</Badge>
                          )}
                          {student.avgScore < 50 && student.quizzesTaken > 0 && (
                            <Badge className="bg-red-100 text-red-700 border-red-200">{student.avgScore}% avg</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Analytics Tab ── */}
          <TabsContent value="analytics" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 text-center">
                  <p className="text-3xl font-bold text-blue-600">{classAvgScore}%</p>
                  <p className="text-sm text-slate-500 mt-1">Class Average</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {students.filter(s => s.avgScore >= 70).length}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Passing Students</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {students.filter(s => s.avgScore < 50 && s.quizzesTaken > 0).length}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">At Risk</p>
                </CardContent>
              </Card>
            </div>

            {/* Score distribution */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {students.filter(s => s.quizzesTaken > 0).length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm">No quiz submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { label: '90-100%', min: 90, color: 'bg-green-500' },
                      { label: '75-89%', min: 75, color: 'bg-emerald-400' },
                      { label: '60-74%', min: 60, color: 'bg-amber-400' },
                      { label: '50-59%', min: 50, color: 'bg-orange-400' },
                      { label: 'Below 50%', min: 0, color: 'bg-red-500' },
                    ].map(({ label, min, color }, i, arr) => {
                      const max = arr[i - 1]?.min ?? 101;
                      const count = students.filter(s => s.avgScore >= min && s.avgScore < max && s.quizzesTaken > 0).length;
                      const pct = students.filter(s => s.quizzesTaken > 0).length > 0
                        ? Math.round((count / students.filter(s => s.quizzesTaken > 0).length) * 100)
                        : 0;
                      return (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-xs text-slate-600 w-20 flex-shrink-0">{label}</span>
                          <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${color} rounded-full flex items-center justify-end pr-2 transition-all`}
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            >
                              {pct > 10 && <span className="text-xs text-white font-medium">{count}</span>}
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 w-8">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quiz performance table */}
            {completedQuizzes.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Quiz Performance History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {quizzes.filter(q => q._submissionCount! > 0).map(quiz => (
                      <div key={quiz.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{quiz.title}</p>
                          <p className="text-xs text-slate-500">{quiz._submissionCount} submissions</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24">
                            <Progress value={quiz._avgScore ?? 0} className="h-2" />
                          </div>
                          <span className={`text-sm font-bold ${(quiz._avgScore ?? 0) >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                            {quiz._avgScore ?? 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── CREATE QUIZ MODAL ── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              Create New Quiz
            </DialogTitle>
            <DialogDescription>
              {selectedCourse?.code} — {selectedCourse?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="c-title">Quiz Title *</Label>
                <Input
                  id="c-title"
                  placeholder="e.g., Midterm Review Quiz"
                  value={createForm.title}
                  onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="c-desc">Description</Label>
                <Textarea
                  id="c-desc"
                  placeholder="Optional instructions for students..."
                  value={createForm.description}
                  onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={createForm.type} onValueChange={v => setCreateForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Quick Quiz', 'Assignment', 'Midterm', 'Final Exam', 'Practice'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={createForm.difficulty} onValueChange={v => setCreateForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Passing Score (%)</Label>
                <Input
                  type="number" min="0" max="100"
                  value={createForm.passing_score}
                  onChange={e => setCreateForm(f => ({ ...f, passing_score: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Questions</Label>
                <Input
                  type="number" min="1"
                  value={createForm.total_questions}
                  onChange={e => setCreateForm(f => ({ ...f, total_questions: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Time Limit (min)</Label>
                <Input
                  type="number" min="0" placeholder="No limit"
                  value={createForm.time_limit_minutes}
                  onChange={e => setCreateForm(f => ({ ...f, time_limit_minutes: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Schedule</Label>
                <Input
                  type="datetime-local"
                  value={createForm.scheduled_at}
                  onChange={e => setCreateForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Settings</Label>
              <div className="flex flex-wrap gap-6">
                {([
                  { key: 'allow_late_submission', label: 'Allow late submissions' },
                  { key: 'show_results', label: 'Show results after submission' },
                  { key: 'shuffle_questions', label: 'Shuffle questions' },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`c-${key}`}
                      checked={createForm[key]}
                      onCheckedChange={v => setCreateForm(f => ({ ...f, [key]: v as boolean }))}
                    />
                    <label htmlFor={`c-${key}`} className="text-sm">{label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Question Generator */}
            <div className="border border-purple-200 rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">AI Question Generator</h3>
                <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">Powered by Claude</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="sm:col-span-1">
                  <Input
                    placeholder="Topic (e.g., Newton's Laws)"
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Select value={aiNumQuestions} onValueChange={setAiNumQuestions}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['5', '8', '10', '15', '20'].map(n => (
                        <SelectItem key={n} value={n}>{n} questions</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={aiQuestionType} onValueChange={setAiQuestionType}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="mixed">Mixed Types</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAIGenerate}
                disabled={aiGenerating || !aiTopic.trim()}
                className="border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                {aiGenerating
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  : <><Sparkles className="h-4 w-4 mr-2" />Generate Questions</>}
              </Button>

              {/* Generated questions preview */}
              {aiGeneratedQuestions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-900">
                      ✓ {aiGeneratedQuestions.length} questions generated
                    </span>
                    <Button variant="ghost" size="sm" className="text-red-500 h-6 text-xs" onClick={() => setAiGeneratedQuestions([])}>
                      Clear
                    </Button>
                  </div>
                  <ScrollArea className="h-48 border border-purple-200 rounded-lg bg-white p-3">
                    {aiGeneratedQuestions.map((q, i) => (
                      <div key={i} className="mb-3 pb-3 border-b border-slate-100 last:border-0">
                        <p className="text-sm font-medium text-slate-800">
                          {i + 1}. {q.question_text}
                        </p>
                        {q.question_type === 'multiple_choice' && (
                          <div className="mt-1 space-y-1">
                            {q.options.map((opt, j) => (
                              <div key={j} className={`text-xs px-2 py-1 rounded ${opt === q.correct_answer ? 'bg-green-100 text-green-700 font-medium' : 'text-slate-500'}`}>
                                {String.fromCharCode(65 + j)}. {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-slate-400 mt-1 inline-block">{q.points} pt{q.points !== 1 ? 's' : ''} · {q.question_type.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button
              onClick={handleCreateQuiz}
              disabled={savingQuiz || !createForm.title.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingQuiz ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Quiz
              {aiGeneratedQuestions.length > 0 && ` + ${aiGeneratedQuestions.length} questions`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT QUIZ MODAL ── */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quiz</DialogTitle>
            <DialogDescription>Update quiz details for "{selectedQuiz?.title}"</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Quick Quiz', 'Assignment', 'Midterm', 'Final Exam', 'Practice'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={editForm.difficulty} onValueChange={v => setEditForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Passing Score (%)</Label>
                <Input type="number" value={editForm.passing_score} onChange={e => setEditForm(f => ({ ...f, passing_score: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Questions</Label>
                <Input type="number" value={editForm.total_questions} onChange={e => setEditForm(f => ({ ...f, total_questions: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Time Limit (min)</Label>
                <Input type="number" value={editForm.time_limit_minutes} onChange={e => setEditForm(f => ({ ...f, time_limit_minutes: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Schedule</Label>
                <Input type="datetime-local" value={editForm.scheduled_at} onChange={e => setEditForm(f => ({ ...f, scheduled_at: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Settings</Label>
              <div className="flex flex-wrap gap-6">
                {([
                  { key: 'allow_late_submission', label: 'Allow late submissions' },
                  { key: 'show_results', label: 'Show results after submission' },
                  { key: 'shuffle_questions', label: 'Shuffle questions' },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`e-${key}`}
                      checked={editForm[key]}
                      onCheckedChange={v => setEditForm(f => ({ ...f, [key]: v as boolean }))}
                    />
                    <label htmlFor={`e-${key}`} className="text-sm">{label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={savingQuiz || !editForm.title.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              {savingQuiz ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE DIALOG ── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedQuiz?.title}" along with all{' '}
              <strong>{selectedQuiz?._submissionCount ?? 0} student submissions</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuiz} className="bg-red-600 hover:bg-red-700">
              Delete Quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── SUBMISSIONS MODAL ── */}
      <Dialog open={showSubmissionsModal} onOpenChange={setShowSubmissionsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submissions — {selectedQuiz?.title}</DialogTitle>
            <DialogDescription>
              {submissions.length} total · Avg score: {selectedQuiz?._avgScore ?? 0}%
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {submissions.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No submissions yet</p>
              </div>
            ) : (
              submissions.map(sub => (
                <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{sub.student?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{sub.student?.enrollment_number ?? sub.student?.email}</p>
                    {sub.submitted_at && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Submitted {new Date(sub.submitted_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={sub.status} />
                    {sub.percentage !== null && sub.percentage !== undefined ? (
                      <span className={`text-lg font-bold ${sub.percentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.round(sub.percentage)}%
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400 italic">Not graded</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmissionsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AI INSIGHTS MODAL ── */}
      <Dialog open={showInsightsModal} onOpenChange={setShowInsightsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Insights — {selectedQuiz?.title}
            </DialogTitle>
            <DialogDescription>
              Powered by Claude · {selectedQuiz?._submissionCount ?? 0} submissions analysed
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xl font-bold text-blue-600">{selectedQuiz?._submissionCount ?? 0}</p>
                <p className="text-xs text-slate-600">Submissions</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xl font-bold text-green-600">{selectedQuiz?._avgScore ?? 0}%</p>
                <p className="text-xs text-slate-600">Avg Score</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-xl font-bold text-purple-600">{selectedQuiz?.passing_score ?? 70}%</p>
                <p className="text-xs text-slate-600">Pass Threshold</p>
              </div>
            </div>

            {/* Insights */}
            <div className="border border-purple-200 rounded-xl p-4 bg-gradient-to-br from-purple-50 to-white min-h-[160px]">
              {aiInsightsLoading ? (
                <div className="flex flex-col items-center justify-center h-32 gap-3">
                  <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                  <p className="text-sm text-slate-500">Claude is analysing student performance...</p>
                </div>
              ) : aiInsights ? (
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line">
                  {aiInsights}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center mt-8">No insights available</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => handleGetInsights(selectedQuiz!)} disabled={aiInsightsLoading} className="text-purple-600">
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
            <Button variant="outline" onClick={() => setShowInsightsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}