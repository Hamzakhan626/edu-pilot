"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Clock,
  MapPin,
  Users,
  Calendar,
  BookOpen,
  FileText,
  AlertCircle,
  Loader2,
  Home,
  School,
  GraduationCap,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  start_at: string;
  end_at: string;
  location: string;
  program: string;
  semester: string;
  class_code: string;
  participants: number;
  created_by: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  class_id: string;
  max_score: number;
  created_at: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  course_id: string;
  time_limit_minutes: number;
  total_questions: number;
  status: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  semester: number;
  section: string;
  program_id: string;
  teacher_id: string;
  description: string;
}

interface Program {
  id: string;
  name: string;
  code: string;
  department_id: string;
  color: string;
}

interface Class {
  id: string;
  name: string;
  code: string;
  schedule: string;
  teacher_id: string;
  program_id: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id: string;
}

export default function TeacherCalendarPage() {
  // State management
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("Loading...");
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setDebugInfo("Checking authentication...");
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setDebugInfo("No authenticated user found. Please login.");
          toast({
            title: "Authentication Required",
            description: "Please login to access the calendar",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        console.log("✅ Authenticated user:", user.id);

        // Fetch user details from users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .eq("role", "teacher")
          .single();

        if (userError || !userData) {
          setDebugInfo("Teacher profile not found. Please contact administrator.");
          toast({
            title: "Profile Not Found",
            description: "Your teacher profile could not be loaded",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        console.log("✅ Teacher user data:", userData);
        setCurrentUser(userData);
        setDebugInfo(`Welcome, ${userData.full_name || userData.email}`);

      } catch (error: any) {
        console.error("❌ Error fetching user:", error);
        setDebugInfo(`Error: ${error.message}`);
        toast({
          title: "Error Loading Profile",
          description: "Please try refreshing the page",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch teacher's programs
  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchTeacherPrograms = async () => {
      try {
        console.log("🔍 Fetching teacher programs for:", currentUser.id);
        
        // First, get program IDs from teacher_programs table
        const { data: teacherPrograms, error: tpError } = await supabase
          .from("teacher_programs")
          .select("program_id")
          .eq("teacher_id", currentUser.id);

        if (tpError) {
          console.error("Error fetching teacher_programs:", tpError);
          return;
        }

        if (!teacherPrograms || teacherPrograms.length === 0) {
          console.log("ℹ️ No programs assigned to teacher");
          return;
        }

        const programIds = teacherPrograms.map(tp => tp.program_id);
        console.log("📋 Program IDs:", programIds);

        // Fetch program details
        const { data: programsData, error: programsError } = await supabase
          .from("programs")
          .select("*")
          .in("id", programIds);

        if (programsError) {
          console.error("Error fetching programs:", programsError);
          return;
        }

        console.log("✅ Programs loaded:", programsData);
        setPrograms(programsData || []);
        
        // Auto-select first program if none selected
        if (programsData && programsData.length > 0 && !selectedProgram) {
          setSelectedProgram(programsData[0].id);
        }

      } catch (error) {
        console.error("❌ Error in fetchTeacherPrograms:", error);
      }
    };

    fetchTeacherPrograms();
  }, [currentUser?.id, selectedProgram]);

  // Fetch teacher's courses
  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchTeacherCourses = async () => {
      try {
        console.log("🔍 Fetching courses for teacher:", currentUser.id);
        
        // Query courses table where teacher_id matches
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("*")
          .eq("teacher_id", currentUser.id)
          .order("semester", { ascending: true });

        if (coursesError) {
          console.error("Error fetching courses:", coursesError);
          return;
        }

        console.log("✅ Courses loaded:", coursesData?.length);
        setCourses(coursesData || []);

        // Auto-select first course if none selected and we have courses
        if (coursesData && coursesData.length > 0 && !selectedCourse) {
          setSelectedCourse(coursesData[0].id);
        }

      } catch (error) {
        console.error("❌ Error fetching courses:", error);
      }
    };

    fetchTeacherCourses();
  }, [currentUser?.id, selectedCourse]);

  // Fetch teacher's classes
  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchTeacherClasses = async () => {
      try {
        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("*")
          .eq("teacher_id", currentUser.id);

        if (!classesError) {
          setClasses(classesData || []);
        }
      } catch (error) {
        console.error("❌ Error fetching classes:", error);
      }
    };

    fetchTeacherClasses();
  }, [currentUser?.id]);

  // Fetch calendar events - teacher sees their own events + institute events
  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchCalendarEvents = async () => {
      try {
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        console.log("📅 Fetching events for month:", currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' }));

        const { data: eventsData, error: eventsError } = await supabase
          .from("calendar_events")
          .select("*")
          .or(`created_by.eq.${currentUser.id},type.eq.holiday,type.eq.semester-start,type.eq.break,type.eq.meeting,type.eq.exam-period`)
          .gte("start_at", startOfMonth.toISOString())
          .lte("start_at", endOfMonth.toISOString())
          .order("start_at", { ascending: true });

        if (eventsError) {
          console.error("Error fetching calendar events:", eventsError);
          return;
        }

        console.log("✅ Events loaded:", eventsData?.length);
        setCalendarEvents(eventsData || []);

      } catch (error) {
        console.error("❌ Error fetching calendar events:", error);
      }
    };

    fetchCalendarEvents();
  }, [currentUser?.id, currentMonth]);

  // Fetch assignments for selected course
  useEffect(() => {
    if (!selectedCourse) {
      setAssignments([]);
      return;
    }

    const fetchAssignments = async () => {
      try {
        console.log("📚 Fetching assignments for course:", selectedCourse);
        
        // Note: assignments.class_id references courses.id
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("assignments")
          .select("*")
          .eq("class_id", selectedCourse)
          .gte("due_date", new Date().toISOString())
          .order("due_date", { ascending: true });

        if (assignmentsError) {
          console.error("Error fetching assignments:", assignmentsError);
          return;
        }

        console.log("✅ Assignments loaded:", assignmentsData?.length);
        setAssignments(assignmentsData || []);

      } catch (error) {
        console.error("❌ Error fetching assignments:", error);
      }
    };

    fetchAssignments();
  }, [selectedCourse]);

  // Fetch quizzes for selected course
  useEffect(() => {
    if (!selectedCourse) {
      setQuizzes([]);
      return;
    }

    const fetchQuizzes = async () => {
      try {
        console.log("📝 Fetching quizzes for course:", selectedCourse);
        
        const { data: quizzesData, error: quizzesError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("course_id", selectedCourse)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true });

        if (!quizzesError) {
          console.log("✅ Quizzes loaded:", quizzesData?.length);
          setQuizzes(quizzesData || []);
        }
      } catch (error) {
        console.error("❌ Error fetching quizzes:", error);
      }
    };

    fetchQuizzes();
  }, [selectedCourse]);

  // Get current course details
  const currentCourse = selectedCourse 
    ? courses.find(c => c.id === selectedCourse)
    : null;

  // Get current program details
  const currentProgram = selectedProgram
    ? programs.find(p => p.id === selectedProgram)
    : null;

  // Calendar utility functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  // Generate calendar days array
  const calendarDays: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const formatDate = (date: Date, day: number) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Get events for a specific date
  const getEventsForDate = (day: number) => {
    const dateStr = formatDate(currentMonth, day);
    const events: any[] = [];

    // Add calendar events
    calendarEvents.forEach(event => {
      const eventDate = new Date(event.start_at).toISOString().split('T')[0];
      if (eventDate === dateStr) {
        events.push({
          id: event.id,
          title: event.title,
          type: event.type,
          time: new Date(event.start_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          location: event.location,
          description: event.description,
          isInstituteEvent: ['holiday', 'semester-start', 'break', 'meeting', 'exam-period'].includes(event.type)
        });
      }
    });

    // Add assignments for selected course
    if (selectedCourse) {
      assignments.forEach(assignment => {
        const dueDate = new Date(assignment.due_date).toISOString().split('T')[0];
        if (dueDate === dateStr) {
          events.push({
            id: assignment.id,
            title: `📝 ${assignment.title}`,
            type: 'assignment',
            time: new Date(assignment.due_date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            location: 'Online',
            description: assignment.description,
            isInstituteEvent: false
          });
        }
      });
    }

    // Add quizzes for selected course
    if (selectedCourse) {
      quizzes.forEach(quiz => {
        const quizDate = new Date(quiz.scheduled_at).toISOString().split('T')[0];
        if (quizDate === dateStr) {
          events.push({
            id: quiz.id,
            title: `📋 ${quiz.title}`,
            type: 'quiz',
            time: new Date(quiz.scheduled_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            location: 'Online',
            description: quiz.description,
            isInstituteEvent: false
          });
        }
      });
    }

    return events;
  };

  // Get event color based on type
  const getEventColor = (type: string, isInstituteEvent: boolean = false) => {
    const colors: Record<string, string> = {
      class: "bg-blue-100 text-blue-800 border-blue-300",
      exam: "bg-red-100 text-red-800 border-red-300",
      assignment: "bg-green-100 text-green-800 border-green-300",
      quiz: "bg-amber-100 text-amber-800 border-amber-300",
      holiday: "bg-purple-100 text-purple-800 border-purple-300",
      meeting: "bg-cyan-100 text-cyan-800 border-cyan-300",
      'semester-start': "bg-indigo-100 text-indigo-800 border-indigo-300",
      break: "bg-orange-100 text-orange-800 border-orange-300",
      'exam-period': "bg-rose-100 text-rose-800 border-rose-300",
    };
    
    return colors[type] || (isInstituteEvent 
      ? "bg-gray-100 text-gray-800 border-gray-300" 
      : "bg-blue-50 text-blue-800 border-blue-200");
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // Get upcoming events (next 30 days)
  const getUpcomingEvents = useCallback(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const events: any[] = [];

    // Calendar events
    calendarEvents.forEach(event => {
      const eventDate = new Date(event.start_at);
      if (eventDate >= now && eventDate <= thirtyDaysFromNow) {
        events.push({
          id: event.id,
          title: event.title,
          type: event.type,
          date: eventDate,
          time: eventDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          location: event.location,
          description: event.description,
          isInstituteEvent: ['holiday', 'semester-start', 'break', 'meeting', 'exam-period'].includes(event.type)
        });
      }
    });

    // Assignments
    if (selectedCourse) {
      assignments.forEach(assignment => {
        const dueDate = new Date(assignment.due_date);
        if (dueDate >= now && dueDate <= thirtyDaysFromNow) {
          events.push({
            id: assignment.id,
            title: `📝 ${assignment.title}`,
            type: 'assignment',
            date: dueDate,
            time: dueDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            location: 'Online',
            description: assignment.description,
            isInstituteEvent: false
          });
        }
      });
    }

    // Quizzes
    if (selectedCourse) {
      quizzes.forEach(quiz => {
        const quizDate = new Date(quiz.scheduled_at);
        if (quizDate >= now && quizDate <= thirtyDaysFromNow) {
          events.push({
            id: quiz.id,
            title: `📋 ${quiz.title}`,
            type: 'quiz',
            date: quizDate,
            time: quizDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            location: 'Online',
            description: quiz.description,
            isInstituteEvent: false
          });
        }
      });
    }

    // Sort by date
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [calendarEvents, assignments, quizzes, selectedCourse]);

  // Get institute events
  const instituteEvents = calendarEvents.filter(event =>
    ['holiday', 'semester-start', 'break', 'meeting', 'exam-period'].includes(event.type)
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="flex items-center space-x-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Loading Calendar</h1>
                <p className="text-gray-600">{debugInfo}</p>
              </div>
            </div>
            <div className="w-full max-w-md space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No user state
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <Card className="border-dashed border-2">
            <CardHeader className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Access Required</CardTitle>
              <CardDescription>
                You need to be logged in as a teacher to access this page
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-4">{debugInfo}</p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Teacher Calendar Dashboard
              </h1>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  <span className="font-medium">{currentUser.full_name || currentUser.email}</span>
                </div>
                <span className="hidden md:inline">•</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{monthYear}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" onClick={goToPreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Programs</p>
                    <p className="text-2xl font-bold text-blue-900">{programs.length}</p>
                  </div>
                  <School className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Courses</p>
                    <p className="text-2xl font-bold text-green-900">{courses.length}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Upcoming Events</p>
                    <p className="text-2xl font-bold text-purple-900">{getUpcomingEvents().length}</p>
                  </div>
                  <CalendarDays className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-700">Assignments</p>
                    <p className="text-2xl font-bold text-amber-900">{assignments.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4 mb-6">
            <TabsTrigger value="overview">
              <Home className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="calendar" disabled={!selectedCourse}>
              <Calendar className="w-4 h-4 mr-2" />
              Course Calendar
            </TabsTrigger>
            <TabsTrigger value="institute">
              <School className="w-4 h-4 mr-2" />
              Institute Events
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              <Bell className="w-4 h-4 mr-2" />
              Upcoming
            </TabsTrigger>
          </TabsList>

          {/* Selection Panel */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <School className="w-4 h-4" />
                    Select Program
                  </label>
                  <select
                    value={selectedProgram || ""}
                    onChange={(e) => {
                      setSelectedProgram(e.target.value || null);
                      setSelectedCourse(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a program...</option>
                    {programs.map(program => (
                      <option key={program.id} value={program.id}>
                        {program.name} ({program.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Select Course
                  </label>
                  <select
                    value={selectedCourse || ""}
                    onChange={(e) => setSelectedCourse(e.target.value || null)}
                    disabled={!selectedProgram}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">Choose a course...</option>
                    {courses
                      .filter(course => !selectedProgram || course.program_id === selectedProgram)
                      .map(course => (
                        <option key={course.id} value={course.id}>
                          {course.name} - Sem {course.semester} ({course.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <div className="w-full">
                    <p className="text-sm font-medium text-gray-700 mb-2">Current Selection</p>
                    <div className="p-3 bg-gray-50 rounded-md border">
                      {currentCourse ? (
                        <div>
                          <p className="font-semibold text-gray-900">{currentCourse.name}</p>
                          <p className="text-sm text-gray-600">
                            {currentProgram?.name} • Semester {currentCourse.semester}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No course selected</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <span>{monthYear}</span>
                    </div>
                    <div className="text-sm font-normal text-gray-600">
                      {calendarEvents.length} events this month
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center font-medium text-gray-600 text-sm py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const dayEvents = day ? getEventsForDate(day) : [];
                      const isToday = day && 
                        new Date().getDate() === day && 
                        new Date().getMonth() === currentMonth.getMonth() &&
                        new Date().getFullYear() === currentMonth.getFullYear();

                      return (
                        <div
                          key={index}
                          className={`min-h-24 border rounded-lg p-2 ${isToday ? 'bg-blue-50 border-blue-300' : 'border-gray-200'} ${!day ? 'bg-gray-50' : 'bg-white'}`}
                        >
                          {day && (
                            <>
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                                  {day}
                                </span>
                                {dayEvents.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {dayEvents.length}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-1">
                                {dayEvents.slice(0, 3).map((event, eventIndex) => (
                                  <div
                                    key={eventIndex}
                                    className={`text-xs px-2 py-1 rounded truncate ${getEventColor(event.type, event.isInstituteEvent)}`}
                                    title={`${event.title} (${event.time})`}
                                  >
                                    <div className="truncate">{event.title}</div>
                                  </div>
                                ))}
                                {dayEvents.length > 3 && (
                                  <div className="text-xs text-gray-500 text-center">
                                    +{dayEvents.length - 3} more
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Events Sidebar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Upcoming Events (30 days)
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[500px] overflow-y-auto">
                  {getUpcomingEvents().length > 0 ? (
                    <div className="space-y-4">
                      {getUpcomingEvents().slice(0, 8).map((event, index) => (
                        <div
                          key={`${event.id}-${index}`}
                          className={`p-3 rounded-lg border-l-4 ${getEventColor(event.type, event.isInstituteEvent)}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm mb-1">{event.title}</p>
                              <div className="space-y-1 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {event.date.toLocaleDateString()} • {event.time}
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                  </div>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No upcoming events</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Course Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            {selectedCourse ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>
                      {currentCourse?.name} Calendar
                    </CardTitle>
                    <CardDescription>
                      {currentProgram?.name} • Semester {currentCourse?.semester}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Assignments */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Upcoming Assignments ({assignments.length})
                        </h3>
                        {assignments.length > 0 ? (
                          <div className="space-y-3">
                            {assignments.map(assignment => (
                              <Card key={assignment.id} className="border-l-4 border-green-400">
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold">{assignment.title}</p>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Due: {new Date(assignment.due_date).toLocaleString()}
                                      </p>
                                      {assignment.description && (
                                        <p className="text-sm text-gray-500 mt-2">
                                          {assignment.description}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="outline">
                                      Max Score: {assignment.max_score}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            No upcoming assignments
                          </div>
                        )}
                      </div>

                      {/* Quizzes */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Upcoming Quizzes ({quizzes.length})
                        </h3>
                        {quizzes.length > 0 ? (
                          <div className="space-y-3">
                            {quizzes.map(quiz => (
                              <Card key={quiz.id} className="border-l-4 border-amber-400">
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold">{quiz.title}</p>
                                      <p className="text-sm text-gray-600 mt-1">
                                        Scheduled: {new Date(quiz.scheduled_at).toLocaleString()}
                                      </p>
                                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                        <span>Questions: {quiz.total_questions}</span>
                                        <span>Duration: {quiz.time_limit_minutes} mins</span>
                                        <span>Status: {quiz.status}</span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            No upcoming quizzes
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Course Info Sidebar */}
                <Card>
                  <CardHeader>
                    <CardTitle>Course Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentCourse ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Course Name</h4>
                          <p className="text-lg font-semibold">{currentCourse.name}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Course Code</h4>
                          <p className="font-medium">{currentCourse.code}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Semester & Section</h4>
                          <p className="font-medium">Semester {currentCourse.semester} • Section {currentCourse.section}</p>
                        </div>
                        {currentCourse.description && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Description</h4>
                            <p className="text-sm text-gray-600">{currentCourse.description}</p>
                          </div>
                        )}
                        {/* <Separator /> */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Quick Stats</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-xs text-blue-600">Assignments</p>
                              <p className="text-xl font-bold text-blue-900">{assignments.length}</p>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-lg">
                              <p className="text-xs text-amber-600">Quizzes</p>
                              <p className="text-xl font-bold text-amber-900">{quizzes.length}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No course selected
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Select a course to view details
                </h3>
                <p className="text-gray-500">
                  Choose a program and course from the selection panel above
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Institute Events Tab */}
          <TabsContent value="institute">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="w-5 h-5" />
                  Institute Calendar Events
                </CardTitle>
                <CardDescription>
                  Holidays, semester dates, and institute-wide events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {instituteEvents.length > 0 ? (
                  <div className="space-y-4">
                    {instituteEvents.map(event => {
                      const startDate = new Date(event.start_at);
                      const endDate = event.end_at ? new Date(event.end_at) : null;
                      
                      return (
                        <Card key={event.id} className={`border-l-4 ${getEventColor(event.type, true)}`}>
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge variant="secondary" className="capitalize">
                                    {event.type.replace('-', ' ')}
                                  </Badge>
                                  <h3 className="font-semibold text-lg">{event.title}</h3>
                                </div>
                                
                                {event.description && (
                                  <p className="text-gray-600 mb-3">{event.description}</p>
                                )}
                                
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                      {startDate.toLocaleDateString()}
                                      {endDate && ` - ${endDate.toLocaleDateString()}`}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      {startDate.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  
                                  {event.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-4 h-4" />
                                      <span>{event.location}</span>
                                    </div>
                                  )}
                                  
                                  {event.participants && (
                                    <div className="flex items-center gap-1">
                                      <Users className="w-4 h-4" />
                                      <span>{event.participants} participants</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      No institute events scheduled
                    </h3>
                    <p className="text-gray-500">
                      Institute events will appear here when scheduled
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upcoming Tab */}
          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  All Upcoming Events
                </CardTitle>
                <CardDescription>
                  Complete overview of all upcoming events and deadlines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Institute Events */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <School className="w-5 h-5" />
                      Institute Events ({instituteEvents.filter(e => 
                        new Date(e.start_at) >= new Date()
                      ).length})
                    </h3>
                    <div className="space-y-3">
                      {instituteEvents
                        .filter(event => new Date(event.start_at) >= new Date())
                        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                        .map(event => (
                          <Card key={event.id} className="border-l-4 border-purple-400">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">{event.title}</span>
                                    <Badge variant="outline" className="capitalize">
                                      {event.type.replace('-', ' ')}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {new Date(event.start_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>

                  {/* Course Events */}
                  {selectedCourse && (
                    <>
                      {/* <Separator /> */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <BookOpen className="w-5 h-5" />
                          {currentCourse?.name} Events ({assignments.length + quizzes.length})
                        </h3>
                        <div className="space-y-3">
                          {[...assignments, ...quizzes]
                            .sort((a, b) => {
                              const dateA = new Date('due_date' in a ? a.due_date : a.scheduled_at);
                              const dateB = new Date('due_date' in b ? b.due_date : b.scheduled_at);
                              return dateA.getTime() - dateB.getTime();
                            })
                            .map(item => (
                              <Card 
                                key={item.id} 
                                className={`border-l-4 ${'due_date' in item ? 'border-green-400' : 'border-amber-400'}`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold">
                                          {'due_date' in item ? '📝 Assignment:' : '📋 Quiz:'} {item.title}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600">
                                        {new Date('due_date' in item ? item.due_date : item.scheduled_at).toLocaleString()}
                                      </p>
                                      {'total_questions' in item && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {item.total_questions} questions • {item.time_limit_minutes} minutes
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}