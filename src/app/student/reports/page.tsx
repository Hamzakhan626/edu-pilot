/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp,
  TrendingDown,
  Award,
  BookOpen,
  Brain,
  Target,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Flame,
  Star,
  BarChart3,
  PieChart,
  Activity,
  Download,
  Filter
} from 'lucide-react';

// Static data for student analytics
const studentData = {
  overview: {
    currentStreak: 12,
    bestStreak: 18,
    accuracyStreak: 8,
    totalBadges: 7,
    averageGrade: 87.5,
    attendanceRate: 92,
    completionRate: 88,
    studyHours: 45
  },
  coursePerformance: [
    { 
      id: 1, 
      course: 'Data Structures', 
      code: 'CS301',
      grade: 92, 
      attendance: 95, 
      assignments: '8/9',
      quizzes: '12/12',
      mastery: 88,
      trend: 'up',
      lastActivity: '2 hours ago'
    },
    { 
      id: 2, 
      course: 'Calculus II', 
      code: 'MATH201',
      grade: 85, 
      attendance: 88, 
      assignments: '7/9',
      quizzes: '11/12',
      mastery: 82,
      trend: 'up',
      lastActivity: '1 day ago'
    },
    { 
      id: 3, 
      course: 'Physics I', 
      code: 'PHY101',
      grade: 88, 
      attendance: 92, 
      assignments: '9/9',
      quizzes: '12/12',
      mastery: 90,
      trend: 'stable',
      lastActivity: '3 hours ago'
    },
    { 
      id: 4, 
      course: 'Database Systems', 
      code: 'CS305',
      grade: 82, 
      attendance: 90, 
      assignments: '6/9',
      quizzes: '10/12',
      mastery: 75,
      trend: 'down',
      lastActivity: '5 hours ago'
    }
  ],
  weeklyActivity: [
    { day: 'Mon', studyTime: 8, quizzes: 3, assignments: 1 },
    { day: 'Tue', studyTime: 6, quizzes: 2, assignments: 2 },
    { day: 'Wed', studyTime: 7, quizzes: 4, assignments: 0 },
    { day: 'Thu', studyTime: 5, quizzes: 2, assignments: 1 },
    { day: 'Fri', studyTime: 9, quizzes: 5, assignments: 3 },
    { day: 'Sat', studyTime: 4, quizzes: 1, assignments: 0 },
    { day: 'Sun', studyTime: 6, quizzes: 3, assignments: 1 }
  ],
  badges: [
    { id: 1, name: '7-Day Streak', icon: '🔥', earned: true, date: '2025-12-01' },
    { id: 2, name: '14-Day Streak', icon: '⚡', earned: true, date: '2025-12-08' },
    { id: 3, name: '10 Correct Streak', icon: '🎯', earned: true, date: '2025-11-28' },
    { id: 4, name: 'Perfect Week', icon: '⭐', earned: true, date: '2025-12-02' },
    { id: 5, name: '25 Assignments', icon: '📚', earned: true, date: '2025-11-20' },
    { id: 6, name: 'Top 10 Leaderboard', icon: '🏆', earned: true, date: '2025-12-05' },
    { id: 7, name: '90% Attendance', icon: '✅', earned: true, date: '2025-11-15' },
    { id: 8, name: '30-Day Streak', icon: '💎', earned: false, date: null },
    { id: 9, name: '50 Correct Streak', icon: '🎖️', earned: false, date: null }
  ],
  upcomingTasks: [
    { id: 1, type: 'assignment', title: 'Data Structures Project', course: 'CS301', due: '2025-12-10', priority: 'high' },
    { id: 2, type: 'quiz', title: 'Physics Midterm Review', course: 'PHY101', due: '2025-12-12', priority: 'high' },
    { id: 3, type: 'assignment', title: 'Calculus Problem Set', course: 'MATH201', due: '2025-12-13', priority: 'medium' },
    { id: 4, type: 'exam', title: 'Database Final Exam', course: 'CS305', due: '2025-12-20', priority: 'high' }
  ],
  recentActivity: [
    { id: 1, action: 'Completed quiz', course: 'CS301', score: 95, time: '2 hours ago' },
    { id: 2, action: 'Submitted assignment', course: 'MATH201', score: 88, time: '1 day ago' },
    { id: 3, action: 'Attended lecture', course: 'PHY101', score: null, time: '1 day ago' },
    { id: 4, action: 'Completed quiz', course: 'CS305', score: 82, time: '2 days ago' },
    { id: 5, action: 'Earned badge', course: 'Achievement', score: null, time: '3 days ago' }
  ],
  strengths: [
    { topic: 'Arrays & Linked Lists', mastery: 95, course: 'CS301' },
    { topic: 'Derivatives', mastery: 92, course: 'MATH201' },
    { topic: 'Newton\'s Laws', mastery: 90, course: 'PHY101' }
  ],
  needsImprovement: [
    { topic: 'SQL Joins', mastery: 65, course: 'CS305' },
    { topic: 'Integration Techniques', mastery: 72, course: 'MATH201' },
    { topic: 'Trees & Graphs', mastery: 75, course: 'CS301' }
  ]
};

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('month');

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-600" />;
    return <Activity className="h-3.5 w-3.5 text-gray-600" />;
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600 bg-green-50';
    if (grade >= 80) return 'text-blue-600 bg-blue-50';
    if (grade >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 85) return 'bg-green-500';
    if (mastery >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-sm text-gray-600 mt-0.5">Track your academic progress and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Current Streak</p>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{studentData.overview.currentStreak}</p>
            <p className="text-xs text-gray-500 mt-0.5">Best: {studentData.overview.bestStreak} days</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Avg Grade</p>
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{studentData.overview.averageGrade}%</p>
            <p className="text-xs text-green-600 mt-0.5">+3.5% from last month</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Attendance</p>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{studentData.overview.attendanceRate}%</p>
            <p className="text-xs text-gray-500 mt-0.5">38/42 classes</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Study Hours</p>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{studentData.overview.studyHours}h</p>
            <p className="text-xs text-gray-500 mt-0.5">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-white">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="courses" className="text-xs">Courses</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          <TabsTrigger value="achievements" className="text-xs">Achievements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Performance Overview */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Completion Rate</span>
                    <span className="text-xs font-semibold">{studentData.overview.completionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${studentData.overview.completionRate}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Average Grade</span>
                    <span className="text-xs font-semibold">{studentData.overview.averageGrade}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${studentData.overview.averageGrade}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Attendance Rate</span>
                    <span className="text-xs font-semibold">{studentData.overview.attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${studentData.overview.attendanceRate}%` }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strengths & Areas to Improve */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Mastery Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">Strengths</p>
                  <div className="space-y-1.5">
                    {studentData.strengths.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.topic}</p>
                          <p className="text-gray-500 text-xs">{item.course}</p>
                        </div>
                        <Badge variant="outline" className="ml-2 text-xs py-0 h-5 bg-green-50 text-green-700 border-green-200">
                          {item.mastery}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Needs Improvement</p>
                  <div className="space-y-1.5">
                    {studentData.needsImprovement.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.topic}</p>
                          <p className="text-gray-500 text-xs">{item.course}</p>
                        </div>
                        <Badge variant="outline" className="ml-2 text-xs py-0 h-5 bg-yellow-50 text-yellow-700 border-yellow-200">
                          {item.mastery}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Activity Chart */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Weekly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-40">
                {studentData.weeklyActivity.map((day, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-blue-100 rounded-t relative" style={{ height: `${(day.studyTime / 10) * 100}%` }}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-700">{day.studyTime}h</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600">{day.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity & Upcoming Tasks */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {studentData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-2 border-b last:border-0">
                    <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.course}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {activity.score && (
                        <p className="text-xs font-semibold text-green-600">{activity.score}%</p>
                      )}
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Upcoming Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {studentData.upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 pb-2 border-b last:border-0">
                    <div className={`p-1.5 rounded ${task.type === 'exam' ? 'bg-red-50' : task.priority === 'high' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                      {task.type === 'assignment' && <BookOpen className="h-3 w-3 text-blue-600" />}
                      {task.type === 'quiz' && <Brain className="h-3 w-3 text-purple-600" />}
                      {task.type === 'exam' && <AlertTriangle className="h-3 w-3 text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-500">{task.course}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-gray-900">{task.due.split('-')[2]}</p>
                      <p className="text-xs text-gray-400">Dec</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-3">
          {studentData.coursePerformance.map((course) => (
            <Card key={course.id} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-gray-900">{course.course}</h3>
                      {getTrendIcon(course.trend)}
                    </div>
                    <p className="text-xs text-gray-500">{course.code}</p>
                  </div>
                  <Badge className={`text-xs py-0.5 ${getGradeColor(course.grade)}`}>
                    {course.grade}%
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Attendance</p>
                    <p className="text-sm font-semibold text-gray-900">{course.attendance}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Assignments</p>
                    <p className="text-sm font-semibold text-gray-900">{course.assignments}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Quizzes</p>
                    <p className="text-sm font-semibold text-gray-900">{course.quizzes}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Mastery</p>
                    <p className="text-sm font-semibold text-gray-900">{course.mastery}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Topic Mastery</span>
                      <span className="text-xs font-medium">{course.mastery}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${getMasteryColor(course.mastery)}`} style={{ width: `${course.mastery}%` }}></div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 ml-4">{course.lastActivity}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Study Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {studentData.coursePerformance.map((course, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{course.course}</span>
                      <span className="text-xs text-gray-500">{10 + idx * 2}h</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                        style={{ width: `${70 + idx * 5}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Quiz Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-xs text-gray-700">Completed</span>
                  <span className="text-sm font-bold text-green-600">45</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-xs text-gray-700">Average Score</span>
                  <span className="text-sm font-bold text-blue-600">87%</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                  <span className="text-xs text-gray-700">Perfect Scores</span>
                  <span className="text-sm font-bold text-purple-600">12</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Assignment Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-xs text-gray-700">Submitted</span>
                  <span className="text-sm font-bold text-green-600">30</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                  <span className="text-xs text-gray-700">Pending</span>
                  <span className="text-sm font-bold text-yellow-600">3</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="text-xs text-gray-700">Late Submissions</span>
                  <span className="text-sm font-bold text-red-600">1</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4" />
                Earned Badges ({studentData.badges.filter(b => b.earned).length}/{studentData.badges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {studentData.badges.map((badge) => (
                  <div 
                    key={badge.id} 
                    className={`flex flex-col items-center p-3 rounded-lg border-2 ${
                      badge.earned 
                        ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50' 
                        : 'border-gray-200 bg-gray-50 opacity-50'
                    }`}
                  >
                    <div className="text-3xl mb-1">{badge.icon}</div>
                    <p className="text-xs font-medium text-center text-gray-900">{badge.name}</p>
                    {badge.earned && badge.date && (
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(badge.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border shadow-sm bg-gradient-to-br from-orange-50 to-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Flame className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Streak Stats</h3>
                    <p className="text-xs text-gray-600">Keep the momentum going!</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-700">Current Daily Streak</span>
                    <span className="text-lg font-bold text-orange-600">{studentData.overview.currentStreak} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-700">Best Streak</span>
                    <span className="text-sm font-semibold text-gray-900">{studentData.overview.bestStreak} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-700">Accuracy Streak</span>
                    <span className="text-sm font-semibold text-gray-900">{studentData.overview.accuracyStreak} correct</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-gradient-to-br from-purple-50 to-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Target className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Goals Progress</h3>
                    <p className="text-xs text-gray-600">Monthly targets</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-700">Complete 30 Quizzes</span>
                      <span className="text-xs font-semibold">28/30</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '93%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-700">95% Attendance</span>
                      <span className="text-xs font-semibold">92/95</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '97%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-700">Submit All Assignments</span>
                      <span className="text-xs font-semibold">30/33</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '91%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard Position */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Class Leaderboard Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-gray-600 mb-1">Overall Rank</p>
                  <p className="text-2xl font-bold text-yellow-600">#5</p>
                  <p className="text-xs text-gray-500 mt-0.5">out of 45</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs text-gray-600 mb-1">Daily Streak</p>
                  <p className="text-2xl font-bold text-orange-600">#3</p>
                  <p className="text-xs text-gray-500 mt-0.5">12 days</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">Top Scorer</p>
                  <p className="text-2xl font-bold text-green-600">#7</p>
                  <p className="text-xs text-gray-500 mt-0.5">87.5 avg</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Most Improved</p>
                  <p className="text-2xl font-bold text-blue-600">#2</p>
                  <p className="text-xs text-gray-500 mt-0.5">+8.5%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <Card className="border shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PieChart className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Performance Insights</h3>
              <p className="text-xs text-gray-600">
                You're doing great! Focus on SQL Joins and Integration Techniques to improve your overall mastery. Keep your streak alive to unlock the 30-Day Streak badge!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}