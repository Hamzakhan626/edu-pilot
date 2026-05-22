/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Plus, BookOpen, HelpCircle, Users } from 'lucide-react';

interface Course {
  id: number;
  title: string;
  code: string;
  section: string;
  students: number;
  modules: number;
  lessons: number;
  quizzes: number;
  avgMastery: number;
}

interface CourseDetailModalProps {
  course: Course;
  onClose: () => void;
}

export function CourseDetailModal({ course, onClose }: CourseDetailModalProps) {
  const [activeTab, setActiveTab] = useState('modules');

  // Mock modules and lessons data (FR-6, FR-7)
  const modules = [
    {
      id: 1,
      title: 'Module 1: Foundations',
      lessons: 3,
      quizzes: 2,
      status: 'Published'
    },
    {
      id: 2,
      title: 'Module 2: Advanced Topics',
      lessons: 4,
      quizzes: 2,
      status: 'Published'
    },
    {
      id: 3,
      title: 'Module 3: Practical Applications',
      lessons: 3,
      quizzes: 1,
      status: 'Draft'
    }
  ];

  const lessons = [
    {
      id: 1,
      title: 'Lesson 1.1: Introduction',
      module: 'Module 1',
      duration: 8,
      version: 2,
      status: 'Published'
    },
    {
      id: 2,
      title: 'Lesson 2.1: Advanced Concepts',
      module: 'Module 2',
      duration: 12,
      version: 1,
      status: 'Published'
    }
  ];

  const quizzes = [
    {
      id: 1,
      title: 'Quick Quiz 1.1',
      module: 'Module 1',
      questions: 5,
      avgScore: 78,
      attempts: 145
    },
    {
      id: 2,
      title: 'Assessment 2.1',
      module: 'Module 2',
      questions: 8,
      avgScore: 72,
      attempts: 98
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{course.title}</h2>
            <p className="text-sm text-gray-600">{course.code} | Section {course.section}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Course Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{course.students}</p>
              <p className="text-xs text-gray-600">Students</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{course.modules}</p>
              <p className="text-xs text-gray-600">Modules</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{course.lessons}</p>
              <p className="text-xs text-gray-600">Lessons</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{course.avgMastery}%</p>
              <p className="text-xs text-gray-600">Mastery</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            </TabsList>

            {/* Modules Tab */}
            <TabsContent value="modules" className="mt-4 space-y-3">
              <Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Module
              </Button>
              {modules.map((module) => (
                <Card key={module.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{module.title}</h4>
                        <p className="text-sm text-gray-600">{module.lessons} lessons • {module.quizzes} quizzes</p>
                      </div>
                      <Badge variant={module.status === 'Published' ? 'default' : 'outline'}>
                        {module.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Lessons Tab */}
            <TabsContent value="lessons" className="mt-4 space-y-3">
              <Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Micro-Lecture
              </Button>
              {lessons.map((lesson) => (
                <Card key={lesson.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 ml-6">{lesson.duration} min • v{lesson.version}</p>
                      </div>
                      <Badge variant="outline">{lesson.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Quizzes Tab */}
            <TabsContent value="quizzes" className="mt-4 space-y-3">
              <Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Quiz
              </Button>
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-purple-600" />
                          <h4 className="font-semibold text-gray-900">{quiz.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 ml-6">{quiz.questions} questions • {quiz.attempts} attempts</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{quiz.avgScore}%</p>
                        <p className="text-xs text-gray-600">avg score</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
