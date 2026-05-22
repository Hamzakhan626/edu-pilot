/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import supabase from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Calendar,
  Award,
  Users,
  Clock,
  Search,
  BarChart3,
  ChevronRight,
  BookOpen,
  Target,
  Sparkles,
  Filter,
  Layers,
  CalendarDays,
  Library,
  Loader2,
  FolderOpen,
  RefreshCw,
  Database as DatabaseIcon,
  Plus,
  Edit,
  Trash2,
  BookOpenCheck,
  Upload,
  Download,
  FileText,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  FileCheck,
  Paperclip,
  ArrowLeft,
} from "lucide-react";

// ---------- Types ----------
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

type Semester = {
  id: string;
  name: string;
  semester_type: string;
  year: number;
  program_id: string;
  status: "upcoming" | "active" | "completed";
};

type CourseRow = {
  id: string;
  name: string;
  code: string;
  section: string | null;
  semester_id: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  department_id: string;
  program_id: string | null;
  enrollment_count: number;
};

type AssignmentRow = {
  id: string;
  course_id: string; // mapped from class_id
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number;
  created_at: string;
  updated_at: string;
  total_students: number;
  submitted_count: number;
  graded_count: number;
  pending_count: number;
  average_score: number;
  status: "active" | "completed" | "overdue";
  attachment_url: string | null;
  attachment_name: string | null;
};

type AssignmentFormState = {
  id?: string;
  title: string;
  description: string;
  due_date: string;
  max_score: string;
  attachment: File | null;
};

type StudentSubmission = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_roll_no: string;
  status: "pending" | "submitted" | "graded" | "late";
  submitted_at: string | null;
  score: number | null;
  attachment_url: string | null;
  attachment_name: string | null;
};

