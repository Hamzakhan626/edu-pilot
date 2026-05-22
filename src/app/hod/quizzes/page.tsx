/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/auth";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Users,
  Timer,
  BookOpen,
  GraduationCap,
  Building,
  School,
  Download,
  RefreshCw,
  BarChart,
  FileText,
  ChevronRight,
  ChevronDown,
  Loader2,
  Copy,
  ExternalLink,
  LayoutGrid,
  Table as TableIcon,
  ListChecks,
  AlertTriangle,
  Filter,
  X,
  ArrowLeft,
} from "lucide-react";
import { getCurrentUser, User } from "@/lib/auth";

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

type Course = {
  id: string;
  name: string;
  code: string;
  program_id: string;
};

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  status: string;
  difficulty: string;
  total_questions: number;
  passing_score: number;
  time_limit_minutes: number | null;
  type: string;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  course?: Course;
  program?: Program;
  department?: Department;
};

type QuizSubmissionStats = {
  quiz_id: string;
  total_submissions: number;
  average_score: number;
  pending_grading: number;
};

// ✅ Inner component that uses useSearchParams
function HoDQuizzesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<QuizSubmissionStats[]>([]);
  const [search, setSearch] = useState("");
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState("");
  const [expandedDepartments, setExpandedDepartments] = useState<string[]>([]);
  const [expandedPrograms, setExpandedPrograms] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("table");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    program: searchParams.get("program") || "all",
    course: searchParams.get("course") || "all",
    status: searchParams.get("status") || "all",
    difficulty: searchParams.get("difficulty") || "all",
    type: searchParams.get("type") || "all",
  });

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
    loadDepartmentAndData(currentUser);
  }, []);

  const loadDepartmentAndData = async (currentUser: User) => {
    try {
      const { data: dept, error } = await supabase
        .from("departments")
        .select("id, name, code")
        .eq("hod_id", currentUser.id)
        .maybeSingle();

      if (error || !dept) {
        toast.error("You are not assigned to a department");
        setLoading(false);
        return;
      }

      setDepartment(dept);
      setDepartments([dept]);
      await loadQuizzesForDepartment(dept.id);
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  const loadQuizzesForDepartment = async (deptId: string) => {
    try {
      setLoading(true);
      setLoadError(null);

      const { data: progData, error: progError } = await supabase
        .from("programs")
        .select("id, name, code, department_id")
        .eq("department_id", deptId)
        .order("name");

      if (progError) throw progError;
      const programsList = progData || [];
      setPrograms(programsList);

      const programIds = programsList.map((p) => p.id);

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, name, code, program_id")
        .in("program_id", programIds)
        .order("name");

      if (courseError) throw courseError;
      const coursesList = courseData || [];
      setCourses(coursesList);

      const courseIds = coursesList.map((c) => c.id);

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });

      if (quizError) throw quizError;

      const enriched: Quiz[] = (quizData || []).map((q) => {
        const course = coursesList.find((c) => c.id === q.course_id);
        const program = course
          ? programsList.find((p) => p.id === course.program_id)
          : undefined;
        return {
          ...q,
          course,
          program,
          department: {
            id: deptId,
            name: department?.name || "",
            code: department?.code || "",
          },
        };
      });
      setQuizzes(enriched);

      if (quizData && quizData.length > 0) {
        const quizIds = quizData.map((q) => q.id);
        const { data: subs, error: subsError } = await supabase
          .from("quiz_submissions")
          .select("quiz_id, percentage, status")
          .in("quiz_id", quizIds);

        if (!subsError && subs) {
          processStats(subs);
        }
      }
    } catch (err: any) {
      console.error(err);
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processStats = (submissions: any[]) => {
    const statsMap: Record<string, any> = {};
    submissions.forEach((sub) => {
      if (!statsMap[sub.quiz_id]) {
        statsMap[sub.quiz_id] = {
          quiz_id: sub.quiz_id,
          total_submissions: 0,
          total_score: 0,
          pending_grading: 0,
        };
      }
      statsMap[sub.quiz_id].total_submissions++;
      if (sub.percentage !== null) {
        statsMap[sub.quiz_id].total_score += sub.percentage;
      }
      if (sub.status === "submitted" && sub.percentage === null) {
        statsMap[sub.quiz_id].pending_grading++;
      }
    });
    const formatted = Object.values(statsMap).map((s: any) => ({
      ...s,
      average_score:
        s.total_submissions > 0
          ? Math.round((s.total_score / s.total_submissions) * 100) / 100
          : 0,
    }));
    setStats(formatted);
  };

  const getQuizStats = useCallback(
    (quizId: string) => {
      return (
        stats.find((s) => s.quiz_id === quizId) || {
          total_submissions: 0,
          average_score: 0,
          pending_grading: 0,
        }
      );
    },
    [stats]
  );

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        quiz.title.toLowerCase().includes(searchLower) ||
        quiz.description?.toLowerCase().includes(searchLower) ||
        quiz.course?.name?.toLowerCase().includes(searchLower);

      const matchesProgram =
        filters.program === "all" || quiz.program?.id === filters.program;
      const matchesCourse =
        filters.course === "all" || quiz.course_id === filters.course;
      const matchesStatus =
        filters.status === "all" || quiz.status === filters.status;
      const matchesDifficulty =
        filters.difficulty === "all" || quiz.difficulty === filters.difficulty;
      const matchesType =
        filters.type === "all" || quiz.type === filters.type;

      return (
        matchesSearch &&
        matchesProgram &&
        matchesCourse &&
        matchesStatus &&
        matchesDifficulty &&
        matchesType
      );
    });
  }, [quizzes, search, filters]);

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      setIsDeleting(true);
      await Promise.allSettled([
        supabase.from("quiz_questions").delete().eq("quiz_id", quizId),
        supabase.from("quiz_submissions").delete().eq("quiz_id", quizId),
      ]);
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);
      if (error) throw error;
      toast.success("Quiz deleted");
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      setSelectedQuizzes((prev) => prev.filter((id) => id !== quizId));
      setDeleteDialogOpen(false);
      setQuizToDelete(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkAction = async () => {
    if (bulkAction === "delete" && selectedQuizzes.length > 0) {
      try {
        setIsDeleting(true);
        for (const quizId of selectedQuizzes) {
          await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
          await supabase.from("quiz_submissions").delete().eq("quiz_id", quizId);
          await supabase.from("quizzes").delete().eq("id", quizId);
        }
        toast.success(`Deleted ${selectedQuizzes.length} quizzes`);
        setQuizzes((prev) =>
          prev.filter((q) => !selectedQuizzes.includes(q.id))
        );
        setSelectedQuizzes([]);
        setBulkAction("");
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsDeleting(false);
      }
    } else if (bulkAction === "publish" && selectedQuizzes.length > 0) {
      try {
        const { error } = await supabase
          .from("quizzes")
          .update({ status: "published", updated_at: new Date().toISOString() })
          .in("id", selectedQuizzes);
        if (error) throw error;
        toast.success(`Published ${selectedQuizzes.length} quizzes`);
        setQuizzes((prev) =>
          prev.map((q) =>
            selectedQuizzes.includes(q.id) ? { ...q, status: "published" } : q
          )
        );
        setSelectedQuizzes([]);
        setBulkAction("");
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  const handleCopyQuizLink = (quizId: string) => {
    const link = `${window.location.origin}/student/quiz/${quizId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  };

  const handlePreviewQuiz = (quizId: string) => {
    window.open(`/student/quiz/${quizId}`, "_blank");
  };

  const handleExport = () => {
    const exportData = filteredQuizzes.map((q) => ({
      Title: q.title,
      Course: q.course?.name || "",
      Program: q.program?.name || "",
      Status: q.status,
      Questions: q.total_questions,
      Submissions: getQuizStats(q.id).total_submissions,
      AvgScore: getQuizStats(q.id).average_score,
    }));
    const csv = [
      Object.keys(exportData[0] || {}).join(","),
      ...exportData.map((row) =>
        Object.values(row)
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hod_quizzes_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  const clearAllFilters = () => {
    setFilters({
      program: "all",
      course: "all",
      status: "all",
      difficulty: "all",
      type: "all",
    });
    setSearch("");
  };

  const hasActiveFilters = () =>
    !!search || Object.values(filters).some((v) => v !== "all");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
      published: "bg-green-50 text-green-700 border-green-200",
      completed: "bg-blue-50 text-blue-700 border-blue-200",
      cancelled: "bg-red-50 text-red-700 border-red-200",
    };
    return (
      <Badge variant="outline" className={variants[status] || ""}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getDifficultyBadge = (difficulty: string) => {
    const variants: Record<string, string> = {
      easy: "bg-green-50 text-green-700 border-green-200",
      medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
      hard: "bg-red-50 text-red-700 border-red-200",
    };
    return (
      <Badge variant="outline" className={variants[difficulty] || ""}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </Badge>
    );
  };

  const toggleDepartment = (id: string) => {
    setExpandedDepartments((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleProgram = (id: string) => {
    setExpandedPrograms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const totalQuizzes = quizzes.length;
  const publishedQuizzes = quizzes.filter((q) => q.status === "published").length;
  const totalSubmissions = stats.reduce((sum, s) => sum + s.total_submissions, 0);
  const pendingGrading = stats.reduce((sum, s) => sum + s.pending_grading, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Error Loading Quizzes</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => user && loadDepartmentAndData(user)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/hod/programs")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Programs
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {department?.name} Quizzes
          </h1>
          <p className="text-muted-foreground mt-1">
            {totalQuizzes} quiz{totalQuizzes !== 1 ? "zes" : ""} in your
            department
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredQuizzes.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push("/hod/quizzes/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Quiz
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quizzes</p>
                <p className="text-2xl font-bold">{totalQuizzes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{publishedQuizzes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submissions</p>
                <p className="text-2xl font-bold">{totalSubmissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <GraduationCap className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingGrading}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quizzes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters() && (
                <Badge className="ml-2 bg-white text-blue-600">Active</Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="space-y-3 pt-3 border-t mt-3">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <Select
                  value={filters.program}
                  onValueChange={(v) =>
                    setFilters({ ...filters, program: v, course: "all" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.course}
                  onValueChange={(v) => setFilters({ ...filters, course: v })}
                  disabled={filters.program === "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses
                      .filter(
                        (c) =>
                          filters.program === "all" ||
                          c.program_id === filters.program
                      )
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters({ ...filters, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.difficulty}
                  onValueChange={(v) =>
                    setFilters({ ...filters, difficulty: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.type}
                  onValueChange={(v) => setFilters({ ...filters, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters() && (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  <X className="mr-2 h-4 w-4" /> Clear All
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedQuizzes.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedQuizzes.length} selected
                </span>
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Bulk actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publish">Publish</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleBulkAction}
                  disabled={!bulkAction || isDeleting}
                >
                  {isDeleting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Apply
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedQuizzes([])}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="table">
            <TableIcon className="mr-2 h-4 w-4" /> Table
          </TabsTrigger>
          <TabsTrigger value="grid">
            <LayoutGrid className="mr-2 h-4 w-4" /> Grid
          </TabsTrigger>
          <TabsTrigger value="hierarchy">
            <Building className="mr-2 h-4 w-4" /> Hierarchy
          </TabsTrigger>
        </TabsList>

        {/* Table View */}
        <TabsContent value="table">
          <Card>
            <CardContent className="pt-6">
              {filteredQuizzes.length === 0 ? (
                <EmptyState
                  hasFilters={hasActiveFilters()}
                  onCreate={() => router.push("/hod/quizzes/create")}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            selectedQuizzes.length === filteredQuizzes.length &&
                            filteredQuizzes.length > 0
                          }
                          onCheckedChange={(checked) => {
                            if (checked)
                              setSelectedQuizzes(filteredQuizzes.map((q) => q.id));
                            else setSelectedQuizzes([]);
                          }}
                        />
                      </TableHead>
                      <TableHead>Quiz</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stats</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuizzes.map((quiz) => {
                      const s = getQuizStats(quiz.id);
                      return (
                        <TableRow
                          key={quiz.id}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => router.push(`/hod/quizzes/${quiz.id}`)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedQuizzes.includes(quiz.id)}
                              onCheckedChange={(checked) => {
                                if (checked)
                                  setSelectedQuizzes((prev) => [...prev, quiz.id]);
                                else
                                  setSelectedQuizzes((prev) =>
                                    prev.filter((id) => id !== quiz.id)
                                  );
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{quiz.title}</p>
                              <div className="flex items-center gap-2">
                                {getDifficultyBadge(quiz.difficulty)}
                                <span className="text-xs text-muted-foreground">
                                  {quiz.total_questions} questions
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{quiz.course?.name || "N/A"}</p>
                              <p className="text-muted-foreground text-xs">
                                {quiz.program?.name || "N/A"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(quiz.status)}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">
                                {s.total_submissions}
                              </span>{" "}
                              subs
                              {s.total_submissions > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Avg: {s.average_score}%
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell
                            className="text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/hod/quizzes/${quiz.id}`)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(`/hod/quizzes/${quiz.id}/edit`)
                                  }
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleCopyQuizLink(quiz.id)}
                                >
                                  <Copy className="mr-2 h-4 w-4" /> Copy Link
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handlePreviewQuiz(quiz.id)}
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" /> Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setQuizToDelete(quiz.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grid View */}
        <TabsContent value="grid">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuizzes.length === 0 ? (
              <EmptyState
                className="col-span-full"
                hasFilters={hasActiveFilters()}
                onCreate={() => router.push("/hod/quizzes/create")}
              />
            ) : (
              filteredQuizzes.map((quiz) => {
                const s = getQuizStats(quiz.id);
                return (
                  <Card
                    key={quiz.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/hod/quizzes/${quiz.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-1">
                            {quiz.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 mt-1">
                            {quiz.description || "No description"}
                          </CardDescription>
                        </div>
                        {getStatusBadge(quiz.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        {getDifficultyBadge(quiz.difficulty)}
                        <span className="text-sm text-muted-foreground">
                          {quiz.total_questions} questions
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{quiz.course?.name || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {s.total_submissions} submission
                          {s.total_submissions !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {s.total_submissions > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <BarChart className="h-4 w-4 text-muted-foreground" />
                          <span>Avg: {s.average_score}%</span>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="border-t pt-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-muted-foreground">
                          {new Date(quiz.created_at).toLocaleDateString()}
                        </span>
                        <div
                          className="flex gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyQuizLink(quiz.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              router.push(`/hod/quizzes/${quiz.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Hierarchy View */}
        <TabsContent value="hierarchy">
          <Card>
            <CardContent className="pt-6">
              {filteredQuizzes.length === 0 ? (
                <EmptyState
                  hasFilters={hasActiveFilters()}
                  onCreate={() => router.push("/hod/quizzes/create")}
                />
              ) : (
                <div className="space-y-4">
                  {departments.map((dept) => {
                    const deptQuizzes = filteredQuizzes.filter(
                      (q) => q.department?.id === dept.id
                    );
                    const isExpanded = expandedDepartments.includes(dept.id);
                    return (
                      <div key={dept.id}>
                        <div
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                          onClick={() => toggleDepartment(dept.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Building className="h-5 w-5 text-blue-600" />
                            <div>
                              <h3 className="font-semibold">{dept.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {deptQuizzes.length} quiz
                                {deptQuizzes.length !== 1 ? "zes" : ""}
                              </p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </div>
                        {isExpanded && (
                          <div className="ml-8 mt-3 space-y-3">
                            {programs
                              .filter(
                                (prog) =>
                                  prog.department_id === dept.id &&
                                  deptQuizzes.some(
                                    (q) => q.program?.id === prog.id
                                  )
                              )
                              .map((prog) => {
                                const progQuizzes = deptQuizzes.filter(
                                  (q) => q.program?.id === prog.id
                                );
                                const isProgExpanded =
                                  expandedPrograms.includes(prog.id);
                                return (
                                  <div
                                    key={prog.id}
                                    className="border-l-2 border-slate-200 pl-4"
                                  >
                                    <div
                                      className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-slate-50"
                                      onClick={() => toggleProgram(prog.id)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <School className="h-4 w-4 text-slate-600" />
                                        <div>
                                          <h4 className="font-medium">
                                            {prog.name}
                                          </h4>
                                          <p className="text-xs text-muted-foreground">
                                            {progQuizzes.length} quiz
                                            {progQuizzes.length !== 1 ? "zes" : ""}
                                          </p>
                                        </div>
                                      </div>
                                      {isProgExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </div>
                                    {isProgExpanded && (
                                      <div className="ml-6 mt-2 space-y-2">
                                        {progQuizzes.map((quiz) => (
                                          <Card
                                            key={quiz.id}
                                            className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                                            onClick={() =>
                                              router.push(
                                                `/hod/quizzes/${quiz.id}`
                                              )
                                            }
                                          >
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <h5 className="font-medium">
                                                    {quiz.title}
                                                  </h5>
                                                  {getStatusBadge(quiz.status)}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                  <span className="flex items-center gap-1">
                                                    <ListChecks className="h-3 w-3" />
                                                    {quiz.total_questions}
                                                  </span>
                                                  <span className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {
                                                      getQuizStats(quiz.id)
                                                        .total_submissions
                                                    }
                                                  </span>
                                                  {quiz.time_limit_minutes && (
                                                    <span className="flex items-center gap-1">
                                                      <Timer className="h-3 w-3" />
                                                      {quiz.time_limit_minutes}m
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </Card>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quiz</DialogTitle>
            <DialogDescription>
              Are you sure? This will permanently delete the quiz, all questions,
              and submissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => quizToDelete && handleDeleteQuiz(quizToDelete)}
              disabled={isDeleting}
            >
              {isDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Reusable EmptyState component
function EmptyState({
  hasFilters,
  onCreate,
  className = "",
}: {
  hasFilters: boolean;
  onCreate: () => void;
  className?: string;
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">No quizzes found</h3>
      <p className="text-muted-foreground mb-4">
        {hasFilters
          ? "Try adjusting your filters"
          : "Get started by creating your first quiz"}
      </p>
      {!hasFilters && (
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" /> Create Quiz
        </Button>
      )}
    </div>
  );
}

// ✅ Outer component wraps inner in Suspense
export default function HoDQuizzesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
        </div>
      }
    >
      <HoDQuizzesContent />
    </Suspense>
  );
}