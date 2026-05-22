/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";

import supabase from "@/lib/supabase/client";

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
  Lock,
  ChevronRight,
  BookOpen,
  Target,
  Sparkles,
  Filter,
  Layers,
  School,
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
  FileUp,
  CheckSquare,
  XCircle,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  FileCheck,
  Paperclip,
} from "lucide-react";

type Department = {
  id: string;
  name: string;
  code: string;
  color?: string | null;
  icon?: string | null;
};

type Program = {
  id: string;
  name: string;
  code: string;
  department_id: string;
  color?: string | null;
  icon?: string | null;
};

type Semester = {
  id: string;
  name: string;
  semester_type: string;
  year: number;
  program_id: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "completed";
  total_courses: number;
  total_students: number;
};

type CourseRow = {
  id: string;
  name: string;
  code: string;
  section: string | null;
  semester_id: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  total_students: number;
  department_id: string;
  program_id: string | null;
  enrollment_count?: number;
  instructor?: string | null;
};

type AssignmentRow = {
  id: string;
  course_id: string; // Changed from class_id
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
  status?: "active" | "completed" | "overdue";
  attachment_url?: string | null;
  attachment_name?: string | null;
};

type AssignmentFormState = {
  id?: string;
  title: string;
  description: string;
  due_date: string;
  max_score: string;
  attachment?: File | null;
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
  feedback: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
};

