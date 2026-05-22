'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, TrendingUp, AlertCircle, CheckCircle, Loader2, Download, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// Types
interface Program {
  id: string
  name: string
  code: string
  department_id: string
}

interface Semester {
  id: string
  name: string
  semester_type: string
  year: number
  program_id: string
  status: string
}

interface Course {
  id: string
  name: string
  code: string
  program_id: string
  semester_id: string
  teacher_id: string
  section: string
}

interface ReportData {
  totalStudents: number
  avgAttendance: number
  avgScore: number
  atRiskCount: number
  gradeDistribution: Array<{ name: string; count: number; percentage: number }>
  attendanceTrend: Array<{ week: string; present: number; absent: number; late: number }>
  quizPerformance: Array<{ quiz: string; avgScore: number; attempts: number }>
  assignmentStatus: Array<{ name: string; value: number; color: string }>
  streakData: Array<{ name: string; students: number; value: number }>
  atRiskStudents: Array<{
    id: string
    name: string
    email: string
    absences: number
    lowScores: number
    streak: number
    avgScore: number
  }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function ReportsPage() {
  // const supabase = createClient()
  
  // State
  const [programs, setPrograms] = useState<Program[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  
  const [reportView, setReportView] = useState<'overview' | 'attendance' | 'assignments' | 'quizzes' | 'at-risk'>('overview')
  const [reportData, setReportData] = useState<ReportData | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch Programs on mount
  useEffect(() => {
    fetchPrograms()
  }, [])

  // Fetch Semesters when program changes
  useEffect(() => {
    if (selectedProgram) {
      fetchSemesters(selectedProgram)
      setSelectedSemester('')
      setSelectedCourse('')
      setReportData(null)
    } else {
      setSemesters([])
      setCourses([])
      setReportData(null)
    }
  }, [selectedProgram])

  // Fetch Courses when semester changes
  useEffect(() => {
    if (selectedSemester) {
      fetchCourses(selectedProgram, selectedSemester)
      setSelectedCourse('')
      setReportData(null)
    } else {
      setCourses([])
      setReportData(null)
    }
  }, [selectedSemester])

  // Fetch Report Data when course changes
  useEffect(() => {
    if (selectedCourse) {
      fetchReportData(selectedCourse)
    } else {
      setReportData(null)
    }
  }, [selectedCourse])

  const fetchPrograms = async () => {
    try {
      setInitialLoading(true)
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, code, department_id')
        .order('name')

      if (error) throw error
      setPrograms(data || [])
    } catch (err) {
      console.error('Error fetching programs:', err)
      toast.error('Failed to load programs')
      setError('Failed to load programs')
    } finally {
      setInitialLoading(false)
    }
  }

  const fetchSemesters = async (programId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name, semester_type, year, program_id, status')
        .eq('program_id', programId)
        .order('year', { ascending: false })
        .order('name')

      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
      toast.error('Failed to load semesters')
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async (programId: string, semesterId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, code, program_id, semester_id, teacher_id, section')
        .eq('program_id', programId)
        .eq('semester_id', semesterId)
        .order('name')

      if (error) throw error
      setCourses(data || [])
    } catch (err) {
      console.error('Error fetching courses:', err)
      console.log('Selected Program ID:', programId)
      toast.error('Failed to load courses')

    } finally {
      setLoading(false)
    }
  }

  const fetchReportData = async (courseId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Get enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_courses')
        .select(`
          id,
          student_id,
          status,
          grade,
          users!student_courses_student_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('course_id', courseId)
        .eq('status', 'active')

      if (enrollError) throw enrollError

      const studentIds = enrollments?.map(e => e.student_id) || []
      const totalStudents = studentIds.length

      if (totalStudents === 0) {
        setReportData({
          totalStudents: 0,
          avgAttendance: 0,
          avgScore: 0,
          atRiskCount: 0,
          gradeDistribution: [],
          attendanceTrend: [],
          quizPerformance: [],
          assignmentStatus: [],
          streakData: [],
          atRiskStudents: [],
        })
        setLoading(false)
        return
      }

      // Fetch Attendance Data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, status, attendance_date')
        .eq('class_id', courseId)
        .in('student_id', studentIds)

      if (attendanceError) throw attendanceError

      // Fetch Quiz Data
      const { data: quizzes, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title')
        .eq('course_id', courseId)
        .order('created_at')

      if (quizError) throw quizError

      const quizIds = quizzes?.map(q => q.id) || []
      
      const { data: quizSubmissions, error: quizSubmissionsError } = await supabase
        .from('quiz_submissions')
        .select('quiz_id, student_id, percentage, status')
        .in('quiz_id', quizIds)
        .in('student_id', studentIds)

      if (quizSubmissionsError) throw quizSubmissionsError

      // Fetch Assignment Data
      const { data: assignments, error: assignmentError } = await supabase
        .from('assignments')
        .select('id, title')
        .eq('class_id', courseId)

      if (assignmentError) throw assignmentError

      const assignmentIds = assignments?.map(a => a.id) || []

      const { data: assignmentSubmissions, error: submissionError } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, student_id, submitted_at, status, score')
        .in('assignment_id', assignmentIds)
        .in('student_id', studentIds)

      if (submissionError) throw submissionError

      // Fetch Streak Data
      const { data: streakData, error: streakError } = await supabase
        .from('user_streaks')
        .select('user_id, current_streak, longest_streak')
        .in('user_id', studentIds)

      if (streakError) throw streakError

      // Calculate Metrics
      const attendanceRecords = attendanceData || []
      const totalAttendanceRecords = attendanceRecords.length
      const presentCount = attendanceRecords.filter(a => a.status === 'present').length
      const avgAttendance = totalAttendanceRecords > 0 
        ? (presentCount / totalAttendanceRecords) * 100 
        : 0

      // Calculate average quiz score
      const completedQuizzes = (quizSubmissions || []).filter(q => q.status === 'completed')
      const avgScore = completedQuizzes.length > 0
        ? completedQuizzes.reduce((sum, q) => sum + (Number(q.percentage) || 0), 0) / completedQuizzes.length
        : 0

      // Grade Distribution
      const gradeDistribution = calculateGradeDistribution(enrollments || [])

      // Attendance Trend (last 5 weeks)
      const attendanceTrend = calculateAttendanceTrend(attendanceData || [])

      // Quiz Performance
      const quizPerformance = calculateQuizPerformance(quizzes || [], quizSubmissions || [])

      // Assignment Status
      const assignmentStatus = calculateAssignmentStatus(
        assignments || [],
        assignmentSubmissions || []
      )

      // Streak Statistics
      const streakStats = calculateStreakStats(streakData || [])

      // At-Risk Students
      const atRiskStudents = identifyAtRiskStudents(
        enrollments || [],
        attendanceData || [],
        quizSubmissions || [],
        streakData || []
      )

      setReportData({
        totalStudents,
        avgAttendance: Math.round(avgAttendance * 10) / 10,
        avgScore: Math.round(avgScore * 10) / 10,
        atRiskCount: atRiskStudents.length,
        gradeDistribution,
        attendanceTrend,
        quizPerformance,
        assignmentStatus,
        streakData: streakStats,
        atRiskStudents,
      })

    } catch (err) {
      console.error('Error fetching report data:', err)
      toast.error('Failed to load report data')
      setError('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  // Helper Functions
  const calculateGradeDistribution = (enrollments: any[]) => {
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 }
    enrollments.forEach(e => {
      const grade = e.grade?.charAt(0).toUpperCase()
      if (grade && grade in grades) {
        grades[grade as keyof typeof grades]++
      }
    })

    const total = Object.values(grades).reduce((sum, count) => sum + count, 0)
    
    return Object.entries(grades).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
  }

  const calculateAttendanceTrend = (attendanceData: any[]) => {
    const now = new Date()
    const trends: { [key: string]: { present: number; absent: number; late: number } } = {}

    // Group by week (last 5 weeks)
    for (let i = 4; i >= 0; i--) {
      const weekDate = new Date(now)
      weekDate.setDate(weekDate.getDate() - (i * 7))
      const weekKey = `Week ${5 - i}`
      trends[weekKey] = { present: 0, absent: 0, late: 0 }
    }

    attendanceData.forEach(record => {
      const recordDate = new Date(record.attendance_date)
      const weeksDiff = Math.floor((now.getTime() - recordDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
      
      if (weeksDiff >= 0 && weeksDiff < 5) {
        const weekKey = `Week ${5 - weeksDiff}`
        if (trends[weekKey]) {
          if (record.status === 'present') trends[weekKey].present++
          else if (record.status === 'late') trends[weekKey].late++
          else trends[weekKey].absent++
        }
      }
    })

    return Object.entries(trends).map(([week, data]) => ({
      week,
      ...data,
    }))
  }

  const calculateQuizPerformance = (quizzes: any[], submissions: any[]) => {
    return quizzes.slice(0, 5).map(quiz => {
      const quizSubmissions = submissions.filter(s => s.quiz_id === quiz.id && s.status === 'completed')
      const avgScore = quizSubmissions.length > 0
        ? quizSubmissions.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0) / quizSubmissions.length
        : 0

      return {
        quiz: quiz.title.length > 15 ? quiz.title.substring(0, 15) + '...' : quiz.title,
        avgScore: Math.round(avgScore),
        attempts: quizSubmissions.length,
      }
    })
  }

  const calculateAssignmentStatus = (assignments: any[], submissions: any[]) => {
    let onTime = 0
    let late = 0
    let notSubmitted = 0

    assignments.forEach(assignment => {
      const assignmentSubmissions = submissions.filter(s => s.assignment_id === assignment.id)
      const hasSubmission = assignmentSubmissions.length > 0

      if (hasSubmission) {
        const submission = assignmentSubmissions[0]
        if (submission.status === 'submitted' || submission.status === 'graded') {
          onTime++
        } else if (submission.status === 'late') {
          late++
        }
      } else {
        notSubmitted++
      }
    })

    return [
      { name: 'Submitted On Time', value: onTime, color: '#10b981' },
      { name: 'Submitted Late', value: late, color: '#f59e0b' },
      { name: 'Not Submitted', value: notSubmitted, color: '#ef4444' },
    ]
  }

  const calculateStreakStats = (streakData: any[]) => {
    const activeStreaks = streakData.filter(s => s.current_streak > 0).length
    const sevenPlus = streakData.filter(s => s.current_streak >= 7).length
    const fourteenPlus = streakData.filter(s => s.current_streak >= 14).length
    const thirtyPlus = streakData.filter(s => s.current_streak >= 30).length

    return [
      { name: 'Active Streaks', students: activeStreaks, value: activeStreaks },
      { name: '7+ Day Streaks', students: sevenPlus, value: sevenPlus },
      { name: '14+ Day Streaks', students: fourteenPlus, value: fourteenPlus },
      { name: '30+ Day Streaks', students: thirtyPlus, value: thirtyPlus },
    ]
  }

  const identifyAtRiskStudents = (
    enrollments: any[],
    attendanceData: any[],
    quizSubmissions: any[],
    streakData: any[]
  ) => {
    const atRisk: any[] = []

    enrollments.forEach(enrollment => {
      const studentId = enrollment.student_id
      const student = enrollment.users

      // Count absences
      const studentAttendance = attendanceData.filter(a => a.student_id === studentId)
      const absences = studentAttendance.filter(a => a.status === 'absent').length
      const attendanceRate = studentAttendance.length > 0
        ? (studentAttendance.filter(a => a.status === 'present').length / studentAttendance.length) * 100
        : 100

      // Calculate average quiz score
      const studentQuizzes = quizSubmissions.filter(q => q.student_id === studentId && q.status === 'completed')
      const avgQuizScore = studentQuizzes.length > 0
        ? studentQuizzes.reduce((sum, q) => sum + (Number(q.percentage) || 0), 0) / studentQuizzes.length
        : 0

      const lowScores = studentQuizzes.filter(q => (Number(q.percentage) || 0) < 60).length

      // Get streak
      const streak = streakData.find(s => s.user_id === studentId)?.current_streak || 0

      // Flag as at-risk if:
      // - Attendance < 75%
      // - Average quiz score < 60%
      // - 3+ low scores
      // - No active streak
      if (attendanceRate < 75 || avgQuizScore < 60 || lowScores >= 3 || (streak === 0 && studentQuizzes.length > 0)) {
        atRisk.push({
          id: studentId,
          name: student?.full_name || 'Unknown',
          email: student?.email || '',
          absences,
          lowScores,
          streak,
          avgScore: Math.round(avgQuizScore),
        })
      }
    })

    return atRisk.sort((a, b) => {
      // Sort by severity: more absences and lower scores first
      const severityA = (a.absences * 2) + a.lowScores - a.streak
      const severityB = (b.absences * 2) + b.lowScores - b.streak
      return severityB - severityA
    })
  }

  const handleReset = () => {
    setSelectedProgram('')
    setSelectedSemester('')
    setSelectedCourse('')
    setReportData(null)
    setError(null)
  }

  const handleRefresh = () => {
    if (selectedCourse) {
      fetchReportData(selectedCourse)
    }
  }

  const handleExport = () => {
    toast.info('Export functionality coming soon!')
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground">
              Track student performance, attendance, and engagement metrics
            </p>
          </div>
          {selectedCourse && (
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          )}
        </div>

        {/* Selection Panel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Course Selection</CardTitle>
            <CardDescription>Select a program, semester, and course to view detailed analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Program
                </label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(program => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name} ({program.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Semester
                </label>
                <Select
                  value={selectedSemester}
                  onValueChange={setSelectedSemester}
                  disabled={!selectedProgram || loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map(semester => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.name} ({semester.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Course
                </label>
                <Select
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                  disabled={!selectedSemester || loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} {course.section ? `(${course.section})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={handleReset} variant="outline" className="w-full">
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && selectedCourse && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading report data...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="py-12 border-destructive">
            <CardContent className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium mb-2">{error}</p>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Report Content */}
        {selectedCourse && reportData && !loading && !error && (
          <>
            {/* View Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <Button
                onClick={() => setReportView('overview')}
                variant={reportView === 'overview' ? 'default' : 'outline'}
                size="sm"
              >
                Overview
              </Button>
              <Button
                onClick={() => setReportView('attendance')}
                variant={reportView === 'attendance' ? 'default' : 'outline'}
                size="sm"
              >
                Attendance
              </Button>
              <Button
                onClick={() => setReportView('assignments')}
                variant={reportView === 'assignments' ? 'default' : 'outline'}
                size="sm"
              >
                Assignments
              </Button>
              <Button
                onClick={() => setReportView('quizzes')}
                variant={reportView === 'quizzes' ? 'default' : 'outline'}
                size="sm"
              >
                Quizzes
              </Button>
              <Button
                onClick={() => setReportView('at-risk')}
                variant={reportView === 'at-risk' ? 'default' : 'outline'}
                size="sm"
              >
                At-Risk Students
                {reportData.atRiskCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {reportData.atRiskCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Overview Tab */}
            {reportView === 'overview' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Total Students
                          </p>
                          <p className="text-3xl font-bold">{reportData.totalStudents}</p>
                        </div>
                        <Users className="w-10 h-10 text-primary opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Avg Attendance
                          </p>
                          <p className="text-3xl font-bold">{reportData.avgAttendance}%</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Class Avg Score
                          </p>
                          <p className="text-3xl font-bold">{reportData.avgScore}%</p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-blue-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            At Risk
                          </p>
                          <p className="text-3xl font-bold">{reportData.atRiskCount}</p>
                        </div>
                        <AlertCircle className="w-10 h-10 text-orange-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Grade Distribution</CardTitle>
                      <CardDescription>
                        Student performance across letter grades
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {reportData.gradeDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={reportData.gradeDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(props: any) => {
                                const { name, percent } = props
                                return percent > 0 ? `${name}: ${Math.round(percent * 100)}%` : ''
                              }}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {reportData.gradeDistribution.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          No grade data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Streak Statistics</CardTitle>
                      <CardDescription>
                        Student engagement through streaks
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {reportData.streakData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={reportData.streakData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              fontSize={12}
                            />
                            <YAxis />
                            <Tooltip />
                            <Bar
                              dataKey="students"
                              fill="#3b82f6"
                              name="Number of Students"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          No streak data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Attendance & Quiz Trends */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Attendance Trend</CardTitle>
                      <CardDescription>
                        Attendance pattern over recent weeks
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {reportData.attendanceTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={reportData.attendanceTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="present"
                              stroke="#10b981"
                              name="Present"
                              strokeWidth={2}
                            />
                            <Line
                              type="monotone"
                              dataKey="absent"
                              stroke="#ef4444"
                              name="Absent"
                              strokeWidth={2}
                            />
                            <Line
                              type="monotone"
                              dataKey="late"
                              stroke="#f59e0b"
                              name="Late"
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          No attendance data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quiz Performance Trend</CardTitle>
                      <CardDescription>
                        Average score progression across quizzes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {reportData.quizPerformance.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={reportData.quizPerformance}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="quiz" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="avgScore"
                              stroke="#3b82f6"
                              name="Avg Score"
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          No quiz data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Attendance Tab */}
            {reportView === 'attendance' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Analysis</CardTitle>
                    <CardDescription>
                      Detailed attendance statistics and trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reportData.attendanceTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={reportData.attendanceTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="present" fill="#10b981" name="Present" />
                          <Bar dataKey="late" fill="#f59e0b" name="Late" />
                          <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        No attendance data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">Average Attendance Rate:</span>
                        <Badge variant="default" className="bg-green-600">
                          {reportData.avgAttendance}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">Total Students:</span>
                        <span className="font-bold">{reportData.totalStudents}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">Students Below 75% Attendance:</span>
                        <Badge variant={reportData.atRiskStudents.filter(s => s.absences > reportData.totalStudents * 0.25).length > 0 ? 'destructive' : 'secondary'}>
                          {reportData.atRiskStudents.filter(s => s.absences > reportData.totalStudents * 0.25).length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Assignments Tab */}
            {reportView === 'assignments' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment Submission Status</CardTitle>
                    <CardDescription>
                      Overview of assignment submissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reportData.assignmentStatus.some(s => s.value > 0) ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={reportData.assignmentStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => entry.value > 0 ? `${entry.name}: ${entry.value}` : ''}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {reportData.assignmentStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                        No assignment data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Assignment Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reportData.assignmentStatus.map((status, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium">{status.name}:</span>
                          <Badge style={{ backgroundColor: status.color }}>
                            {status.value} ({status.value > 0 ? Math.round((status.value / reportData.assignmentStatus.reduce((sum, s) => sum + s.value, 0)) * 100) : 0}%)
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quizzes Tab */}
            {reportView === 'quizzes' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quiz Performance Trend</CardTitle>
                    <CardDescription>
                      Average scores and participation rates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reportData.quizPerformance.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={reportData.quizPerformance}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="quiz" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="avgScore"
                            fill="#3b82f6"
                            name="Avg Score (%)"
                          />
                          <Bar
                            yAxisId="right"
                            dataKey="attempts"
                            fill="#8b5cf6"
                            name="Attempts"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        No quiz data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quiz Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">Total Quizzes Created:</span>
                        <span className="font-bold">{reportData.quizPerformance.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">Class Average Score:</span>
                        <Badge variant="default">{reportData.avgScore}%</Badge>
                      </div>
                      {reportData.quizPerformance.length > 0 && (
                        <>
                          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <span className="font-medium">Highest Quiz Score:</span>
                            <Badge className="bg-green-600">
                              {Math.max(...reportData.quizPerformance.map(q => q.avgScore))}%
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <span className="font-medium">Lowest Quiz Score:</span>
                            <Badge variant="secondary">
                              {Math.min(...reportData.quizPerformance.map(q => q.avgScore))}%
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* At-Risk Students Tab */}
            {reportView === 'at-risk' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>At-Risk Students</CardTitle>
                    <CardDescription>
                      Students flagged for academic or engagement concerns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reportData.atRiskStudents.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-2">Student Name</th>
                              <th className="text-left py-3 px-2">Email</th>
                              <th className="text-left py-3 px-2">Absences</th>
                              <th className="text-left py-3 px-2">Low Scores</th>
                              <th className="text-left py-3 px-2">Avg Score</th>
                              <th className="text-left py-3 px-2">Streak</th>
                              <th className="text-left py-3 px-2">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.atRiskStudents.map(student => (
                              <tr
                                key={student.id}
                                className="border-b hover:bg-muted/50 transition-colors"
                              >
                                <td className="py-3 px-2 font-medium">{student.name}</td>
                                <td className="py-3 px-2 text-muted-foreground">{student.email}</td>
                                <td className="py-3 px-2">
                                  <Badge variant={student.absences > 5 ? 'destructive' : 'secondary'}>
                                    {student.absences}
                                  </Badge>
                                </td>
                                <td className="py-3 px-2">
                                  <Badge variant={student.lowScores >= 3 ? 'destructive' : 'secondary'}>
                                    {student.lowScores}
                                  </Badge>
                                </td>
                                <td className="py-3 px-2">
                                  <Badge variant={student.avgScore < 60 ? 'destructive' : 'default'}>
                                    {student.avgScore}%
                                  </Badge>
                                </td>
                                <td className="py-3 px-2">
                                  <Badge variant={student.streak === 0 ? 'secondary' : 'default'}>
                                    {student.streak} days
                                  </Badge>
                                </td>
                                <td className="py-3 px-2">
                                  <Button variant="link" size="sm" className="h-auto p-0">
                                    Review
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">Great News!</p>
                        <p className="text-muted-foreground">
                          No students are currently flagged as at-risk
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {reportData.atRiskStudents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Intervention Recommendations</CardTitle>
                      <CardDescription>
                        Suggested actions to support at-risk students
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {reportData.atRiskStudents.slice(0, 3).map((student, idx) => (
                          <li key={idx} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                            <span className="text-blue-500 font-bold">•</span>
                            <div>
                              <span className="font-medium">{student.name}:</span>
                              <span className="text-muted-foreground ml-2">
                                {student.absences > 5 
                                  ? 'Schedule attendance review meeting' 
                                  : student.lowScores >= 3 
                                    ? 'Provide additional study resources and tutoring'
                                    : student.streak === 0
                                      ? 'Encourage engagement through interactive activities'
                                      : 'Monitor progress and provide support'}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!selectedCourse && !loading && (
          <Card className="py-16">
            <CardContent className="text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Course Selected</p>
              <p className="text-muted-foreground">
                Select a program, semester, and course above to view analytics and reports
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}