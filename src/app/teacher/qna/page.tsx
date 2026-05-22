/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  MessageSquare,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  BookOpen,
  Filter,
  X,
  RotateCcw,
  Pin,
  Eye,
  EyeOff,
  Inbox,
} from "lucide-react";
import supabase from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type QnaStatus = "open" | "answered" | "closed";

interface Course {
  id: string;
  name: string;
  code: string;
}

interface QnaQuestion {
  id: string;
  course_id: string;
  student_id: string;
  title: string;
  body: string;
  status: QnaStatus;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  // joined
  course?: Course;
  student?: { full_name: string; enrollment_number?: string };
  answers?: QnaAnswer[];
}

interface QnaAnswer {
  id: string;
  question_id: string;
  answered_by: string;
  body: string;
  is_teacher_answer: boolean;
  created_at: string;
  author?: { full_name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function ageHours(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / 3_600_000;
}

const STATUS_CFG: Record<QnaStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  open:     { label: "Open",     bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-400"   },
  answered: { label: "Answered", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  closed:   { label: "Closed",   bg: "bg-slate-100",  text: "text-slate-500",   border: "border-slate-200",   dot: "bg-slate-400"   },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeacherQnA() {
  const [userId, setUserId]       = useState<string | null>(null);
  const [courses, setCourses]     = useState<Course[]>([]);
  const [questions, setQuestions] = useState<QnaQuestion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // filters
  const [search, setSearch]               = useState("");
  const [filterCourse, setFilterCourse]   = useState<"all" | string>("all");
  const [filterStatus, setFilterStatus]   = useState<"all" | QnaStatus>("all");
  const [filterOverdue, setFilterOverdue] = useState(false);

  // expanded thread + answer composer
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [answerText, setAnswerText]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting]     = useState<Record<string, boolean>>({});
  const [answerError, setAnswerError]   = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async (uid: string) => {
    try {
      // Get courses taught by this teacher
      const { data: tcData, error: tcErr } = await supabase
        .from("teacher_courses")
        .select("course_id")
        .eq("teacher_id", uid);
      if (tcErr) throw tcErr;

      // Also check courses.teacher_id directly
      const { data: directCourses, error: dcErr } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("teacher_id", uid);
      if (dcErr) throw dcErr;

      const tcCourseIds = (tcData || []).map((r: any) => r.course_id);
      const directIds   = (directCourses || []).map((c: any) => c.id);
      const allCourseIds = [...new Set([...tcCourseIds, ...directIds])];

      if (allCourseIds.length === 0) {
        setCourses([]);
        setQuestions([]);
        return;
      }

      // Fetch courses for filter dropdown
      const { data: courseData, error: courseErr } = await supabase
        .from("courses")
        .select("id, name, code")
        .in("id", allCourseIds)
        .order("name");
      if (courseErr) throw courseErr;
      setCourses(courseData || []);

      // Fetch questions for these courses
      const { data: qData, error: qErr } = await supabase
        .from("qna_history")
        .select(`
          id, course_id, student_id, title, body, status, is_pinned, created_at, updated_at,
          courses!qna_history_course_id_fkey(id, name, code),
          users!qna_history_student_id_fkey(full_name, enrollment_number)
        `)
        .in("course_id", allCourseIds)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (qErr) throw qErr;

      const questionIds = (qData || []).map((q: any) => q.id);

      // Fetch answers for all questions
      const answersMap: Record<string, QnaAnswer[]> = {};
      if (questionIds.length > 0) {
        const { data: aData, error: aErr } = await supabase
          .from("qna_answers")
          .select(`
            id, question_id, answered_by, body, is_teacher_answer, created_at,
            users!qna_answers_answered_by_fkey(full_name)
          `)
          .in("question_id", questionIds)
          .order("created_at", { ascending: true });
        if (aErr) throw aErr;

        (aData || []).forEach((a: any) => {
          const ans: QnaAnswer = {
            id: a.id,
            question_id: a.question_id,
            answered_by: a.answered_by,
            body: a.body,
            is_teacher_answer: a.is_teacher_answer,
            created_at: a.created_at,
            author: a.users ? { full_name: a.users.full_name } : undefined,
          };
          if (!answersMap[a.question_id]) answersMap[a.question_id] = [];
          answersMap[a.question_id].push(ans);
        });
      }

      const enriched: QnaQuestion[] = (qData || []).map((q: any) => ({
        id: q.id,
        course_id: q.course_id,
        student_id: q.student_id,
        title: q.title,
        body: q.body,
        status: q.status || "open",
        is_pinned: q.is_pinned || false,
        created_at: q.created_at,
        updated_at: q.updated_at,
        course: q.courses,
        student: q.users,
        answers: answersMap[q.id] || [],
      }));

      setQuestions(enriched);
    } catch (err: any) {
      setError(err.message || "Failed to load Q&A data");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Not authenticated"); return; }
        setUserId(user.id);
        await loadData(user.id);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadData]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleAnswer = async (questionId: string) => {
    if (!userId) return;
    const text = (answerText[questionId] || "").trim();
    if (!text) {
      setAnswerError({ ...answerError, [questionId]: "Answer cannot be empty" });
      return;
    }
    setSubmitting({ ...submitting, [questionId]: true });
    setAnswerError({ ...answerError, [questionId]: "" });

    try {
      const { error: insErr } = await supabase.from("qna_answers").insert([{
        question_id: questionId,
        answered_by: userId,
        body: text,
        is_teacher_answer: true,
      }]);
      if (insErr) throw insErr;

      // Mark question as answered
      const { error: updErr } = await supabase
        .from("qna_history")
        .update({ status: "answered", updated_at: new Date().toISOString() })
        .eq("id", questionId);
      if (updErr) throw updErr;

      setAnswerText({ ...answerText, [questionId]: "" });
      await loadData(userId);
    } catch (err: any) {
      setAnswerError({ ...answerError, [questionId]: err.message || "Failed to submit answer" });
    } finally {
      setSubmitting({ ...submitting, [questionId]: false });
    }
  };

  const handleStatusChange = async (q: QnaQuestion, newStatus: QnaStatus) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("qna_history")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", q.id);
      if (error) throw error;
      await loadData(userId);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleTogglePin = async (q: QnaQuestion) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("qna_history")
        .update({ is_pinned: !q.is_pinned })
        .eq("id", q.id);
      if (error) throw error;
      await loadData(userId);
    } catch (err: any) {
      alert(`Failed to pin: ${err.message}`);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const totalOpen     = questions.filter(q => q.status === "open").length;
  const totalAnswered = questions.filter(q => q.status === "answered").length;
  const totalOverdue  = questions.filter(q => q.status === "open" && ageHours(q.created_at) >= 24).length;
  const avgResponseH  = (() => {
    const answered = questions.filter(q => q.status === "answered" && q.answers && q.answers.length > 0);
    if (!answered.length) return null;
    const total = answered.reduce((s, q) => {
      const firstAns = q.answers![0];
      return s + (new Date(firstAns.created_at).getTime() - new Date(q.created_at).getTime()) / 3_600_000;
    }, 0);
    return (total / answered.length).toFixed(1);
  })();

  const filtered = questions.filter(q => {
    if (filterCourse !== "all" && q.course_id !== filterCourse) return false;
    if (filterStatus !== "all" && q.status !== filterStatus) return false;
    if (filterOverdue && !(q.status === "open" && ageHours(q.created_at) >= 24)) return false;
    if (search.trim()) {
      const hay = `${q.title} ${q.body} ${q.student?.full_name || ""} ${q.course?.name || ""} ${q.course?.code || ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-400 font-medium tracking-wide">Loading Q&A…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="font-semibold text-slate-800 mb-1">Something went wrong</p>
        <p className="text-sm text-slate-400">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f5f2]">

      {/* ── Sticky header ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-slate-900 tracking-tight leading-tight">Q&amp;A Management</h1>
              <p className="text-[11px] text-slate-400">Answer student questions from your courses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalOverdue > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />
                {totalOverdue} overdue
              </span>
            )}
            <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-500">
              {questions.length} total
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-5">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Open Questions",  value: totalOpen,     sub: "awaiting your answer",   accent: "from-amber-400 to-orange-400",  icon: <Clock className="w-4 h-4" />          },
            { label: "Answered",        value: totalAnswered, sub: "resolved questions",      accent: "from-emerald-400 to-teal-500",  icon: <CheckCircle className="w-4 h-4" />    },
            { label: "Overdue (24h+)",  value: totalOverdue,  sub: "need urgent reply",       accent: "from-red-400 to-rose-500",      icon: <AlertCircle className="w-4 h-4" />    },
            { label: "Avg Response",    value: avgResponseH ? `${avgResponseH}h` : "—", sub: "first answer time", accent: "from-sky-400 to-blue-500", icon: <MessageSquare className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 relative overflow-hidden">
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${s.accent}`} />
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.accent} flex items-center justify-center text-white mb-3`}>
                {s.icon}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{s.label}</p>
              <p className="text-2xl font-black text-slate-900 leading-none mb-1">{s.value}</p>
              <p className="text-[11px] text-slate-400">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions, students, courses…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Course filter */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              <Filter className="w-3 h-3" /> Course:
            </div>
            <select
              value={filterCourse}
              onChange={e => setFilterCourse(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition text-slate-700"
            >
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code} – {c.name}</option>
              ))}
            </select>

            {/* Status filter tabs */}
            <div className="flex items-center gap-1.5 ml-2 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Status:
            </div>
            {(["all", "open", "answered", "closed"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all capitalize
                  ${filterStatus === s
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
              >
                {s}
              </button>
            ))}

            {/* Overdue toggle */}
            <button
              onClick={() => setFilterOverdue(v => !v)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all
                ${filterOverdue
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-600"
                }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Overdue only
            </button>
          </div>
        </div>

        {/* ── Empty state ── */}
        {questions.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-14 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-sky-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No questions yet</h3>
            <p className="text-sm text-slate-400 max-w-xs">
             When students ask questions on your course lectures, they&apos;ll appear here.
            </p>
          </div>
        )}

        {/* ── No results after filter ── */}
        {questions.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
            <p className="text-slate-400 text-sm">No questions match the current filters.</p>
            <button
              onClick={() => { setSearch(""); setFilterCourse("all"); setFilterStatus("all"); setFilterOverdue(false); }}
              className="mt-3 flex items-center gap-1.5 mx-auto text-xs font-semibold text-blue-600 hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear all filters
            </button>
          </div>
        )}

        {/* ── Question cards ── */}
        {filtered.length > 0 && (
          <div className="space-y-3">
            {/* Section count */}
            <p className="text-xs font-semibold text-slate-400 px-1">
              Showing {filtered.length} of {questions.length} question{questions.length !== 1 ? "s" : ""}
            </p>

            {filtered.map(q => {
              const isExpanded = expandedId === q.id;
              const isOverdue  = q.status === "open" && ageHours(q.created_at) >= 24;
              const statusCfg  = STATUS_CFG[q.status];
              const course     = q.course;
              const hasAnswers = (q.answers?.length ?? 0) > 0;

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
                    ${isOverdue ? "border-red-200" : "border-slate-100"}
                    ${isExpanded ? "shadow-md" : "hover:shadow-md"}`}
                >
                  {/* Overdue top strip */}
                  {isOverdue && (
                    <div className="h-0.5 w-full bg-gradient-to-r from-red-400 to-rose-500" />
                  )}

                  {/* Question header row */}
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer select-none"
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-100 to-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[11px] font-black text-blue-700">
                        {q.student?.full_name?.charAt(0) || "S"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Pin badge */}
                        {q.is_pinned && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700">
                            <Pin className="w-2.5 h-2.5" /> Pinned
                          </span>
                        )}
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                        {/* Overdue badge */}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 border border-red-200 text-red-700">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="text-sm font-bold text-slate-900 leading-snug mb-1 line-clamp-2">{q.title}</p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-600">{q.student?.full_name || "Student"}</span>
                        {q.student?.enrollment_number && (
                          <span>#{q.student.enrollment_number}</span>
                        )}
                        {course && (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded-md font-mono text-[10px] text-slate-600">
                            {course.code}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(q.created_at)}
                        </span>
                        {hasAnswers && (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <MessageSquare className="w-3 h-3" />
                            {q.answers!.length} answer{q.answers!.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                      {/* Pin toggle */}
                      <button
                        onClick={() => handleTogglePin(q)}
                        className={`p-1.5 rounded-lg transition-colors
                          ${q.is_pinned
                            ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
                            : "text-slate-300 hover:text-amber-500 hover:bg-amber-50"
                          }`}
                        title={q.is_pinned ? "Unpin" : "Pin question"}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      {/* Status quick-change */}
                      {q.status !== "closed" && (
                        <button
                          onClick={() => handleStatusChange(q, q.status === "answered" ? "closed" : "closed")}
                          className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Mark as closed"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {q.status === "closed" && (
                        <button
                          onClick={() => handleStatusChange(q, "open")}
                          className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Reopen question"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Expand chevron */}
                      <button className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded thread ── */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">

                      {/* Question body */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Question</p>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{q.body}</p>
                      </div>

                      {/* Existing answers */}
                      {(q.answers?.length ?? 0) > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                            {q.answers!.length} Answer{q.answers!.length !== 1 ? "s" : ""}
                          </p>
                          {q.answers!.map(ans => (
                            <div
                              key={ans.id}
                              className={`rounded-xl p-3 border text-sm leading-relaxed
                                ${ans.is_teacher_answer
                                  ? "bg-blue-50 border-blue-200"
                                  : "bg-white border-slate-200"
                                }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black
                                  ${ans.is_teacher_answer ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                                  {ans.author?.full_name?.charAt(0) || "?"}
                                </div>
                                <span className="text-[11px] font-bold text-slate-700">
                                  {ans.author?.full_name || "Unknown"}
                                </span>
                                {ans.is_teacher_answer && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wide">
                                    Teacher
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 ml-auto">{timeAgo(ans.created_at)}</span>
                              </div>
                              <p className="text-slate-700 whitespace-pre-wrap">{ans.body}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Answer composer — only if not closed */}
                      {q.status !== "closed" && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                            {hasAnswers ? "Add Another Answer" : "Write Your Answer"}
                          </p>
                          <div className="relative">
                            <textarea
                              ref={expandedId === q.id ? textareaRef : undefined}
                              value={answerText[q.id] || ""}
                              onChange={e => setAnswerText({ ...answerText, [q.id]: e.target.value })}
                              placeholder="Type your answer here… Be clear, concise and helpful."
                              rows={4}
                              className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition resize-none pr-12"
                            />
                            <button
                              onClick={() => handleAnswer(q.id)}
                              disabled={submitting[q.id] || !(answerText[q.id] || "").trim()}
                              className="absolute right-2.5 bottom-2.5 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition shadow-sm"
                              title="Submit answer"
                            >
                              {submitting[q.id]
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Send className="w-3.5 h-3.5" />
                              }
                            </button>
                          </div>
                          {answerError[q.id] && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {answerError[q.id]}
                            </p>
                          )}

                          {/* Quick status actions */}
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <span className="text-[11px] text-slate-400 font-medium">Quick actions:</span>
                            {q.status === "open" && (
                              <button
                                onClick={() => handleStatusChange(q, "answered")}
                                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition"
                              >
                                ✓ Mark Answered
                              </button>
                            )}
                            {q.status === "answered" && (
                              <button
                                onClick={() => handleStatusChange(q, "open")}
                                className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition"
                              >
                                ↩ Reopen
                              </button>
                            )}
                            <button
                              onClick={() => handleStatusChange(q, "closed")}
                              className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-200 transition"
                            >
                              Close thread
                            </button>
                          </div>
                        </div>
                      )}

                      {q.status === "closed" && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                          <EyeOff className="w-3.5 h-3.5" />
                          This thread is closed.
                          <button
                            onClick={() => handleStatusChange(q, "open")}
                            className="text-blue-500 font-semibold hover:underline not-italic"
                          >
                            Reopen?
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 pb-4">
          Questions older than 24 hours without a reply are marked overdue. Close threads once fully resolved.
        </p>
      </div>
    </div>
  );
}