export default function AdminAssignmentsPage() {
  const [isAuthorized, setIsAuthorized] = useState(true);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    null
  );
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const [loadingLookups, setLoadingLookups] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "active" | "completed" | "overdue"
  >("all");

  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState<AssignmentRow | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>({
    title: "",
    description: "",
    due_date: "",
    max_score: "100",
    attachment: null,
  });

  const [animateIn, setAnimateIn] = useState(false);

  // New states for submissions and marks
  const [selectedAssignment, setSelectedAssignment] =
    useState<AssignmentRow | null>(null);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
  const [showMarksDialog, setShowMarksDialog] = useState(false);
  const [bulkMarks, setBulkMarks] = useState<Record<string, string>>({});
  const [savingMarks, setSavingMarks] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // New state for active tab
  const [activeTab, setActiveTab] = useState("assignments");

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  const loadLookups = useCallback(async () => {
    try {
      setLoadingLookups(true);
      console.log("🔄 [loadLookups] Starting to load lookup data...");

      if (!supabase) {
        throw new Error("Supabase client is not initialized");
      }

      const [
        { data: deptData, error: deptErr },
        { data: progData, error: progErr },
        { data: semData, error: semErr },
        { data: courseData, error: courseErr },
      ] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name, code")
          .order("name", { ascending: true }),
        supabase
          .from("programs")
          .select("id, name, code, department_id")
          .order("name", { ascending: true }),
        supabase
          .from("semesters")
          .select(
            "id, name, semester_type, year, program_id, start_date, end_date, status, total_courses, total_students"
          )
          .order("year", { ascending: false })
          .order("start_date", { ascending: false }),
        supabase
          .from("courses")
          .select(
            `
            id,
            name,
            code,
            section,
            semester_id,
            teacher_id,
            department_id,
            program_id,
            instructor
          `
          )
          .order("code", { ascending: true }),
      ]);

      console.log("✅ [loadLookups] All queries completed", {
        departments: deptData?.length || 0,
        programs: progData?.length || 0,
        semesters: semData?.length || 0,
        courses: courseData?.length || 0,
      });

      if (deptErr) console.error("❌ Department query error:", deptErr.message);
      if (progErr) console.error("❌ Program query error:", progErr.message);
      if (semErr) console.error("❌ Semester query error:", semErr.message);
      if (courseErr) console.error("❌ Course query error:", courseErr.message);

      const typedDepts: Department[] = (deptData || []).map((dept: any) => ({
        id: String(dept.id),
        name: String(dept.name || ""),
        code: String(dept.code || ""),
        color: null,
        icon: null,
      }));

      const typedProgs: Program[] = (progData || []).map((prog: any) => ({
        id: String(prog.id),
        name: String(prog.name || ""),
        code: String(prog.code || ""),
        department_id: String(prog.department_id),
        color: null,
        icon: null,
      }));

      const typedSems: Semester[] = (semData || []).map((sem: any) => ({
        id: String(sem.id),
        name: String(sem.name || ""),
        semester_type: String(sem.semester_type || ""),
        year: Number(sem.year || 0),
        program_id: String(sem.program_id),
        start_date: String(sem.start_date || ""),
        end_date: String(sem.end_date || ""),
        status: (sem.status as "upcoming" | "active" | "completed") || "active",
        total_courses: Number(sem.total_courses || 0),
        total_students: Number(sem.total_students || 0),
      }));

      const courseRows = (courseData || []) as any[];

      const teacherIds = [
        ...new Set(
          courseRows.map((c) => c.teacher_id).filter(Boolean) as string[]
        ),
      ];

      let teacherMap: Record<string, string> = {};
      if (teacherIds.length > 0) {
        try {
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
        } catch (teacherErr: any) {
          console.warn("⚠️ Error fetching teachers:", teacherErr?.message);
        }
      }

      let enrollmentMap: Record<string, number> = {};
      if (courseRows.length > 0) {
        try {
          const courseIds = courseRows.map((c) => String(c.id));
          const { data: enrollData } = await supabase
            .from("course_enrollments")
            .select("course_id")
            .in("course_id", courseIds);

          if (enrollData) {
            enrollmentMap = enrollData.reduce(
              (acc: Record<string, number>, e: any) => {
                const cid = String(e.course_id);
                acc[cid] = (acc[cid] || 0) + 1;
                return acc;
              },
              {}
            );
          }
        } catch (enrollmentErr: any) {
          console.warn(
            "⚠️ Error fetching enrollments:",
            enrollmentErr?.message
          );
        }
      }

      const typedCourses: CourseRow[] = courseRows.map((c: any) => ({
        id: String(c.id),
        name: String(c.name || ""),
        code: String(c.code || ""),
        section: c.section ? String(c.section) : null,
        semester_id: c.semester_id ? String(c.semester_id) : null,
        teacher_id: c.teacher_id ? String(c.teacher_id) : null,
        teacher_name: c.teacher_id
          ? teacherMap[String(c.teacher_id)] ?? null
          : null,
        instructor: c.instructor ? String(c.instructor) : null,
        total_students: enrollmentMap[String(c.id)] || 0,
        department_id: String(c.department_id),
        program_id: c.program_id ? String(c.program_id) : null,
        enrollment_count: enrollmentMap[String(c.id)] || 0,
      }));

      setDepartments(typedDepts);
      setPrograms(typedProgs);
      setSemesters(typedSems);
      setCourses(typedCourses);

      if (
        selectedDepartment &&
        !typedDepts.find((d) => d.id === selectedDepartment)
      ) {
        setSelectedDepartment(null);
      }
      if (
        selectedProgram &&
        !typedProgs.find((p) => p.id === selectedProgram)
      ) {
        setSelectedProgram(null);
      }
      if (
        selectedSemester &&
        !typedSems.find((s) => s.id === selectedSemester)
      ) {
        setSelectedSemester(null);
      }
      if (
        selectedCourse &&
        !typedCourses.find((c) => c.id === selectedCourse)
      ) {
        setSelectedCourse(null);
      }

      console.log("🎉 [loadLookups] Successfully loaded data");
      toast.success(
        `Loaded ${typedDepts.length} departments, ${typedProgs.length} programs, ${typedSems.length} semesters, ${typedCourses.length} courses`
      );
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to load reference data";
      console.error("❌ [loadLookups] Unexpected error:", errorMessage);
      toast.error(errorMessage);

      setDepartments([]);
      setPrograms([]);
      setSemesters([]);
      setCourses([]);
    } finally {
      setLoadingLookups(false);
    }
  }, [selectedDepartment, selectedProgram, selectedSemester, selectedCourse]);

 const loadAssignments = useCallback(async (courseId: string) => {
  try {
    setLoadingAssignments(true);
    console.log(
      `📚 [loadAssignments] Loading assignments for course: ${courseId}`
    );

    if (!courseId) {
      console.error("❌ [loadAssignments] No courseId provided");
      toast.error("No course selected");
      setAssignments([]);
      return;
    }

    // Get total students enrolled in the course
    let totalStudents = 0;
    try {
      const { count, error: enrollmentError } = await supabase
        .from("course_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId);

      if (enrollmentError) {
        console.warn(
          "⚠️ [loadAssignments] Error fetching enrollment count:",
          enrollmentError.message
        );
      } else {
        totalStudents = count || 0;
        console.log(
          `👥 [loadAssignments] Total students in course: ${totalStudents}`
        );
      }
    } catch (enrollmentErr: any) {
      console.warn(
        "⚠️ [loadAssignments] Could not fetch enrollment count:",
        enrollmentErr?.message
      );
    }

    // FIXED: Use class_id instead of course_id
    const { data: assignmentData, error: assignmentErr } = await supabase
      .from("assignments")
      .select("*")
      .eq("class_id", courseId) // ✅ FIXED: Changed from course_id to class_id
      .order("created_at", { ascending: false });

    if (assignmentErr) {
      const errorMessage = assignmentErr.message || "Unknown database error";
      console.error("❌ [loadAssignments] Database error:", errorMessage);
      throw new Error(`Database error: ${errorMessage}`);
    }

    const assignmentRows = assignmentData || [];
    console.log(
      `📄 [loadAssignments] Found ${assignmentRows.length} assignments`
    );

    if (assignmentRows.length === 0) {
      setAssignments([]);
      toast.info("No assignments found for this course");
      return;
    }

    const assignmentIds = assignmentRows.map((a: any) => a.id);

    let submissionStats: Record<
      string,
      { submitted: number; graded: number; total: number; scores: number[] }
    > = {};

    if (assignmentIds.length > 0) {
      try {
        const { data: submissionData, error: submissionErr } = await supabase
          .from("assignment_submissions")
          .select("assignment_id, status, score")
          .in("assignment_id", assignmentIds);

        if (submissionErr) {
          console.warn(
            "⚠️ [loadAssignments] Failed to fetch submission stats:",
            submissionErr.message
          );
        } else if (submissionData) {
          console.log(
            `📊 [loadAssignments] Found ${submissionData.length} submissions`
          );

          submissionStats = submissionData.reduce(
            (
              acc: Record<
                string,
                {
                  submitted: number;
                  graded: number;
                  total: number;
                  scores: number[];
                }
              >,
              sub: any
            ) => {
              const aid = String(sub.assignment_id);
              if (!acc[aid]) {
                acc[aid] = { submitted: 0, graded: 0, total: 0, scores: [] };
              }
              acc[aid].total++;
              if (
                sub.status === "submitted" ||
                sub.status === "graded" ||
                sub.status === "late"
              ) {
                acc[aid].submitted++;
              }
              if (sub.status === "graded" && sub.score !== null) {
                acc[aid].graded++;
                acc[aid].scores.push(Number(sub.score));
              }
              return acc;
            },
            {}
          );
        }
      } catch (submissionError: any) {
        console.warn(
          "⚠️ [loadAssignments] Error processing submission stats:",
          submissionError?.message
        );
      }
    }

    const typedAssignments: AssignmentRow[] = assignmentRows.map((a: any) => {
      const stats = submissionStats[String(a.id)] || {
        submitted: 0,
        graded: 0,
        total: 0,
        scores: [],
      };
      const avgScore =
        stats.scores && stats.scores.length > 0
          ? stats.scores.reduce((sum: number, s: number) => sum + s, 0) /
            stats.scores.length
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
        course_id: String(a.class_id), // Map class_id to course_id for internal use
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
    console.log(
      `✅ [loadAssignments] Successfully loaded ${typedAssignments.length} assignments`
    );
    toast.success(`Loaded ${typedAssignments.length} assignments`);
  } catch (err: any) {
    const errorMessage = err?.message || "Unknown error loading assignments";
    console.error(
      "❌ [loadAssignments] Error loading assignments:",
      errorMessage
    );
    toast.error(errorMessage);
    setAssignments([]);
  } finally {
    setLoadingAssignments(false);
  }
}, []);

  const loadSubmissions = useCallback(
    async (assignmentId: string) => {
      try {
        setLoadingSubmissions(true);

        if (!selectedAssignment?.course_id) {
          // Changed from class_id to course_id
          toast.error("No course selected");
          return;
        }

        console.log(
          `📝 [loadSubmissions] Loading submissions for assignment: ${assignmentId}`
        );

        // Use course_id instead of class_id
        const { data: enrollmentData, error: enrollmentErr } = await supabase
          .from("course_enrollments")
          .select(
            `
        id,
        student:users!course_enrollments_student_id_fkey (
          id,
          full_name,
          email,
          roll_no
        )
      `
          )
          .eq("course_id", selectedAssignment.course_id); // Changed from class_id to course_id

        // ... rest of the function remains the same
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to load submissions";
        console.error("❌ [loadSubmissions] Error:", errorMessage);
        toast.error(errorMessage);
        setSubmissions([]);
      } finally {
        setLoadingSubmissions(false);
      }
    },
    [selectedAssignment]
  );

  const handleUploadAttachment = async (
    file: File,
    assignmentId?: string
  ): Promise<string | null> => {
    try {
      setUploadingFile(true);

      if (!selectedCourse) {
        toast.error("No course selected");
        return null;
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast.error("File size exceeds 50MB limit");
        return null;
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "Invalid file type. Please upload PDF, Word, Excel, PowerPoint, or Text files."
        );
        return null;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `assignments/${selectedCourse}/${fileName}`;

      console.log(`📤 [handleUploadAttachment] Uploading file: ${file.name}`);
      console.log(
        `📤 [handleUploadAttachment] File size: ${(
          file.size /
          1024 /
          1024
        ).toFixed(2)}MB`
      );
      console.log(`📤 [handleUploadAttachment] File path: ${filePath}`);

      // Check if bucket exists by trying to list files
      try {
        const { data: bucketCheck, error: bucketError } = await supabase.storage
          .from("assignment-files")
          .list("", { limit: 1 });

        if (bucketError) {
          console.error(
            "❌ [handleUploadAttachment] Bucket error:",
            bucketError
          );
          throw new Error(
            'Storage bucket "assignment-files" does not exist or is not accessible. Please create it in Supabase Dashboard → Storage.'
          );
        }
      } catch (bucketErr: any) {
        console.error(
          "❌ [handleUploadAttachment] Bucket check failed:",
          bucketErr
        );
        toast.error("Storage bucket not found. Please contact administrator.");
        return null;
      }

      // Upload the file
      const { data, error } = await supabase.storage
        .from("assignment-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("❌ [handleUploadAttachment] Upload error:", error);

        // Handle specific error cases
        if (error.message.includes("Bucket not found")) {
          throw new Error(
            'Storage bucket "assignment-files" not found. Please create it in Supabase Dashboard.'
          );
        } else if (error.message.includes("row-level security")) {
          throw new Error(
            "Storage permission denied. Please configure storage policies."
          );
        } else if (error.message.includes("size")) {
          throw new Error("File size exceeds the limit.");
        } else {
          throw new Error(`Upload failed: ${error.message}`);
        }
      }

      if (!data || !data.path) {
        throw new Error("Upload succeeded but no file path was returned");
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("assignment-files")
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error("Could not generate public URL for uploaded file");
      }

      console.log("✅ [handleUploadAttachment] File uploaded successfully");
      console.log("✅ [handleUploadAttachment] Public URL:", urlData.publicUrl);

      toast.success("File uploaded successfully");
      return urlData.publicUrl;
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to upload attachment";
      console.error("❌ [handleUploadAttachment] Error:", errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

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
      console.log("💾 [handleSaveAssignment] Saving assignment...");

      let attachmentUrl = null;
      let attachmentName = null;

      // Upload attachment if provided
      if (assignmentForm.attachment) {
        console.log("📎 [handleSaveAssignment] Uploading attachment...");
        const url = await handleUploadAttachment(assignmentForm.attachment);

        if (url) {
          attachmentUrl = url;
          attachmentName = assignmentForm.attachment.name;
          console.log(
            "✅ [handleSaveAssignment] Attachment uploaded:",
            attachmentUrl
          );
        } else {
          // If upload fails, ask user if they want to continue without attachment
          const continueWithoutFile = confirm(
            "File upload failed. Do you want to save the assignment without the attachment?"
          );

          if (!continueWithoutFile) {
            toast.info("Assignment save cancelled");
            return;
          }
        }
      }

      // Prepare assignment data - use class_id since that's what your DB has
      const assignmentData = {
        class_id: selectedCourse, // Use class_id to match your actual database
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim() || null,
        due_date: assignmentForm.due_date || null,
        max_score: Number(assignmentForm.max_score) || 100,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        updated_at: new Date().toISOString(),
      };

      console.log("💾 [handleSaveAssignment] Assignment data:", assignmentData);

      if (editingAssignment) {
        console.log(
          `✏️ [handleSaveAssignment] Updating assignment: ${editingAssignment.id}`
        );
        const { error } = await supabase
          .from("assignments")
          .update(assignmentData)
          .eq("id", editingAssignment.id);

        if (error) {
          console.error(
            "❌ [handleSaveAssignment] Update error:",
            error.message
          );
          throw new Error(`Update failed: ${error.message}`);
        }
        toast.success("Assignment updated successfully");
      } else {
        console.log("➕ [handleSaveAssignment] Creating new assignment");
        const { error } = await supabase
          .from("assignments")
          .insert([assignmentData]);

        if (error) {
          console.error(
            "❌ [handleSaveAssignment] Insert error:",
            error.message
          );
          throw new Error(`Creation failed: ${error.message}`);
        }
        toast.success("Assignment created successfully");
      }

      // Reset form and close dialog
      setShowAssignmentDialog(false);
      setAssignmentForm({
        title: "",
        description: "",
        due_date: "",
        max_score: "100",
        attachment: null,
      });

      // Reload assignments
      await loadAssignments(selectedCourse);
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to save assignment";
      console.error("❌ [handleSaveAssignment] Error:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleViewSubmissions = async (assignment: AssignmentRow) => {
    setSelectedAssignment(assignment);
    setShowSubmissionsDialog(true);
    await loadSubmissions(assignment.id);
  };

  const handleUploadMarks = (assignment: AssignmentRow) => {
    setSelectedAssignment(assignment);
    setShowMarksDialog(true);
    loadSubmissions(assignment.id);
  };

  const handleDownloadTemplate = () => {
    if (submissions.length === 0) {
      toast.error("No students found to create template");
      return;
    }

    const headers = [
      "student_id",
      "student_name",
      "student_roll_no",
      "score",
      "feedback",
    ];
    const rows = submissions.map((sub) => [
      sub.student_id,
      sub.student_name,
      sub.student_roll_no,
      sub.score || "",
      sub.feedback || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marks_template_${
      selectedAssignment?.title?.replace(/[^a-z0-9]/gi, "_") || "assignment"
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Template downloaded successfully");
  };

  const handleUploadMarksFile = async (file: File) => {
    try {
      setUploadingFile(true);
      console.log("📄 [handleUploadMarksFile] Processing CSV file:", file.name);

      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim() !== "");

      if (lines.length < 2) {
        toast.error("CSV file is empty or has no data rows");
        return;
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.replace(/"/g, "").trim());

      const studentIdIndex = headers.indexOf("student_id");
      const scoreIndex = headers.indexOf("score");
      const feedbackIndex = headers.indexOf("feedback");

      if (studentIdIndex === -1) {
        toast.error("CSV must contain student_id column");
        return;
      }

      if (scoreIndex === -1) {
        toast.error("CSV must contain score column");
        return;
      }

      const updatedMarks: Record<string, string> = { ...bulkMarks };

      let processedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const cells = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const cleanedCells = cells.map((cell) => {
          const trimmed = cell.trim();
          return trimmed.startsWith('"') && trimmed.endsWith('"')
            ? trimmed.slice(1, -1).replace(/""/g, '"')
            : trimmed;
        });

        if (cleanedCells.length <= Math.max(studentIdIndex, scoreIndex)) {
          console.warn(`⚠️ Skipping invalid row ${i}: ${line}`);
          continue;
        }

        const studentId = cleanedCells[studentIdIndex];
        const score = cleanedCells[scoreIndex];
        const feedback =
          feedbackIndex !== -1 && feedbackIndex < cleanedCells.length
            ? cleanedCells[feedbackIndex]
            : "";

        if (studentId && score !== undefined && score !== "") {
          updatedMarks[studentId] = score;
          processedCount++;
        }
      }

      setBulkMarks(updatedMarks);
      console.log(
        `✅ [handleUploadMarksFile] Processed ${processedCount} rows from CSV`
      );
      toast.success(`Successfully loaded marks for ${processedCount} students`);
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to process marks file";
      console.error("❌ [handleUploadMarksFile] Error:", errorMessage);
      toast.error("Failed to process marks file. Please check the format.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveMarks = async () => {
    if (!selectedAssignment) {
      toast.error("No assignment selected");
      return;
    }

    try {
      setSavingMarks(true);
      console.log("💾 [handleSaveMarks] Saving marks...");

      const updates = [];
      const errors = [];

      for (const [studentId, score] of Object.entries(bulkMarks)) {
        if (score.trim() === "") continue;

        const submission = submissions.find((s) => s.student_id === studentId);
        const numericScore = parseFloat(score);

        if (isNaN(numericScore)) {
          errors.push(
            `Invalid score format for student ${
              submission?.student_name || studentId
            }`
          );
          continue;
        }

        if (numericScore < 0 || numericScore > selectedAssignment.max_score) {
          errors.push(
            `Score ${numericScore} out of range (0-${
              selectedAssignment.max_score
            }) for student ${submission?.student_name || studentId}`
          );
          continue;
        }

        updates.push({
          assignment_id: selectedAssignment.id,
          student_id: studentId,
          score: numericScore,
          status: "graded",
          graded_at: new Date().toISOString(),
        });
      }

      if (errors.length > 0) {
        console.error("❌ [handleSaveMarks] Validation errors:", errors);
        toast.error(`Validation errors: ${errors.join(", ")}`);
        return;
      }

      if (updates.length === 0) {
        toast.info("No marks to save");
        return;
      }

      console.log(`📤 [handleSaveMarks] Saving ${updates.length} marks`);

      const { error } = await supabase
        .from("assignment_submissions")
        .upsert(updates, {
          onConflict: "assignment_id,student_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error("❌ [handleSaveMarks] Database error:", error.message);
        throw new Error(`Failed to save marks: ${error.message}`);
      }

      console.log("✅ [handleSaveMarks] Marks saved successfully");
      toast.success(`${updates.length} marks saved successfully`);
      setShowMarksDialog(false);

      if (selectedCourse) {
        await loadAssignments(selectedCourse);
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to save marks";
      console.error("❌ [handleSaveMarks] Error:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setSavingMarks(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this assignment? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      console.log(
        `🗑️ [handleDeleteAssignment] Deleting assignment: ${assignmentId}`
      );

      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) {
        console.error(
          "❌ [handleDeleteAssignment] Delete error:",
          error.message
        );
        throw new Error(`Delete failed: ${error.message}`);
      }

      toast.success("Assignment deleted successfully");
      if (selectedCourse) {
        await loadAssignments(selectedCourse);
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to delete assignment";
      console.error("❌ [handleDeleteAssignment] Error:", errorMessage);
      toast.error(errorMessage);
    }
  };

  const getStatusColor = (status: "active" | "completed" | "overdue") => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusIcon = (status: "active" | "completed" | "overdue") => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case "graded":
        return "bg-green-100 text-green-800";
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "late":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (selectedCourse) {
      void loadAssignments(selectedCourse);
    } else {
      setAssignments([]);
    }
  }, [selectedCourse, loadAssignments]);

  useEffect(() => {
    if (!selectedProgram) return;
    const programSemesters = semesters.filter(
      (s) => s.program_id === selectedProgram
    );
    if (programSemesters.length === 0) {
      setSelectedSemester(null);
      setSelectedCourse(null);
      return;
    }
    if (
      !selectedSemester ||
      !programSemesters.find((s) => s.id === selectedSemester)
    ) {
      setSelectedSemester(programSemesters[0].id);
      setSelectedCourse(null);
    }
  }, [selectedProgram, semesters, selectedSemester]);

  const currentPrograms = useMemo(
    () =>
      selectedDepartment
        ? programs.filter((p) => p.department_id === selectedDepartment)
        : [],
    [programs, selectedDepartment]
  );

  const semestersForSelectedProgram = useMemo(() => {
    if (!selectedProgram) return [];
    return semesters.filter((s) => s.program_id === selectedProgram);
  }, [selectedProgram, semesters]);

  const coursesForSemester = useMemo(() => {
    if (!selectedSemester) return [];
    return courses.filter((c) => c.semester_id === selectedSemester);
  }, [courses, selectedSemester]);

  const currentCourse = useMemo(
    () =>
      selectedCourse
        ? coursesForSemester.find((c) => c.id === selectedCourse) ?? null
        : null,
    [coursesForSemester, selectedCourse]
  );

  const selectedDeptObj = useMemo(
    () => departments.find((d) => d.id === selectedDepartment),
    [departments, selectedDepartment]
  );

  const selectedProgObj = useMemo(
    () => programs.find((p) => p.id === selectedProgram),
    [programs, selectedProgram]
  );

  const selectedSemObj = useMemo(
    () => semesters.find((s) => s.id === selectedSemester),
    [semesters, selectedSemester]
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
    setSelectedDepartment(null);
    setSelectedProgram(null);
    setSelectedSemester(null);
    setSelectedCourse(null);
    setSearchQuery("");
    setSelectedStatus("all");
  };

  const handleCreateAssignment = () => {
    setEditingAssignment(null);
    setAssignmentForm({
      title: "",
      description: "",
      due_date: "",
      max_score: "100",
      attachment: null,
    });
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

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="flex flex-col items-center p-8">
            <div className="p-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 text-center">
              You do not have permission to access this page. Admin role is
              required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div
        className={`rounded-2xl bg-gradient-to-r ${
          selectedDeptObj?.color || "from-blue-600 to-cyan-500"
        } p-6 text-white shadow-xl transition-all duration-500 ${
          animateIn ? "animate-slide-up" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="h-8 w-8" />
              Assignment Management
            </h1>
            <p className="text-blue-100 opacity-90">
              Admin dashboard: monitor, create, and grade assignments across
              departments
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="flex items-center gap-2"
            >
              <DatabaseIcon className="h-4 w-4" />
              {showDebugInfo ? "Hide" : "Show"} Debug
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadLookups}
              className="flex items-center gap-2"
              disabled={loadingLookups}
            >
              {loadingLookups ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
            <p className="text-sm opacity-90">Departments</p>
            <p className="text-2xl font-bold">{departments.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
            <p className="text-sm opacity-90">Programs</p>
            <p className="text-2xl font-bold">{programs.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
            <p className="text-sm opacity-90">Semesters</p>
            <p className="text-2xl font-bold">{semesters.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg">
            <p className="text-sm opacity-90">Total Courses</p>
            <p className="text-2xl font-bold">{courses.length}</p>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {showDebugInfo && (
        <Card className="border-2 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseIcon className="h-5 w-5" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm font-mono">
              <div>
                <strong>Selected Department:</strong>{" "}
                {selectedDepartment || "None"}
              </div>
              <div>
                <strong>Selected Program:</strong> {selectedProgram || "None"}
                {selectedProgram && ` (${selectedProgObj?.code})`}
              </div>
              <div>
                <strong>Selected Semester:</strong> {selectedSemester || "None"}
                {selectedSemester && ` (${selectedSemObj?.name})`}
              </div>
              <div>
                <strong>Selected Course:</strong> {selectedCourse || "None"}
                {selectedCourse && ` (${currentCourse?.code})`}
              </div>
              <div>
                <strong>Assignments Loaded:</strong> {assignments.length}
              </div>
              <div>
                <strong>Database Status:</strong>{" "}
                {loadingLookups ? "Loading..." : "Ready"}
              </div>
              <div className="text-green-600">
                <strong>✓ Fixed:</strong> Using class_id instead of course_id
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                Navigate through departments, programs, semesters, and courses
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="flex items-center gap-2"
              disabled={loadingLookups}
            >
              <Filter className="h-3 w-3" />
              Reset All
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Department Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <School className="h-4 w-4 text-blue-600" />
              </div>
              <label className="block text-sm font-semibold text-gray-700">
                Step 1: Select Department
              </label>
            </div>

            {loadingLookups ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mr-2" />
                <span className="text-gray-600">Loading departments...</span>
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">
                  No departments found
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Please create a department first
                </p>
                <Button onClick={loadLookups} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Loading
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => {
                      setSelectedDepartment(dept.id);
                      setSelectedProgram(null);
                      setSelectedSemester(null);
                      setSelectedCourse(null);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all text-left transform hover:scale-[1.02] active:scale-[0.98] duration-200 ${
                      selectedDepartment === dept.id
                        ? `border-blue-500 bg-gradient-to-r ${
                            dept.color || "from-blue-600 to-cyan-500"
                          } text-white shadow-lg`
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                    }`}
                    disabled={loadingLookups}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xl mb-2 block">
                          {dept.icon || "🏛️"}
                        </span>
                        <h3 className="font-bold">{dept.code}</h3>
                        <p className="text-sm mt-1 opacity-90">{dept.name}</p>
                      </div>
                      {selectedDepartment === dept.id && (
                        <CheckCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="mt-3 text-xs opacity-80">
                      {
                        programs.filter((p) => p.department_id === dept.id)
                          .length
                      }{" "}
                      programs
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Program Selection */}
          {selectedDepartment && (
            <div className="animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Library className="h-4 w-4 text-green-600" />
                </div>
                <label className="block text-sm font-semibold text-gray-700">
                  <span className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Step 2: Select Program
                  </span>
                </label>
              </div>

              {currentPrograms.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <BookOpenCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    No programs available for this department
                  </p>
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
                          ? `border-blue-500 bg-gradient-to-r ${
                              program.color || "from-slate-600 to-slate-800"
                            } text-white shadow-lg`
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                      disabled={loadingLookups}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {program.icon || "📚"}
                          </span>
                          <div>
                            <h3 className="font-bold">{program.code}</h3>
                            <p className="text-sm opacity-90">{program.name}</p>
                          </div>
                        </div>
                        {selectedProgram === program.id && (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Semester Selection */}
          {selectedProgram && (
            <div className="animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                </div>
                <label className="block text-sm font-semibold text-gray-700">
                  <span className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Step 3: Select Semester
                  </span>
                </label>
              </div>

              {semestersForSelectedProgram.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    No semesters available for this program
                  </p>
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
                      disabled={loadingLookups}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {semester.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {semester.semester_type} {semester.year}
                          </p>
                          <Badge
                            className={`mt-2 ${
                              semester.status === "active"
                                ? "bg-green-100 text-green-800"
                                : semester.status === "completed"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {semester.status}
                          </Badge>
                          <div className="mt-2 text-xs text-gray-500">
                            {semester.total_courses} courses
                          </div>
                        </div>
                        {selectedSemester === semester.id && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Course Selection */}
          {selectedSemester && (
            <div className="animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BookOpen className="h-4 w-4 text-orange-600" />
                </div>
                <label className="block text-sm font-semibold text-gray-700">
                  <span className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Step 4: Select Course
                  </span>
                </label>
              </div>

              {coursesForSemester.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    No courses available for this semester
                  </p>
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
                      disabled={loadingLookups}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {course.code}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {course.name}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>Sec: {course.section || "N/A"}</span>
                            <span>•</span>
                            <span>{course.enrollment_count || 0} students</span>
                          </div>
                        </div>
                        {selectedCourse === course.id && (
                          <CheckCircle className="h-5 w-5 text-blue-500 mt-1" />
                        )}
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
                  {currentCourse.name} • {currentCourse.enrollment_count}{" "}
                  students
                </CardDescription>
              </div>
              <Button
                onClick={handleCreateAssignment}
                className="flex items-center gap-2"
                disabled={loadingAssignments}
              >
                <Plus className="h-4 w-4" />
                Create Assignment
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Tabs for different views */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mb-6"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="assignments"
                  className="flex items-center gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  Assignments
                </TabsTrigger>
                <TabsTrigger
                  value="submissions"
                  className="flex items-center gap-2"
                >
                  <FileCheck className="h-4 w-4" />
                  Submissions & Marks
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assignments" className="space-y-6">
                {/* Search and filters */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search assignments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      disabled={loadingAssignments}
                    />
                  </div>
                  <Select
                    value={selectedStatus}
                    onValueChange={(v: any) => setSelectedStatus(v)}
                    disabled={loadingAssignments}
                  >
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
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin mr-2" />
                    <span className="text-gray-600">
                      Loading assignments...
                    </span>
                  </div>
                ) : filteredAssignments.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">
                      {searchQuery || selectedStatus !== "all"
                        ? "No assignments match your filters"
                        : "No assignments yet"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchQuery || selectedStatus !== "all"
                        ? "Try adjusting your search or filters"
                        : "Create your first assignment to get started"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAssignments.map((assignment) => (
                      <Card
                        key={assignment.id}
                        className="border hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {assignment.title}
                                </h3>
                                <Badge
                                  className={getStatusColor(
                                    assignment.status || "active"
                                  )}
                                >
                                  <div className="flex items-center gap-1">
                                    {getStatusIcon(
                                      assignment.status || "active"
                                    )}
                                    {assignment.status}
                                  </div>
                                </Badge>
                              </div>

                              {assignment.description && (
                                <p className="text-sm text-gray-600 mb-4">
                                  {assignment.description}
                                </p>
                              )}

                              {/* Assignment attachment */}
                              {assignment.attachment_url && (
                                <div className="flex items-center gap-2 mb-4">
                                  <Paperclip className="h-4 w-4 text-gray-400" />
                                  <a
                                    href={assignment.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    {assignment.attachment_name ||
                                      "Download attachment"}
                                  </a>
                                </div>
                              )}

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-400" />
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      Total Students
                                    </p>
                                    <p className="font-semibold">
                                      {assignment.total_students}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      Submitted
                                    </p>
                                    <p className="font-semibold">
                                      {assignment.submitted_count}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Award className="h-4 w-4 text-blue-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      Graded
                                    </p>
                                    <p className="font-semibold">
                                      {assignment.graded_count}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-orange-500" />
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      Pending
                                    </p>
                                    <p className="font-semibold">
                                      {assignment.pending_count}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">
                                    Submission Progress
                                  </span>
                                  <span className="font-medium">
                                    {assignment.total_students > 0
                                      ? Math.round(
                                          (assignment.submitted_count /
                                            assignment.total_students) *
                                            100
                                        )
                                      : 0}
                                    %
                                  </span>
                                </div>
                                <Progress
                                  value={
                                    assignment.total_students > 0
                                      ? (assignment.submitted_count /
                                          assignment.total_students) *
                                        100
                                      : 0
                                  }
                                  className="h-2"
                                />
                              </div>

                              <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                                {assignment.due_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Due:{" "}
                                    {new Date(
                                      assignment.due_date
                                    ).toLocaleDateString()}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Target className="h-4 w-4" />
                                  Max Score: {assignment.max_score}
                                </div>
                                {assignment.graded_count > 0 && (
                                  <div className="flex items-center gap-1">
                                    <BarChart3 className="h-4 w-4" />
                                    Avg: {assignment.average_score.toFixed(1)}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-4 flex-col">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAssignment(assignment)}
                                disabled={loadingAssignments}
                                className="w-full"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleViewSubmissions(assignment)
                                }
                                disabled={loadingAssignments}
                                className="w-full"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUploadMarks(assignment)}
                                disabled={loadingAssignments}
                                className="w-full"
                              >
                                <GraduationCap className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteAssignment(assignment.id)
                                }
                                disabled={loadingAssignments}
                                className="w-full"
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

              <TabsContent value="submissions" className="space-y-6">
                {assignments.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">
                      No assignments available
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Create assignments to view submissions and upload marks
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Recent Submissions
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab("assignments")}
                      >
                        <ClipboardList className="h-4 w-4 mr-2" />
                        View All Assignments
                      </Button>
                    </div>

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
                            <TableCell className="font-medium">
                              {assignment.title}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getStatusColor(
                                  assignment.status || "active"
                                )}
                              >
                                {assignment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {assignment.submitted_count}/
                              {assignment.total_students}
                            </TableCell>
                            <TableCell>
                              {assignment.graded_count}/
                              {assignment.total_students}
                            </TableCell>
                            <TableCell>
                              {assignment.average_score > 0 ? (
                                <span className="font-semibold">
                                  {assignment.average_score.toFixed(1)}/
                                  {assignment.max_score}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleViewSubmissions(assignment)
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUploadMarks(assignment)}
                                >
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

      {/* Assignment Dialog with file upload */}
      <Dialog
        open={showAssignmentDialog}
        onOpenChange={setShowAssignmentDialog}
      >
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? "Edit Assignment" : "Create New Assignment"}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment
                ? "Update the assignment details below"
                : "Fill in the details to create a new assignment"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={assignmentForm.title}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    title: e.target.value,
                  })
                }
                placeholder="Assignment title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={assignmentForm.description}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    description: e.target.value,
                  })
                }
                placeholder="Assignment description (optional)"
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
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      due_date: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="max_score">Max Score *</Label>
                <Input
                  id="max_score"
                  type="number"
                  value={assignmentForm.max_score}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      max_score: e.target.value,
                    })
                  }
                  placeholder="100"
                  min="0"
                  max="1000"
                />
              </div>
            </div>

            {/* File upload section */}
            <div>
              <Label htmlFor="attachment">Assignment File (Optional)</Label>
              <div className="mt-2 flex items-center gap-4">
                <Input
                  id="attachment"
                  type="file"
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      attachment: e.target.files?.[0] || null,
                    })
                  }
                  className="flex-1"
                  accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                />
                {assignmentForm.attachment && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    {assignmentForm.attachment.name}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: PDF, Word, Excel, PowerPoint, Text
              </p>
            </div>

            {editingAssignment?.attachment_url && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium mb-2">Current Attachment:</p>
                <a
                  href={editingAssignment.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {editingAssignment.attachment_name || "Download file"}
                </a>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignmentDialog(false)}
              disabled={savingAssignment || uploadingFile}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAssignment}
              disabled={savingAssignment || uploadingFile}
            >
              {savingAssignment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingFile ? "Uploading..." : "Saving..."}
                </>
              ) : (
                <>{editingAssignment ? "Update" : "Create"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submissions Dialog */}
      <Dialog
        open={showSubmissionsDialog}
        onOpenChange={setShowSubmissionsDialog}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Submissions for {selectedAssignment?.title}
            </DialogTitle>
            <DialogDescription>
              View and manage student submissions
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingSubmissions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mr-2" />
                <span className="text-gray-600">Loading submissions...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-600">
                    Total Students: {submissions.length} | Submitted:{" "}
                    {submissions.filter((s) => s.status !== "pending").length} |
                    Graded:{" "}
                    {submissions.filter((s) => s.status === "graded").length}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleUploadMarks(selectedAssignment!)}
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Upload Marks
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted At</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Attachment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {submission.student_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {submission.student_email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{submission.student_roll_no}</TableCell>
                        <TableCell>
                          <Badge
                            className={getSubmissionStatusColor(
                              submission.status
                            )}
                          >
                            {submission.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.submitted_at ? (
                            new Date(
                              submission.submitted_at
                            ).toLocaleDateString()
                          ) : (
                            <span className="text-gray-400">Not submitted</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.score !== null ? (
                            <span className="font-semibold">
                              {submission.score}/{selectedAssignment?.max_score}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.attachment_url ? (
                            <a
                              href={submission.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400">No file</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Marks Dialog */}
      <Dialog open={showMarksDialog} onOpenChange={setShowMarksDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Upload Marks for {selectedAssignment?.title}
            </DialogTitle>
            <DialogDescription>
              Upload marks for students. Max score:{" "}
              {selectedAssignment?.max_score}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                Enter marks for each student (0-{selectedAssignment?.max_score})
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <div className="relative">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadMarksFile(file);
                    }}
                    className="hidden"
                    id="marks-file"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("marks-file")?.click()
                    }
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Current Score</TableHead>
                  <TableHead>New Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{submission.student_name}</p>
                        <p className="text-xs text-gray-500">
                          {submission.student_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{submission.student_roll_no}</TableCell>
                    <TableCell>
                      {submission.score !== null ? (
                        <span className="font-semibold">
                          {submission.score}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max={selectedAssignment?.max_score}
                        step="0.5"
                        value={bulkMarks[submission.student_id] || ""}
                        onChange={(e) =>
                          setBulkMarks({
                            ...bulkMarks,
                            [submission.student_id]: e.target.value,
                          })
                        }
                        className="w-24"
                        placeholder="Score"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getSubmissionStatusColor(submission.status)}
                      >
                        {submission.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMarksDialog(false)}
              disabled={savingMarks}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveMarks} disabled={savingMarks}>
              {savingMarks ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>Save Marks</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
