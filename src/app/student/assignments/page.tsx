/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import supabase from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Calendar,
  Upload,
  FileText,
  Eye,
  Download,
  GraduationCap,
  BookOpen,
  Sparkles,
  Paperclip,
  ArrowUpCircle,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────
type Course = {
  id: string;
  name: string;
  code: string;
  section?: string | null;
};

type Assignment = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  course_name: string;
  course_code: string;
  course_section?: string | null;
  submission_status: "pending" | "submitted" | "graded" | "late";
  submission_id?: string | null;
  submission_score?: number | null;
  submission_feedback?: string | null;
  submission_attachment_url?: string | null;
  submission_attachment_name?: string | null;
  submitted_at?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────
const getSubmissionStatusColor = (status: string) => {
  switch (status) {
    case "graded":    return "bg-green-100 text-green-800 border-green-200";
    case "submitted": return "bg-blue-100 text-blue-800 border-blue-200";
    case "late":      return "bg-amber-100 text-amber-800 border-amber-200";
    default:          return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

const isOverdue = (assignment: Assignment) => {
  if (!assignment.due_date) return false;
  if (assignment.submission_status === "submitted" || assignment.submission_status === "graded") return false;
  return new Date(assignment.due_date) < new Date();
};

// ─── Component ────────────────────────────────────────────────────────────
export default function StudentAssignmentsPage() {
  const user = getCurrentUser();
  const studentId = user?.id;

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ NEW: status filter
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "pending" | "submitted" | "graded" | "overdue"
  >("all");

  // Dialogs
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewAssignment, setViewAssignment] = useState<Assignment | null>(null);

  // Fetch courses from student_courses
  useEffect(() => {
    if (!studentId) return;
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const { data: enrollData, error: enrollErr } = await supabase
          .from("student_courses")
          .select("course_id")
          .eq("student_id", studentId);
        if (enrollErr) throw new Error(enrollErr.message);

        if (enrollData?.length) {
          const courseIds = enrollData.map((e: any) => e.course_id);
          const { data: courseData, error: courseErr } = await supabase
            .from("courses")
            .select("id, name, code, section")
            .in("id", courseIds)
            .order("name");
          if (courseErr) throw new Error(courseErr.message);
          setCourses(courseData || []);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [studentId]);

  // Fetch assignments + submissions
  useEffect(() => {
    if (!studentId || courses.length === 0) return;
    const courseIds = selectedCourseId ? [selectedCourseId] : courses.map((c) => c.id);

    const fetchAssignments = async () => {
      setLoadingAssignments(true);
      try {
        const { data: assignData, error: assignErr } = await supabase
          .from("assignments")
          .select("*")
          .in("class_id", courseIds)
          .order("created_at", { ascending: false });
        if (assignErr) throw new Error(assignErr.message);

        if (!assignData?.length) {
          setAssignments([]);
          setLoadingAssignments(false);
          return;
        }

        const assignmentIds = assignData.map((a: any) => a.id);
        const { data: subData, error: subErr } = await supabase
          .from("assignment_submissions")
          .select("*")
          .eq("student_id", studentId)
          .in("assignment_id", assignmentIds);
        if (subErr) throw new Error(subErr.message);

        const submissionMap = new Map<string, any>();
        subData?.forEach((sub: any) => submissionMap.set(sub.assignment_id, sub));

        const courseMap = new Map(courses.map((c) => [c.id, c]));

        const enriched: Assignment[] = assignData.map((a: any) => {
          const course = courseMap.get(a.class_id);
          const submission = submissionMap.get(a.id);
          let status: Assignment["submission_status"] = "pending";
          if (submission) {
            status = submission.status;
          } else if (a.due_date && new Date(a.due_date) < new Date()) {
            status = "late";
          }
          return {
            id: a.id,
            course_id: a.class_id,
            title: a.title,
            description: a.description,
            due_date: a.due_date,
            max_score: a.max_score,
            created_at: a.created_at,
            attachment_url: a.attachment_url,
            attachment_name: a.attachment_name,
            course_name: course?.name || "Unknown",
            course_code: course?.code || "",
            course_section: course?.section,
            submission_status: status,
            submission_id: submission?.id || null,
            submission_score: submission?.score ?? null,
            submission_feedback: submission?.feedback ?? null,
            submission_attachment_url: submission?.attachment_url ?? null,
            submission_attachment_name: submission?.attachment_name ?? null,
            submitted_at: submission?.submitted_at ?? null,
          };
        });
        setAssignments(enriched);
      } catch (err: any) {
        toast.error(err.message || "Failed to load assignments");
      } finally {
        setLoadingAssignments(false);
      }
    };
    fetchAssignments();
  }, [studentId, courses, selectedCourseId]);

  // Filter assignments by search AND status
  const filteredAssignments = useMemo(() => {
    let filtered = assignments;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.course_name.toLowerCase().includes(q) ||
          a.course_code.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (selectedStatus !== "all") {
      if (selectedStatus === "overdue") {
        // Show all assignments that are currently overdue (late or past due without submission)
        filtered = filtered.filter(isOverdue);
      } else {
        // Match exact submission status (pending, submitted, graded)
        filtered = filtered.filter((a) => a.submission_status === selectedStatus);
      }
    }

    return filtered;
  }, [assignments, searchQuery, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = assignments.length;
    const pending = assignments.filter(
      (a) => a.submission_status === "pending" || a.submission_status === "late"
    ).length;
    const submitted = assignments.filter((a) => a.submission_status === "submitted").length;
    const graded = assignments.filter((a) => a.submission_status === "graded").length;
    const overdue = assignments.filter(isOverdue).length;
    return { total, pending, submitted, graded, overdue };
  }, [assignments]);

  // Upload submission
  const handleSubmitAssignment = async () => {
    if (!uploadFile || !selectedAssignment) return;
    setUploading(true);
    try {
      const fileExt = uploadFile.name.split(".").pop();
      const fileName = `${studentId}/${selectedAssignment.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `submissions/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("assignment-files")
        .upload(filePath, uploadFile, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from("assignment-files")
        .getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL");

      setSubmitting(true);
      const submissionData = {
        assignment_id: selectedAssignment.id,
        student_id: studentId,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        attachment_url: publicUrl,
        attachment_name: uploadFile.name,
      };
      const { error: insertError } = await supabase
        .from("assignment_submissions")
        .upsert(submissionData, { onConflict: "assignment_id,student_id" });
      if (insertError) throw new Error(insertError.message);

      toast.success("Assignment submitted successfully!");
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === selectedAssignment.id
            ? {
                ...a,
                submission_status: "submitted",
                submission_attachment_url: publicUrl,
                submission_attachment_name: uploadFile.name,
                submitted_at: new Date().toISOString(),
              }
            : a
        )
      );
      setSelectedAssignment(null);
      setUploadFile(null);
      setShowSubmitDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit assignment");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  const openSubmitDialog = (a: Assignment) => { setSelectedAssignment(a); setUploadFile(null); setShowSubmitDialog(true); };
  const openViewDialog = (a: Assignment) => { setViewAssignment(a); setShowViewDialog(true); };

  if (!studentId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-3 text-slate-500">Loading your profile...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-blue-500" /> My Assignments
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Submit your work and track your grades
            </p>
          </div>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
            ))}
          </select>
        </div>

        {/* Stats cards (now includes overdue count) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><ClipboardList className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-slate-500">Total</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-2xl font-bold">{stats.pending}</p><p className="text-xs text-slate-500">Pending</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Upload className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold">{stats.submitted}</p><p className="text-xs text-slate-500">Submitted</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><GraduationCap className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-2xl font-bold">{stats.graded}</p><p className="text-xs text-slate-500">Graded</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><AlertCircle className="h-5 w-5 text-red-600" /></div>
              <div><p className="text-2xl font-bold">{stats.overdue}</p><p className="text-xs text-slate-500">Overdue</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm border-slate-200"
            />
          </div>
          <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assignments list */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Assignments</span>
            </div>
            <span className="text-xs text-slate-400">
              {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loadingAssignments ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              <span className="ml-2 text-sm text-slate-400">Loading...</span>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <ClipboardList className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">No assignments found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {assignments.length > 0
                  ? "Try adjusting the search or status filter."
                  : "You haven't received any assignments yet."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {filteredAssignments.map((assignment) => {
                const overdue = isOverdue(assignment);
                return (
                  <li key={assignment.id} className="px-5 py-4 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">{assignment.title}</h3>
                          <Badge className={cn("text-xs", getSubmissionStatusColor(assignment.submission_status))}>
                            {assignment.submission_status}
                          </Badge>
                          {overdue && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Overdue</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{assignment.course_code} {assignment.course_name}{assignment.course_section && ` (${assignment.course_section})`}</span>
                          {assignment.due_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due: {format(new Date(assignment.due_date), "dd MMM yyyy")}</span>}
                          <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />Max Score: {assignment.max_score}</span>
                        </div>
                        {assignment.description && <p className="text-xs text-slate-600 line-clamp-2">{assignment.description}</p>}
                        {assignment.attachment_url && (
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-3 w-3 text-slate-400" />
                            <a href={assignment.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                              {assignment.attachment_name || "Download file"}
                            </a>
                          </div>
                        )}
                        {assignment.submission_status === "graded" && assignment.submission_score !== null && (
                          <div className="flex items-center gap-3 bg-green-50 p-2 rounded-lg mt-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">Score: {assignment.submission_score}/{assignment.max_score}</span>
                            {assignment.submission_feedback && <span className="text-xs text-green-600">Feedback: {assignment.submission_feedback}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(assignment.submission_status === "pending" || assignment.submission_status === "late") && (
                          <Button size="sm" variant="default" className="h-8 gap-1" onClick={() => openSubmitDialog(assignment)}>
                            <Upload className="h-3.5 w-3.5" /> Submit
                          </Button>
                        )}
                        {(assignment.submission_status === "submitted" || assignment.submission_status === "graded") && (
                          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openViewDialog(assignment)}>
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-blue-600" /> Submit Assignment</DialogTitle>
            <DialogDescription>{selectedAssignment?.title} – {selectedAssignment?.course_code}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-slate-600">
              {selectedAssignment?.description && <p className="mb-2">{selectedAssignment.description}</p>}
              {selectedAssignment?.due_date && <p className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Due: {format(new Date(selectedAssignment.due_date), "dd MMM yyyy")}</p>}
              <p className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />Max score: {selectedAssignment?.max_score}</p>
            </div>
            <div>
              <Label htmlFor="file-upload">Upload your work</Label>
              <Input id="file-upload" type="file" className="mt-1" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx" />
              <p className="text-xs text-slate-400 mt-1">Allowed: PDF, Word, Excel, PowerPoint, Text</p>
            </div>
            {uploadFile && <div className="flex items-center gap-2 p-2 bg-slate-50 rounded"><FileText className="h-4 w-4 text-blue-500" /><span className="text-sm">{uploadFile.name}</span></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)} disabled={uploading || submitting}>Cancel</Button>
            <Button onClick={handleSubmitAssignment} disabled={!uploadFile || uploading || submitting}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
              : submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
              : <><ArrowUpCircle className="h-4 w-4 mr-2" />Submit</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Submission Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-blue-600" /> Submission Details</DialogTitle>
            <DialogDescription>{viewAssignment?.title} – {viewAssignment?.course_code}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {viewAssignment ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Status:</span><Badge className={cn("ml-2", getSubmissionStatusColor(viewAssignment.submission_status))}>{viewAssignment.submission_status}</Badge></div>
                  {viewAssignment.submitted_at && <div><span className="text-slate-500">Submitted:</span><span className="ml-2 font-medium">{format(new Date(viewAssignment.submitted_at), "dd MMM yyyy, h:mm a")}</span></div>}
                </div>
                {viewAssignment.submission_score !== null && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700">Score: {viewAssignment.submission_score}/{viewAssignment.max_score}</span>
                  </div>
                )}
                {viewAssignment.submission_feedback && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-700">Feedback:</p>
                    <p className="text-sm text-blue-600">{viewAssignment.submission_feedback}</p>
                  </div>
                )}
                {viewAssignment.submission_attachment_url && (
                  <div className="flex items-center gap-2">
                    <a href={viewAssignment.submission_attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">
                      <Download className="h-4 w-4" />{viewAssignment.submission_attachment_name || "Download your file"}
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">No submission details available.</p>
            )}
          </div>
          <DialogFooter><Button onClick={() => setShowViewDialog(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}