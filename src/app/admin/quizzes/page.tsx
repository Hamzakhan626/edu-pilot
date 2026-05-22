/* eslint-disable @typescript-eslint/no-unused-vars */
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
  Target,
  ChevronRight,
  ChevronDown,
  Loader2,
  Copy,
  ExternalLink,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
  ListChecks,
  XCircle,
  AlertTriangle,
  Filter,
  X,
} from "lucide-react";

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
  program?: Program;
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
function AdminQuizzesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
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
    department: searchParams.get("department") || "all",
    program: searchParams.get("program") || "all",
    course: searchParams.get("course") || "all",
    status: searchParams.get("status") || "all",
    difficulty: searchParams.get("difficulty") || "all",
    type: searchParams.get("type") || "all",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const [quizzesResult, deptResult, progResult, courseResult, statsResult] =
        await Promise.allSettled([
          supabase
            .from("quizzes")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase.from("departments").select("*").order("name"),
          supabase.from("programs").select("*").order("name"),
          supabase.from("courses").select("*").order("name"),
          supabase
            .from("quiz_submissions")
            .select("quiz_id, percentage, status"),
        ]);

      if (quizzesResult.status === "rejected") {
        const error = quizzesResult.reason;
        if (
          error.code === "42P01" ||
          error.message?.includes("does not exist")
        ) {
          setLoadError(
            "The quizzes table doesn't exist. Please run your migrations first."
          );
          setLoading(false);
          return;
        }
        throw error;
      }

      const quizzesData = quizzesResult.value.data || [];
      const departmentsData =
        deptResult.status === "fulfilled" ? deptResult.value.data || [] : [];
      const programsData =
        progResult.status === "fulfilled" ? progResult.value.data || [] : [];
      const coursesData =
        courseResult.status === "fulfilled"
          ? courseResult.value.data || []
          : [];
      const statsData =
        statsResult.status === "fulfilled" ? statsResult.value.data || [] : [];

      setDepartments(departmentsData);
      setPrograms(programsData);
      setCourses(coursesData);

      const enrichedQuizzes = quizzesData.map((quiz: any) => {
        const course = coursesData.find((c: any) => c.id === quiz.course_id);
        const program = course
          ? programsData.find((p: any) => p.id === course.program_id)
          : undefined;
        const department = program
          ? departmentsData.find((d: any) => d.id === program.department_id)
          : undefined;

        return { ...quiz, course, program, department };
      });

      setQuizzes(enrichedQuizzes);

      if (statsData.length > 0) {
        const statsMap = statsData.reduce((acc, submission: any) => {
          if (!acc[submission.quiz_id]) {
            acc[submission.quiz_id] = {
              quiz_id: submission.quiz_id,
              total_submissions: 0,
              total_score: 0,
              pending_grading: 0,
            };
          }
          acc[submission.quiz_id].total_submissions++;
          if (submission.percentage !== null) {
            acc[submission.quiz_id].total_score += submission.percentage;
          }
          if (
            submission.status === "submitted" &&
            submission.percentage === null
          ) {
            acc[submission.quiz_id].pending_grading++;
          }
          return acc;
        }, {} as Record<string, any>);

        const formattedStats = Object.values(statsMap).map((stat: any) => ({
          ...stat,
          average_score:
            stat.total_submissions > 0
              ? Math.round((stat.total_score / stat.total_submissions) * 100) /
                100
              : 0,
        }));

        setStats(formattedStats);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      const errorMessage =
        error?.message || error?.hint || "Unknown error occurred";
      setLoadError(
        `Failed to load quizzes: ${errorMessage}. Please check your database connection.`
      );
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getQuizStats = useCallback(
    (quizId: string) => {
      return (
        stats.find((stat) => stat.quiz_id === quizId) || {
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
        quiz.course?.name?.toLowerCase().includes(searchLower) ||
        quiz.program?.name?.toLowerCase().includes(searchLower) ||
        quiz.department?.name?.toLowerCase().includes(searchLower);

      const matchesDepartment =
        filters.department === "all" ||
        !filters.department ||
        quiz.department?.id === filters.department;

      const matchesProgram =
        filters.program === "all" ||
        !filters.program ||
        quiz.program?.id === filters.program;

      const matchesCourse =
        filters.course === "all" ||
        !filters.course ||
        quiz.course_id === filters.course;

      const matchesStatus =
        filters.status === "all" ||
        !filters.status ||
        quiz.status === filters.status;

      const matchesDifficulty =
        filters.difficulty === "all" ||
        !filters.difficulty ||
        quiz.difficulty === filters.difficulty;

      const matchesType =
        filters.type === "all" || !filters.type || quiz.type === filters.type;

      return (
        matchesSearch &&
        matchesDepartment &&
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

      toast.success("Quiz deleted successfully");
      setQuizzes(quizzes.filter((q) => q.id !== quizId));
      setSelectedQuizzes(selectedQuizzes.filter((id) => id !== quizId));
      setDeleteDialogOpen(false);
      setQuizToDelete(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(
        "Failed to delete quiz: " + (error.message || "Unknown error")
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkAction = async () => {
    if (bulkAction === "delete" && selectedQuizzes.length > 0) {
      try {
        setIsDeleting(true);
        const batchSize = 5;
        for (let i = 0; i < selectedQuizzes.length; i += batchSize) {
          const batch = selectedQuizzes.slice(i, i + batchSize);
          await Promise.allSettled(
            batch.map(async (quizId) => {
              await supabase
                .from("quiz_questions")
                .delete()
                .eq("quiz_id", quizId);
              await supabase
                .from("quiz_submissions")
                .delete()
                .eq("quiz_id", quizId);
              await supabase.from("quizzes").delete().eq("id", quizId);
            })
          );
        }
        toast.success(`Deleted ${selectedQuizzes.length} quizzes`);
        setQuizzes(quizzes.filter((q) => !selectedQuizzes.includes(q.id)));
        setSelectedQuizzes([]);
        setBulkAction("");
      } catch (error: any) {
        toast.error(
          "Failed to delete quizzes: " + (error.message || "Unknown error")
        );
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
        setQuizzes(
          quizzes.map((q) =>
            selectedQuizzes.includes(q.id) ? { ...q, status: "published" } : q
          )
        );
        setSelectedQuizzes([]);
        setBulkAction("");
      } catch (error: any) {
        toast.error(
          "Failed to publish quizzes: " + (error.message || "Unknown error")
        );
      }
    }
  };

  const getProgramsByDepartment = useCallback(
    (departmentId: string) => {
      if (departmentId === "all" || !departmentId) return [];
      return programs.filter((prog) => prog.department_id === departmentId);
    },
    [programs]
  );

  const getCoursesByProgram = useCallback(
    (programId: string) => {
      if (programId === "all" || !programId) return [];
      return courses.filter((course) => course.program_id === programId);
    },
    [courses]
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
      published: "bg-green-50 text-green-700 border-green-200",
      completed: "bg-blue-50 text-blue-700 border-blue-200",
      cancelled: "bg-red-50 text-red-700 border-red-200",
    };
    return (
      <Badge
        variant="outline"
        className={variants[status as keyof typeof variants] || ""}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getDifficultyBadge = (difficulty: string) => {
    const variants = {
      easy: "bg-green-50 text-green-700 border-green-200",
      medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
      hard: "bg-red-50 text-red-700 border-red-200",
    };
    return (
      <Badge
        variant="outline"
        className={variants[difficulty as keyof typeof variants] || ""}
      >
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </Badge>
    );
  };

  const toggleDepartment = (departmentId: string) => {
    setExpandedDepartments((prev) =>
      prev.includes(departmentId)
        ? prev.filter((id) => id !== departmentId)
        : [...prev, departmentId]
    );
  };

  const toggleProgram = (programId: string) => {
    setExpandedPrograms((prev) =>
      prev.includes(programId)
        ? prev.filter((id) => id !== programId)
        : [...prev, programId]
    );
  };

  const handleCopyQuizLink = (quizId: string) => {
    const quizLink = `${window.location.origin}/quiz/${quizId}`;
    navigator.clipboard.writeText(quizLink);
    toast.success("Quiz link copied!");
  };

  const handlePreviewQuiz = (quizId: string) => {
    window.open(`/quiz/${quizId}`, "_blank");
  };

  const handleExportQuizzes = () => {
    try {
      const exportData = filteredQuizzes.map((quiz) => ({
        Title: quiz.title,
        Description: quiz.description || "",
        Department: quiz.department?.name || "N/A",
        Program: quiz.program?.name || "N/A",
        Course: quiz.course?.name || "N/A",
        Status: quiz.status,
        Difficulty: quiz.difficulty,
        Type: quiz.type,
        Questions: quiz.total_questions,
        "Passing Score": `${quiz.passing_score}%`,
        "Time Limit": quiz.time_limit_minutes
          ? `${quiz.time_limit_minutes} min`
          : "None",
        "Created Date": new Date(quiz.created_at).toLocaleDateString(),
        Submissions: getQuizStats(quiz.id).total_submissions,
        "Average Score": `${getQuizStats(quiz.id).average_score}%`,
      }));

      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(","),
        ...exportData.map((row) =>
          headers
            .map((header) => `"${row[header as keyof typeof row]}"`)
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quizzes_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Exported successfully!");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const clearAllFilters = () => {
    setFilters({
      department: "all",
      program: "all",
      course: "all",
      status: "all",
      difficulty: "all",
      type: "all",
    });
    setSearch("");
  };

  const hasActiveFilters = () => {
    return search || Object.values(filters).some((value) => value !== "all");
  };

  const totalQuizzes = quizzes.length;
  const publishedQuizzes = quizzes.filter((q) => q.status === "published").length;
  const totalSubmissions = stats.reduce(
    (sum, stat) => sum + stat.total_submissions,
    0
  );
  const pendingGrading = stats.reduce(
    (sum, stat) => sum + stat.pending_grading,
    0
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-muted-foreground">Loading quizzes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle>Failed to Load Quizzes</CardTitle>
                  <CardDescription className="mt-2">{loadError}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Troubleshooting Steps:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Check your database connection in Supabase</li>
                    <li>Ensure the quizzes table exists</li>
                    <li>Run database migrations if needed</li>
                    <li>Check for any database permission issues</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button onClick={loadData} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <Button onClick={() => router.push("/admin")}>
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground mt-1">
            Manage {totalQuizzes} quiz{totalQuizzes !== 1 ? "zes" : ""} across
            all departments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportQuizzes}
            disabled={filteredQuizzes.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push("/admin/quizzes/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Quiz
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quizzes by title, description, or course..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1"
                    onClick={() => setSearch("")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
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
              <div className="space-y-3 pt-3 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Select
                    value={filters.department}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        department: value,
                        program: "all",
                        course: "all",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.program}
                    onValueChange={(value) =>
                      setFilters({ ...filters, program: value, course: "all" })
                    }
                    disabled={filters.department === "all"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs</SelectItem>
                      {getProgramsByDepartment(filters.department).map(
                        (prog) => (
                          <SelectItem key={prog.id} value={prog.id}>
                            {prog.name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.course}
                    onValueChange={(value) =>
                      setFilters({ ...filters, course: value })
                    }
                    disabled={filters.program === "all"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {getCoursesByProgram(filters.program).map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters({ ...filters, status: value })
                    }
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
                    onValueChange={(value) =>
                      setFilters({ ...filters, difficulty: value })
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
                    onValueChange={(value) =>
                      setFilters({ ...filters, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="multiple_choice">
                        Multiple Choice
                      </SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="w-full sm:w-auto"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-muted-foreground">
                Showing {filteredQuizzes.length} of {totalQuizzes} quizzes
              </span>
              <Button variant="ghost" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
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

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="table">
            <TableIcon className="mr-2 h-4 w-4" />
            Table
          </TabsTrigger>
          <TabsTrigger value="grid">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Grid
          </TabsTrigger>
          <TabsTrigger value="hierarchy">
            <Building className="mr-2 h-4 w-4" />
            Hierarchy
          </TabsTrigger>
        </TabsList>

        {/* Table View */}
        <TabsContent value="table">
          <Card>
            <CardContent className="pt-6">
              {filteredQuizzes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No quizzes found</h3>
                  <p className="text-muted-foreground mb-4">
                    {hasActiveFilters()
                      ? "Try adjusting your filters"
                      : "Create your first quiz to get started"}
                  </p>
                  {!hasActiveFilters() && (
                    <Button
                      onClick={() => router.push("/admin/quizzes/create")}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Quiz
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={
                              selectedQuizzes.length ===
                                filteredQuizzes.length &&
                              filteredQuizzes.length > 0
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedQuizzes(
                                  filteredQuizzes.map((q) => q.id)
                                );
                              } else {
                                setSelectedQuizzes([]);
                              }
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
                        const quizStats = getQuizStats(quiz.id);
                        return (
                          <TableRow
                            key={quiz.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() =>
                              router.push(`/admin/quizzes/${quiz.id}`)
                            }
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedQuizzes.includes(quiz.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedQuizzes([
                                      ...selectedQuizzes,
                                      quiz.id,
                                    ]);
                                  } else {
                                    setSelectedQuizzes(
                                      selectedQuizzes.filter(
                                        (id) => id !== quiz.id
                                      )
                                    );
                                  }
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
                                <p className="font-medium">
                                  {quiz.course?.name || "No Course"}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {quiz.program?.name || "No Program"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(quiz.status)}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm">
                                  <span className="font-medium">
                                    {quizStats.total_submissions}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {" "}
                                    submissions
                                  </span>
                                </div>
                                {quizStats.total_submissions > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    Avg: {quizStats.average_score}%
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(
                                  quiz.created_at
                                ).toLocaleDateString()}
                              </div>
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
                                      router.push(`/admin/quizzes/${quiz.id}`)
                                    }
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(
                                        `/admin/quizzes/${quiz.id}/edit`
                                      )
                                    }
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleCopyQuizLink(quiz.id)
                                    }
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Link
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handlePreviewQuiz(quiz.id)}
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setQuizToDelete(quiz.id);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grid View */}
        <TabsContent value="grid">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuizzes.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No quizzes found</h3>
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters()
                    ? "Try adjusting your filters"
                    : "Create your first quiz to get started"}
                </p>
              </div>
            ) : (
              filteredQuizzes.map((quiz) => {
                const quizStats = getQuizStats(quiz.id);
                return (
                  <Card
                    key={quiz.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => router.push(`/admin/quizzes/${quiz.id}`)}
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

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">
                            {quiz.course?.name || "No Course"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {quizStats.total_submissions} submission
                            {quizStats.total_submissions !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {quizStats.total_submissions > 0 && (
                          <div className="flex items-center gap-2">
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                            <span>Avg: {quizStats.average_score}%</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-muted-foreground">
                          {new Date(quiz.created_at).toLocaleDateString()}
                        </span>
                        <div
                          className="flex items-center gap-1"
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
                              router.push(`/admin/quizzes/${quiz.id}`)
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
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No quizzes found</h3>
                  <p className="text-muted-foreground">
                    {hasActiveFilters()
                      ? "Try adjusting your filters"
                      : "Create your first quiz to get started"}
                  </p>
                </div>
              ) : departments.length === 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-700">
                      No department structure available. Showing flat list.
                    </p>
                  </div>
                  {filteredQuizzes.map((quiz) => {
                    const quizStats = getQuizStats(quiz.id);
                    return (
                      <Card
                        key={quiz.id}
                        className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() =>
                          router.push(`/admin/quizzes/${quiz.id}`)
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{quiz.title}</h4>
                              {getStatusBadge(quiz.status)}
                              {getDifficultyBadge(quiz.difficulty)}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{quiz.total_questions} questions</span>
                              <span>•</span>
                              <span>
                                {quizStats.total_submissions} submissions
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {departments
                    .filter((dept) =>
                      filteredQuizzes.some((q) => q.department?.id === dept.id)
                    )
                    .map((dept) => {
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
                                              {progQuizzes.length !== 1
                                                ? "zes"
                                                : ""}
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
                                          {progQuizzes.map((quiz) => {
                                            const quizStats = getQuizStats(
                                              quiz.id
                                            );
                                            return (
                                              <Card
                                                key={quiz.id}
                                                className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                                                onClick={() =>
                                                  router.push(
                                                    `/admin/quizzes/${quiz.id}`
                                                  )
                                                }
                                              >
                                                <div className="flex items-start justify-between">
                                                  <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                      <h5 className="font-medium">
                                                        {quiz.title}
                                                      </h5>
                                                      {getStatusBadge(
                                                        quiz.status
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                      <span className="flex items-center gap-1">
                                                        <ListChecks className="h-3 w-3" />
                                                        {quiz.total_questions}
                                                      </span>
                                                      <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {
                                                          quizStats.total_submissions
                                                        }
                                                      </span>
                                                      {quiz.time_limit_minutes && (
                                                        <span className="flex items-center gap-1">
                                                          <Timer className="h-3 w-3" />
                                                          {
                                                            quiz.time_limit_minutes
                                                          }
                                                          m
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </Card>
                                            );
                                          })}
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
              Are you sure? This will permanently delete the quiz, all
              questions, and submissions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setQuizToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => quizToDelete && handleDeleteQuiz(quizToDelete)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ✅ Outer component wraps inner in Suspense
export default function AdminQuizzesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-muted-foreground">Loading quizzes...</p>
          </div>
        </div>
      }
    >
      <AdminQuizzesContent />
    </Suspense>
  );
}