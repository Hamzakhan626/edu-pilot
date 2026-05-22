/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Clock, 
  Trophy, 
  Target, 
  CheckCircle,
  AlertCircle,
  Flame,
  BookOpen,
  Calendar,
  TrendingUp,
  TrendingDown,
  Award,
  ChevronRight,
  Users,
  BarChart3,
  AlertTriangle,
  Star,
  Activity
} from 'lucide-react';

// Mock data for children
const children = [
  {
    id: '1',
    name: 'Ahmed Khan',
    grade: '10th Grade',
    avatar: '👦',
    totalQuizzes: 12,
    completedQuizzes: 10,
    avgScore: 85,
    currentStreak: 12,
    courses: 3,
    status: 'excellent'
  },
  {
    id: '2',
    name: 'Fatima Khan',
    grade: '8th Grade',
    avatar: '👧',
    totalQuizzes: 15,
    completedQuizzes: 14,
    avgScore: 92,
    currentStreak: 18,
    courses: 4,
    status: 'excellent'
  },
  {
    id: '3',
    name: 'Ali Khan',
    grade: '6th Grade',
    avatar: '👦',
    totalQuizzes: 10,
    completedQuizzes: 7,
    avgScore: 68,
    currentStreak: 3,
    courses: 3,
    status: 'needs-attention'
  }
];

const childDetailedData: Record<string, any> = {
  '1': {
    courses: [
      { 
        code: 'MATH101', 
        name: 'Calculus I',
        teacher: 'Dr. Ahmed Khan',
        avgScore: 85,
        quizzesTaken: 5,
        totalQuizzes: 7,
        upcomingQuizzes: 2,
        lastQuizDate: '2024-12-10',
        trend: 'up'
      },
      { 
        code: 'CS101', 
        name: 'Programming Fundamentals',
        teacher: 'Prof. Hassan Raza',
        avgScore: 92,
        quizzesTaken: 4,
        totalQuizzes: 5,
        upcomingQuizzes: 1,
        lastQuizDate: '2024-12-09',
        trend: 'up'
      },
      { 
        code: 'CS201', 
        name: 'Data Structures',
        teacher: 'Dr. Sara Ali',
        avgScore: 78,
        quizzesTaken: 3,
        totalQuizzes: 6,
        upcomingQuizzes: 3,
        lastQuizDate: '2024-12-08',
        trend: 'stable'
      }
    ],
    recentQuizzes: [
      {
        title: 'Chain Rule Practice',
        course: 'MATH101',
        date: '2024-12-10',
        score: 85,
        type: 'Quick Quiz',
        status: 'completed'
      },
      {
        title: 'Functions and Arrays',
        course: 'CS101',
        date: '2024-12-09',
        score: 95,
        type: 'Quick Quiz',
        status: 'completed'
      },
      {
        title: 'Arrays and Sorting',
        course: 'CS201',
        date: '2024-12-08',
        score: 78,
        type: 'Quick Quiz',
        status: 'completed'
      }
    ],
    upcomingQuizzes: [
      {
        title: 'Derivatives and Limits',
        course: 'MATH101',
        date: '2024-12-15T10:00:00',
        duration: 15,
        questions: 10
      },
      {
        title: 'C++ Basics',
        course: 'CS101',
        date: '2024-12-16T11:00:00',
        duration: 20,
        questions: 12
      }
    ]
  },
  '2': {
    courses: [
      { 
        code: 'ENG201', 
        name: 'English Literature',
        teacher: 'Ms. Sarah Ahmed',
        avgScore: 95,
        quizzesTaken: 6,
        totalQuizzes: 7,
        upcomingQuizzes: 1,
        lastQuizDate: '2024-12-10',
        trend: 'up'
      },
      { 
        code: 'SCI201', 
        name: 'Physics',
        teacher: 'Dr. Kamran Ali',
        avgScore: 88,
        quizzesTaken: 5,
        totalQuizzes: 6,
        upcomingQuizzes: 1,
        lastQuizDate: '2024-12-09',
        trend: 'up'
      },
      { 
        code: 'MATH201', 
        name: 'Algebra II',
        teacher: 'Prof. Nadia Khan',
        avgScore: 93,
        quizzesTaken: 4,
        totalQuizzes: 5,
        upcomingQuizzes: 1,
        lastQuizDate: '2024-12-08',
        trend: 'stable'
      }
    ],
    recentQuizzes: [
      {
        title: 'Shakespeare Analysis',
        course: 'ENG201',
        date: '2024-12-10',
        score: 98,
        type: 'Assignment',
        status: 'completed'
      },
      {
        title: 'Motion and Forces',
        course: 'SCI201',
        date: '2024-12-09',
        score: 90,
        type: 'Quick Quiz',
        status: 'completed'
      },
      {
        title: 'Quadratic Equations',
        course: 'MATH201',
        date: '2024-12-08',
        score: 95,
        type: 'Quick Quiz',
        status: 'completed'
      }
    ],
    upcomingQuizzes: [
      {
        title: 'Poetry Forms',
        course: 'ENG201',
        date: '2024-12-15T09:00:00',
        duration: 25,
        questions: 15
      }
    ]
  },
  '3': {
    courses: [
      { 
        code: 'MATH101', 
        name: 'Basic Math',
        teacher: 'Ms. Ayesha Malik',
        avgScore: 65,
        quizzesTaken: 4,
        totalQuizzes: 6,
        upcomingQuizzes: 2,
        lastQuizDate: '2024-12-09',
        trend: 'down'
      },
      { 
        code: 'SCI101', 
        name: 'General Science',
        teacher: 'Mr. Usman Shah',
        avgScore: 72,
        quizzesTaken: 3,
        totalQuizzes: 5,
        upcomingQuizzes: 2,
        lastQuizDate: '2024-12-08',
        trend: 'stable'
      }
    ],
    recentQuizzes: [
      {
        title: 'Fractions and Decimals',
        course: 'MATH101',
        date: '2024-12-09',
        score: 62,
        type: 'Quick Quiz',
        status: 'completed'
      },
      {
        title: 'Plant Biology',
        course: 'SCI101',
        date: '2024-12-08',
        score: 75,
        type: 'Assignment',
        status: 'completed'
      }
    ],
    upcomingQuizzes: [
      {
        title: 'Multiplication Tables',
        course: 'MATH101',
        date: '2024-12-14T10:00:00',
        duration: 20,
        questions: 15
      },
      {
        title: 'The Solar System',
        course: 'SCI101',
        date: '2024-12-16T11:00:00',
        duration: 15,
        questions: 10
      }
    ]
  }
};