export default function HoDAssignmentsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const [loadingLookups, setLoadingLookups] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "active" | "completed" | "overdue"
  >("all");

  // Assignment dialog
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentRow | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>({
    title: "",
    description: "",
    due_date: "",
    max_score: "100",
    attachment: null,
  });

  // Submissions & marks
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentRow | null>(null);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
  const [showMarksDialog, setShowMarksDialog] = useState(false);
  const [bulkMarks, setBulkMarks] = useState<Record<string, string>>({});
  const [savingMarks, setSavingMarks] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // ---------- Auth & department ----------
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (currentUser.role !== "hod" && currentUser.role !== "admin") {
      toast.error("Access denied");
      router.push("/login");
      return;
    }
    setUser(currentUser);

    supabase
      .from("departments")
      .select("id, name, code")
      .eq("hod_id", currentUser.id)
      .maybeSingle()
      .then(({ data: dept, error }) => {
        if (error || !dept) {
          toast.error("No department assigned");
          router.push("/hod/programs");
          return;
        }
        setDepartment({ id: dept.id, name: dept.name, code: dept.code });
        setAuthLoading(false);
      });
  }, []);

  useEffect(() => {
    if (department) {
      void loadLookups();
    }
  }, [department]);

  // ---------- Lookup loading (scoped to department) ----------
  const loadLookups = useCallback(async () => {
    if (!department) return;
    try {
      setLoadingLookups(true);

      // Programs under this department
      const { data: progData, error: progErr } = await supabase
        .from("programs")
        .select("id, name, code, department_id")
        .eq("department_id", department.id)
        .order("name");

      if (progErr) throw progErr;
      const typedProgs: Program[] = (progData || []).map((p: any) => ({
        id: String(p.id),
        name: String(p.name),
        code: String(p.code),
        department_id: String(p.department_id),
      }));
      setPrograms(typedProgs);

      const programIds = typedProgs.map((p) => p.id);

      // Semesters for those programs
      const { data: semData, error: semErr } = await supabase
        .from("semesters")
        .select("id, name, semester_type, year, program_id, status")
        .in("program_id", programIds)
        .order("year", { ascending: false });

      if (semErr) throw semErr;
      const typedSems: Semester[] = (semData || []).map((s: any) => ({
        id: String(s.id),
        name: String(s.name),
        semester_type: String(s.semester_type),
        year: Number(s.year),
        program_id: String(s.program_id),
        status: (s.status as "upcoming" | "active" | "completed") || "active",
      }));
      setSemesters(typedSems);

      // Courses for those programs
      const { data: courseData, error: courseErr } = await supabase
        .from("courses")
        .select(
          "id, name, code, section, semester_id, teacher_id, department_id, program_id, instructor"
        )
        .in("program_id", programIds)
        .order("code");

      if (courseErr) throw courseErr;
      const courseRows = (courseData || []) as any[];

      // Teacher names
      const teacherIds = [
        ...new Set(courseRows.map((c) => c.teacher_id).filter(Boolean) as string[]),
      ];
      let teacherMap: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: tData } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", teacherIds);
        if (tData) {
          teacherMap = tData.reduce((acc: Record<string, string>, t: any) => {
            acc[String(t.id)] = String(t.full_name || "");
            return acc;
          }, {});
        }
      }

      // Enrollment counts
      let enrollmentMap: Record<string, number> = {};
      if (courseRows.length > 0) {
        const courseIds = courseRows.map((c) => String(c.id));
        const { data: enrollData } = await supabase
          .from("course_enrollments")
          .select("course_id")
          .in("course_id", courseIds);
        if (enrollData) {
          enrollmentMap = enrollData.reduce((acc: Record<string, number>, e: any) => {
            const cid = String(e.course_id);
            acc[cid] = (acc[cid] || 0) + 1;
            return acc;
          }, {});
        }
      }

      const typedCourses: CourseRow[] = courseRows.map((c: any) => ({
        id: String(c.id),
        name: String(c.name),
        code: String(c.code),
        section: c.section ? String(c.section) : null,
        semester_id: c.semester_id ? String(c.semester_id) : null,
        teacher_id: c.teacher_id ? String(c.teacher_id) : null,
        teacher_name: c.teacher_id ? teacherMap[String(c.teacher_id)] ?? null : null,
        department_id: String(c.department_id),
        program_id: c.program_id ? String(c.program_id) : null,
        enrollment_count: enrollmentMap[String(c.id)] || 0,
      }));
      setCourses(typedCourses);

      // Reset selections if they disappeared
      if (selectedProgram && !typedProgs.find((p) => p.id === selectedProgram)) {
        setSelectedProgram(null);
      }
      if (selectedSemester && !typedSems.find((s) => s.id === selectedSemester)) {
        setSelectedSemester(null);
      }
      if (selectedCourse && !typedCourses.find((c) => c.id === selectedCourse)) {
        setSelectedCourse(null);
      }

      toast.success("Data loaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingLookups(false);
    }
  }, [department, selectedProgram, selectedSemester, selectedCourse]);

  // ---------- Assignment loading ----------
  const loadAssignments = useCallback(async (courseId: string) => {
    try {
      setLoadingAssignments(true);
      if (!courseId) return;

      // Total students in course
      let totalStudents = 0;
      const { count, error: enrollmentError } = await supabase
        .from("course_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId);
      if (!enrollmentError) totalStudents = count || 0;

      // Fetch assignments (using class_id column)
      const { data: assignmentData, error: assignmentErr } = await supabase
        .from("assignments")
        .select("*")
        .eq("class_id", courseId)
        .order("created_at", { ascending: false });

      if (assignmentErr) throw assignmentErr;
      const assignmentRows = assignmentData || [];

      // Submission stats
      let submissionStats: Record<string, { submitted: number; graded: number; total: number; scores: number[] }> = {};
      if (assignmentRows.length > 0) {
        const assignmentIds = assignmentRows.map((a: any) => a.id);
        const { data: subData } = await supabase
          .from("assignment_submissions")
          .select("assignment_id, status, score")
          .in("assignment_id", assignmentIds);

        if (subData) {
          submissionStats = subData.reduce((acc: Record<string, any>, sub: any) => {
            const aid = String(sub.assignment_id);
            if (!acc[aid]) {
              acc[aid] = { submitted: 0, graded: 0, total: 0, scores: [] };
            }
            acc[aid].total++;
            if (sub.status === "submitted" || sub.status === "graded" || sub.status === "late") {
              acc[aid].submitted++;
            }
            if (sub.status === "graded" && sub.score !== null) {
              acc[aid].graded++;
              acc[aid].scores.push(Number(sub.score));
            }
            return acc;
          }, {});
        }
      }

      const typedAssignments: AssignmentRow[] = assignmentRows.map((a: any) => {
        const stats = submissionStats[String(a.id)] || { submitted: 0, graded: 0, total: 0, scores: [] };
        const avgScore = stats.scores.length > 0
          ? stats.scores.reduce((sum, s) => sum + s, 0) / stats.scores.length
          : 0;
        const pendingCount = totalStudents - stats.submitted;

        let status: "active" | "completed" | "overdue" = "active";
        if (a.due_date) {
          const dueDate = new Date(a.due_date);
          const now = new Date();
          if (now > dueDate && stats.submitted < totalStudents) {
            status = "overdue";
          } else if (stats.graded === totalStudents && totalStudents > 0) {
            status = "completed";
          }
        }

        return {
          id: String(a.id),
          course_id: String(a.class_id),
          title: String(a.title || "Untitled Assignment"),
          description: a.description ? String(a.description) : null,
          due_date: a.due_date ? String(a.due_date) : null,
          max_score: Number(a.max_score || 100),
          created_at: String(a.created_at),
          updated_at: String(a.updated_at),
          total_students: totalStudents,
          submitted_count: stats.submitted,
          graded_count: stats.graded,
          pending_count: Math.max(0, pendingCount),
          average_score: avgScore,
          status,
          attachment_url: a.attachment_url || null,
          attachment_name: a.attachment_name || null,
        };
      });

      setAssignments(typedAssignments);
      toast.success(`Loaded ${typedAssignments.length} assignments`);
    } catch (err: any) {
      toast.error(err.message);
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  // ---------- Submissions loading ----------
  const loadSubmissions = useCallback(async (assignmentId: string) => {
    if (!selectedAssignment?.course_id) return;
    try {
      setLoadingSubmissions(true);

      // Get all enrolled students
      const { data: enrollments, error: enrollErr } = await supabase
        .from("course_enrollments")
        .select(`
          id,
          student:users!course_enrollments_student_id_fkey (
            id, full_name, email, roll_no
          )
        `)
        .eq("course_id", selectedAssignment.course_id);

      if (enrollErr) throw enrollErr;

      const students = (enrollments || []).map((e: any) => ({
        id: e.student?.id || e.student_id,
        full_name: e.student?.full_name || "Unknown",
        email: e.student?.email || "",
        roll_no: e.student?.roll_no || "N/A",
      }));

      // Get submissions for this assignment
      const { data: subs, error: subsErr } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId);

      if (subsErr) throw subsErr;

      const submissionMap: Record<string, any> = {};
      (subs || []).forEach((sub) => {
        submissionMap[sub.student_id] = sub;
      });

      const combined: StudentSubmission[] = students.map((student) => {
        const sub = submissionMap[student.id];
        return {
          id: sub?.id || "",
          student_id: student.id,
          student_name: student.full_name,
          student_email: student.email,
          student_roll_no: student.roll_no,
          status: sub?.status || "pending",
          submitted_at: sub?.submitted_at || null,
          score: sub?.score || null,
          attachment_url: sub?.attachment_url || null,
          attachment_name: sub?.attachment_name || null,
        };
      });

      setSubmissions(combined);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [selectedAssignment]);

  // ---------- File upload ----------
  const handleUploadAttachment = async (file: File): Promise<string | null> => {
    if (!selectedCourse) {
      toast.error("No course selected");
      return null;
    }
    try {
      setUploadingFile(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `assignments/${selectedCourse}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("assignment-files")
        .upload(filePath, file, { upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("assignment-files")
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (err: any) {
      toast.error(err.message);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  // ---------- Save assignment ----------
  const handleSaveAssignment = async () => {
    if (!selectedCourse) {
      toast.error("Please select a course first");
      return;
    }
    if (!assignmentForm.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    try {
      setSavingAssignment(true);
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (assignmentForm.attachment) {
        attachmentUrl = await handleUploadAttachment(assignmentForm.attachment);
        attachmentName = assignmentForm.attachment.name;
      }

      const assignmentData = {
        class_id: selectedCourse,
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim() || null,
        due_date: assignmentForm.due_date || null,
        max_score: Number(assignmentForm.max_score) || 100,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        updated_at: new Date().toISOString(),
      };

      if (editingAssignment) {
        const { error } = await supabase
          .from("assignments")
          .update(assignmentData)
          .eq("id", editingAssignment.id);
        if (error) throw error;
        toast.success("Assignment updated");
      } else {
        const { error } = await supabase
          .from("assignments")
          .insert([assignmentData]);
        if (error) throw error;
        toast.success("Assignment created");
      }

      setShowAssignmentDialog(false);
      setAssignmentForm({ title: "", description: "", due_date: "", max_score: "100", attachment: null });
      await loadAssignments(selectedCourse);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingAssignment(false);
    }
  };

  // ---------- Delete assignment ----------
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment? This action cannot be undone.")) return;
    try {
      const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
      if (error) throw error;
      toast.success("Assignment deleted");
      if (selectedCourse) await loadAssignments(selectedCourse);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ---------- View submissions ----------
  const handleViewSubmissions = async (assignment: AssignmentRow) => {
    setSelectedAssignment(assignment);
    setShowSubmissionsDialog(true);
    await loadSubmissions(assignment.id);
  };

  // ---------- Upload marks ----------
  const handleUploadMarks = (assignment: AssignmentRow) => {
    setSelectedAssignment(assignment);
    setShowMarksDialog(true);
    loadSubmissions(assignment.id);
  };

  const handleDownloadTemplate = () => {
    if (submissions.length === 0) {
      toast.error("No students found");
      return;
    }
    const headers = ["student_id", "student_name", "student_roll_no", "score", "feedback"];
    const rows = submissions.map((s) => [s.student_id, s.student_name, s.student_roll_no, s.score || "", ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marks_template_${selectedAssignment?.title?.replace(/[^a-z0-9]/gi, "_") || "assignment"}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleUploadMarksFile = async (file: File) => {
    try {
      setUploadingFile(true);
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast.error("CSV is empty"); return; }

      const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
      const studentIdIdx = headers.indexOf("student_id");
      const scoreIdx = headers.indexOf("score");
      if (studentIdIdx === -1 || scoreIdx === -1) {
        toast.error("CSV must contain student_id and score columns");
        return;
      }

      const updatedMarks: Record<string, string> = {};
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const cleaned = cells.map((c) => c.trim().replace(/^"|"$/g, ""));
        const studentId = cleaned[studentIdIdx];
        const score = cleaned[scoreIdx];
        if (studentId && score !== undefined) {
          updatedMarks[studentId] = score;
        }
      }
      setBulkMarks((prev) => ({ ...prev, ...updatedMarks }));
      toast.success(`Loaded marks for ${Object.keys(updatedMarks).length} students`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveMarks = async () => {
    if (!selectedAssignment) return;
    try {
      setSavingMarks(true);
      const updates: any[] = [];
      for (const [studentId, score] of Object.entries(bulkMarks)) {
        if (score.trim() === "") continue;
        const numericScore = parseFloat(score);
        if (isNaN(numericScore) || numericScore < 0 || numericScore > selectedAssignment.max_score) continue;
        updates.push({
          assignment_id: selectedAssignment.id,
          student_id: studentId,
          score: numericScore,
          status: "graded",
          graded_at: new Date().toISOString(),
        });
      }
      if (updates.length === 0) { toast.info("No marks to save"); return; }

      const { error } = await supabase.from("assignment_submissions").upsert(updates, {
        onConflict: "assignment_id,student_id",
        ignoreDuplicates: false,
      });
      if (error) throw error;
      toast.success("Marks saved");
      setShowMarksDialog(false);
      if (selectedCourse) await loadAssignments(selectedCourse);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingMarks(false);
    }
  };

  // ---------- Helpers ----------
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "overdue": return "bg-red-100 text-red-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "overdue": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case "graded": return "bg-green-100 text-green-800";
      case "submitted": return "bg-blue-100 text-blue-800";
      case "late": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // ---------- Derivative states ----------
  useEffect(() => {
    if (selectedProgram) {
      const programSemesters = semesters.filter((s) => s.program_id === selectedProgram);
      if (!selectedSemester || !programSemesters.find((s) => s.id === selectedSemester)) {
        setSelectedSemester(programSemesters[0]?.id || null);
        setSelectedCourse(null);
      }
    }
  }, [selectedProgram, semesters, selectedSemester]);

  useEffect(() => {
    if (selectedCourse) {
      void loadAssignments(selectedCourse);
    } else {
      setAssignments([]);
    }
  }, [selectedCourse, loadAssignments]);

  const currentPrograms = useMemo(() => programs, [programs]);
  const semestersForSelectedProgram = useMemo(
    () => (selectedProgram ? semesters.filter((s) => s.program_id === selectedProgram) : []),
    [selectedProgram, semesters]
  );
  const coursesForSemester = useMemo(
    () => (selectedSemester ? courses.filter((c) => c.semester_id === selectedSemester) : []),
    [courses, selectedSemester]
  );
  const currentCourse = useMemo(
    () => (selectedCourse ? coursesForSemester.find((c) => c.id === selectedCourse) ?? null : null),
    [coursesForSemester, selectedCourse]
  );

  const filteredAssignments = useMemo(() => {
    let filtered = assignments;
    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedStatus !== "all") {
      filtered = filtered.filter((a) => a.status === selectedStatus);
    }
    return filtered;
  }, [assignments, searchQuery, selectedStatus]);

  const handleResetFilters = () => {
    setSelectedProgram(null);
    setSelectedSemester(null);
    setSelectedCourse(null);
    setSearchQuery("");
    setSelectedStatus("all");
  };

  // ---------- Dialog openers ----------
  const handleCreateAssignment = () => {
    setEditingAssignment(null);
    setAssignmentForm({ title: "", description: "", due_date: "", max_score: "100", attachment: null });
    setShowAssignmentDialog(true);
  };

  const handleEditAssignment = (assignment: AssignmentRow) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description || "",
      due_date: assignment.due_date ? assignment.due_date.split("T")[0] : "",
      max_score: String(assignment.max_score),
      attachment: null,
    });
    setShowAssignmentDialog(true);
  };

  if (authLoading || !department) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/hod/programs")}
              className="text-white/80 hover:text-white mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Programs
            </Button>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="h-8 w-8" />
              Assignment Management
            </h1>
            <p className="text-blue-100 opacity-90">
              {department.name} ({department.code}) – HoD Dashboard
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadLookups}
            disabled={loadingLookups}
          >
            {loadingLookups ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Hierarchy Selection */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Academic Hierarchy
              </CardTitle>
              <CardDescription>
                {department.name} – Select a program, semester, and course
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              <Filter className="h-3 w-3 mr-2" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Program selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Library className="h-4 w-4 text-green-600" />
              </div>
              <label className="block text-sm font-semibold text-gray-700">
                <ChevronRight className="h-4 w-4 inline" /> Step 1: Select Program
              </label>
            </div>
            {currentPrograms.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <BookOpenCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No programs in your department</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentPrograms.map((program) => (
                  <button
                    key={program.id}
                    onClick={() => {
                      setSelectedProgram(program.id);
                      setSelectedSemester(null);
                      setSelectedCourse(null);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedProgram === program.id
                        ? "border-blue-500 bg-gradient-to-r from-slate-600 to-slate-800 text-white shadow-lg"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    disabled={loadingLookups}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📚</span>
                        <div>
                          <h3 className="font-bold">{program.code}</h3>
                          <p className="text-sm opacity-90">{program.name}</p>
                        </div>
                      </div>
                      {selectedProgram === program.id && <CheckCircle className="h-5 w-5" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Semester selection */}
          {selectedProgram && (
            <div className="animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                </div>
                <label className="block text-sm font-semibold text-gray-700">
                  <ChevronRight className="h-4 w-4 inline" /> Step 2: Select Semester
                </label>
              </div>
              {semestersForSelectedProgram.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No semesters for this program</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {semestersForSelectedProgram.map((semester) => (
                    <button
                      key={semester.id}
                      onClick={() => {
                        setSelectedSemester(semester.id);
                        setSelectedCourse(null);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedSemester === semester.id
                          ? "border-blue-500 bg-blue-50 shadow-lg"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900">{semester.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {semester.semester_type} {semester.year}
                          </p>
                          <Badge className={`mt-2 ${getStatusColor(semester.status)}`}>
                            {semester.status}
                          </Badge>
                        </div>
                        {selectedSemester === semester.id && <CheckCircle className="h-5 w-5 text-blue-500" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Course selection */}
          {selectedSemester && (
            <div className="animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BookOpen className="h-4 w-4 text-orange-600" />
                </div>
                <label className="block text-sm font-semibold text-gray-700">
                  <ChevronRight className="h-4 w-4 inline" /> Step 3: Select Course
                </label>
              </div>
              {coursesForSemester.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No courses in this semester</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {coursesForSemester.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => setSelectedCourse(course.id)}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        selectedCourse === course.id
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{course.code}</div>
                          <div className="text-sm text-gray-600 mt-1">{course.name}</div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>Sec: {course.section || "N/A"}</span>
                            <span>•</span>
                            <span>{course.enrollment_count || 0} students</span>
                          </div>
                        </div>
                        {selectedCourse === course.id && <CheckCircle className="h-5 w-5 text-blue-500 mt-1" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignments section */}
      {currentCourse && (
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Assignments for {currentCourse.code}
                </CardTitle>
                <CardDescription className="mt-1">
                  {currentCourse.name} • {currentCourse.enrollment_count} students
                </CardDescription>
              </div>
              <Button onClick={handleCreateAssignment} disabled={loadingAssignments}>
                <Plus className="h-4 w-4 mr-2" /> Create Assignment
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <Tabs value="assignments" className="mb-6">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="assignments">Assignments</TabsTrigger>
                <TabsTrigger value="submissions">Submissions & Marks</TabsTrigger>
              </TabsList>

              <TabsContent value="assignments" className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search assignments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loadingAssignments ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : filteredAssignments.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No assignments found</p>
                    <Button variant="outline" className="mt-4" onClick={handleCreateAssignment}>
                      <Plus className="h-4 w-4 mr-2" /> Create First Assignment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAssignments.map((assignment) => (
                      <Card key={assignment.id} className="border hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                                <Badge className={getStatusColor(assignment.status)}>
                                  {getStatusIcon(assignment.status)}
                                  {assignment.status}
                                </Badge>
                              </div>
                              {assignment.description && (
                                <p className="text-sm text-gray-600 mb-4">{assignment.description}</p>
                              )}
                              {assignment.attachment_url && (
                                <div className="flex items-center gap-2 mb-4">
                                  <Paperclip className="h-4 w-4 text-gray-400" />
                                  <a
                                    href={assignment.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    {assignment.attachment_name || "Download"}
                                  </a>
                                </div>
                              )}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-400" />
                                  <div>
                                    <p className="text-xs text-gray-500">Total</p>
                                    <p className="font-semibold">{assignment.total_students}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">Submitted</p>
                                    <p className="font-semibold">{assignment.submitted_count}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Award className="h-4 w-4 text-blue-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">Graded</p>
                                    <p className="font-semibold">{assignment.graded_count}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-orange-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">Pending</p>
                                    <p className="font-semibold">{assignment.pending_count}</p>
                                  </div>
                                </div>
                              </div>
                              <Progress
                                value={
                                  assignment.total_students > 0
                                    ? (assignment.submitted_count / assignment.total_students) * 100
                                    : 0
                                }
                                className="h-2 mb-4"
                              />
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                {assignment.due_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" /> Due: {new Date(assignment.due_date).toLocaleDateString()}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Target className="h-4 w-4" /> Max: {assignment.max_score}
                                </span>
                                {assignment.graded_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <BarChart3 className="h-4 w-4" /> Avg: {assignment.average_score.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <Button size="sm" variant="ghost" onClick={() => handleEditAssignment(assignment)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleViewSubmissions(assignment)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleUploadMarks(assignment)}>
                                <GraduationCap className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteAssignment(assignment.id)}>
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

              <TabsContent value="submissions" className="space-y-6">
                {assignments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No assignments available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recent Submissions</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Assignment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Graded</TableHead>
                          <TableHead>Average Score</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.slice(0, 5).map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">{assignment.title}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(assignment.status)}>{assignment.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {assignment.submitted_count}/{assignment.total_students}
                            </TableCell>
                            <TableCell>
                              {assignment.graded_count}/{assignment.total_students}
                            </TableCell>
                            <TableCell>
                              {assignment.average_score > 0
                                ? `${assignment.average_score.toFixed(1)}/${assignment.max_score}`
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleViewSubmissions(assignment)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleUploadMarks(assignment)}>
                                  <GraduationCap className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Assignment Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? "Edit Assignment" : "Create New Assignment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                placeholder="Assignment title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={assignmentForm.due_date}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="max_score">Max Score *</Label>
                <Input
                  id="max_score"
                  type="number"
                  value={assignmentForm.max_score}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, max_score: e.target.value })}
                  min="0"
                  max="1000"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="attachment">Attachment (optional)</Label>
              <Input
                id="attachment"
                type="file"
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, attachment: e.target.files?.[0] || null })
                }
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignment} disabled={savingAssignment || uploadingFile}>
              {savingAssignment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingAssignment ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submissions Dialog */}
      <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Submissions for {selectedAssignment?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {loadingSubmissions ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Attachment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.student_name}</p>
                          <p className="text-xs text-gray-500">{sub.student_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{sub.student_roll_no}</TableCell>
                      <TableCell>
                        <Badge className={getSubmissionStatusColor(sub.status)}>{sub.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {sub.score !== null ? `${sub.score}/${selectedAssignment?.max_score}` : "-"}
                      </TableCell>
                      <TableCell>
                        {sub.attachment_url ? (
                          <a
                            href={sub.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          "No file"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Marks Dialog */}
      <Dialog open={showMarksDialog} onOpenChange={setShowMarksDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Upload Marks for {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>Max score: {selectedAssignment?.max_score}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Enter marks for each student</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Download Template
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById("marks-csv-upload")?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" /> Upload CSV
                </Button>
                <input
                  id="marks-csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadMarksFile(file);
                  }}
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Current Score</TableHead>
                  <TableHead>New Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sub.student_name}</p>
                        <p className="text-xs text-gray-500">{sub.student_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{sub.student_roll_no}</TableCell>
                    <TableCell>{sub.score ?? "-"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max={selectedAssignment?.max_score}
                        step="0.5"
                        value={bulkMarks[sub.student_id] || ""}
                        onChange={(e) =>
                          setBulkMarks({ ...bulkMarks, [sub.student_id]: e.target.value })
                        }
                        className="w-24"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarksDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMarks} disabled={savingMarks}>
              {savingMarks ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Marks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}