export default function ParentQuizzesPage() {
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'details'>('overview');

  const handleSelectChild = (child: any) => {
    setSelectedChild(child);
    setCurrentView('details');
  };

  const handleBackToOverview = () => {
    setCurrentView('overview');
    setSelectedChild(null);
  };

  // Calculate overall stats
  const totalChildren = children.length;
  const avgPerformance = Math.round(children.reduce((sum, c) => sum + c.avgScore, 0) / children.length);
  const childrenNeedingAttention = children.filter(c => c.status === 'needs-attention').length;
  const totalActiveStreaks = children.filter(c => c.currentStreak >= 7).length;

  // Child Details View
  if (currentView === 'details' && selectedChild) {
    const childData = childDetailedData[selectedChild.id];

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBackToOverview} size="sm">
            <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Overview
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl">
              {selectedChild.avatar}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{selectedChild.name}</h1>
              <p className="text-gray-500">{selectedChild.grade}</p>
            </div>
          </div>
          <Badge variant={selectedChild.status === 'excellent' ? 'default' : 'destructive'} className="text-sm px-4 py-2">
            {selectedChild.status === 'excellent' ? '✨ Excellent Performance' : '⚠️ Needs Attention'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-blue-100 rounded-xl mr-4">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedChild.avgScore}%</p>
                <p className="text-sm text-gray-500">Avg Score</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-orange-100 rounded-xl mr-4">
                <Flame className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedChild.currentStreak}</p>
                <p className="text-sm text-gray-500">Day Streak</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-green-100 rounded-xl mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedChild.completedQuizzes}/{selectedChild.totalQuizzes}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-purple-100 rounded-xl mr-4">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedChild.courses}</p>
                <p className="text-sm text-gray-500">Courses</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Course Performance</CardTitle>
              <CardDescription>Performance breakdown by course</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {childData.courses.map((course: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{course.code}</h3>
                        {course.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                        {course.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                      </div>
                      <p className="text-sm text-gray-500">{course.name}</p>
                      <p className="text-xs text-gray-400">{course.teacher}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        course.avgScore >= 80 ? 'text-green-600' :
                        course.avgScore >= 60 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {course.avgScore}%
                      </div>
                      <p className="text-xs text-gray-500">{course.quizzesTaken}/{course.totalQuizzes} quizzes</p>
                    </div>
                  </div>
                  <Progress value={course.avgScore} className="h-2" />
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>Last quiz: {new Date(course.lastQuizDate).toLocaleDateString()}</span>
                    <span className="text-blue-600 font-medium">{course.upcomingQuizzes} upcoming</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span>Upcoming Quizzes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {childData.upcomingQuizzes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No upcoming quizzes</p>
                ) : (
                  <div className="space-y-3">
                    {childData.upcomingQuizzes.map((quiz: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            <Brain className={`h-5 w-5 ${
                              index === 0 ? 'text-red-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{quiz.title}</p>
                            <p className="text-xs text-gray-500">{quiz.course}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold">
                            {new Date(quiz.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(quiz.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {childData.recentQuizzes.map((quiz: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          quiz.score >= 80 ? 'bg-green-100' :
                          quiz.score >= 60 ? 'bg-orange-100' : 'bg-red-100'
                        }`}>
                          <Trophy className={`h-5 w-5 ${
                            quiz.score >= 80 ? 'text-green-600' :
                            quiz.score >= 60 ? 'text-orange-600' : 'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{quiz.title}</p>
                          <p className="text-xs text-gray-500">{quiz.course}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          quiz.score >= 80 ? 'text-green-600' :
                          quiz.score >= 60 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {quiz.score}%
                        </p>
                        <p className="text-xs text-gray-500">{new Date(quiz.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>Performance Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border-2 ${
                selectedChild.status === 'excellent' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {selectedChild.status === 'excellent' ? (
                    <Star className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  )}
                  <h4 className="font-semibold">Overall Status</h4>
                </div>
                <p className="text-sm text-gray-700">
                  {selectedChild.status === 'excellent' 
                    ? `${selectedChild.name} is performing excellently with an average score of ${selectedChild.avgScore}% and maintaining a ${selectedChild.currentStreak}-day streak.`
                    : `${selectedChild.name} may need additional support. Consider reviewing the subjects where performance is lower.`
                  }
                </p>
              </div>

              <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Flame className="h-5 w-5 text-orange-600" />
                  <h4 className="font-semibold">Consistency</h4>
                </div>
                <p className="text-sm text-gray-700">
                  {selectedChild.currentStreak >= 7
                    ? `Great job! ${selectedChild.name} has been consistently completing quizzes for ${selectedChild.currentStreak} days.`
                    : `Encourage ${selectedChild.name} to maintain a regular quiz schedule. Current streak: ${selectedChild.currentStreak} days.`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overview Dashboard
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Children's Quiz Performance</h1>
        <p className="text-gray-500 mt-1">Monitor your children's quiz activities and academic progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalChildren}</p>
              <p className="text-sm text-gray-500">Children</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgPerformance}%</p>
              <p className="text-sm text-gray-500">Avg Performance</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-orange-100 rounded-xl mr-4">
              <Flame className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalActiveStreaks}</p>
              <p className="text-sm text-gray-500">Active Streaks</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-red-100 rounded-xl mr-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{childrenNeedingAttention}</p>
              <p className="text-sm text-gray-500">Need Attention</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {childrenNeedingAttention > 0 && (
        <Card className="border-0 shadow-lg bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">Action Required</h3>
                <p className="text-sm text-orange-800">
                  {childrenNeedingAttention} {childrenNeedingAttention === 1 ? 'child needs' : 'children need'} additional support. 
                  Check their detailed performance below and consider reaching out to their teachers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Children Overview</CardTitle>
          <CardDescription>Click on a child to view detailed performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Card 
                key={child.id} 
                className={`border-2 hover:shadow-xl transition-all cursor-pointer group ${
                  child.status === 'needs-attention' ? 'border-orange-300' : 'border-gray-200 hover:border-blue-500'
                }`}
                onClick={() => handleSelectChild(child)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl">
                        {child.avatar}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{child.name}</h3>
                        <p className="text-sm text-gray-500">{child.grade}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Average Score</span>
                      <span className={`font-bold ${
                        child.avgScore >= 80 ? 'text-green-600' :
                        child.avgScore >= 60 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {child.avgScore}%
                      </span>
                    </div>
                    <Progress value={child.avgScore} className="h-2" />

                    <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">{child.currentStreak}</div>
                        <div className="text-xs text-gray-500">Streak</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{child.completedQuizzes}</div>
                        <div className="text-xs text-gray-500">Done</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{child.courses}</div>
                        <div className="text-xs text-gray-500">Courses</div>
                      </div>
                    </div>

                    {child.status === 'needs-attention' && (
                      <div className="mt-3 p-2 bg-orange-100 border border-orange-200 rounded-lg flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <span className="text-xs text-orange-800 font-medium">May need support</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Top Performers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...children]
                .sort((a, b) => b.avgScore - a.avgScore)
                .map((child, index) => (
                  <div key={child.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-600' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="text-2xl">{child.avatar}</div>
                      <div>
                        <p className="font-semibold">{child.name}</p>
                        <p className="text-sm text-gray-500">{child.grade}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">{child.avgScore}%</div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Flame className="h-3 w-3 mr-1 text-orange-500" />
                        {child.currentStreak} days
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Upcoming Deadlines</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(childDetailedData)
                .flatMap(([childId, data]: [string, any]) => 
                  data.upcomingQuizzes.map((quiz: any) => ({
                    ...quiz,
                    childName: children.find(c => c.id === childId)?.name || '',
                    childAvatar: children.find(c => c.id === childId)?.avatar || ''
                  }))
                )
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map((quiz, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{quiz.childAvatar}</div>
                      <div>
                        <p className="font-medium text-sm">{quiz.title}</p>
                        <p className="text-xs text-gray-500">{quiz.childName} - {quiz.course}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">
                        {new Date(quiz.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(quiz.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Recent Quiz Results</CardTitle>
          <CardDescription>Latest quiz completions across all children</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(childDetailedData)
              .flatMap(([childId, data]: [string, any]) => 
                data.recentQuizzes.map((quiz: any) => ({
                  ...quiz,
                  childName: children.find(c => c.id === childId)?.name || '',
                  childAvatar: children.find(c => c.id === childId)?.avatar || '',
                  childGrade: children.find(c => c.id === childId)?.grade || ''
                }))
              )
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 6)
              .map((quiz, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      quiz.score >= 80 ? 'bg-green-100' :
                      quiz.score >= 60 ? 'bg-orange-100' : 'bg-red-100'
                    }`}>
                      <Trophy className={`h-6 w-6 ${
                        quiz.score >= 80 ? 'text-green-600' :
                        quiz.score >= 60 ? 'text-orange-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div className="text-2xl">{quiz.childAvatar}</div>
                    <div>
                      <p className="font-semibold">{quiz.title}</p>
                      <p className="text-sm text-gray-500">{quiz.childName} - {quiz.course}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(quiz.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        quiz.score >= 80 ? 'text-green-600' :
                        quiz.score >= 60 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {quiz.score}%
                      </div>
                      <Badge variant="outline" className="mt-1">{quiz.type}</Badge>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">👨‍👩‍👧‍👦 Family Learning Dashboard</h3>
              <p className="text-white/90 mb-4">
                Stay connected with your children's academic progress and support their learning journey.
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>{totalChildren} Children Enrolled</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5" />
                  <span>{avgPerformance}% Avg Performance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Flame className="h-5 w-5" />
                  <span>{totalActiveStreaks} Active Streaks</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-2">
                <Award className="h-12 w-12 text-yellow-300" />
              </div>
              <p className="text-sm text-white/80">Keep up the great work!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}