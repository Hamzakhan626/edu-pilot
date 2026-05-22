/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, FileText } from 'lucide-react';

interface Course {
  id: number;
  title: string;
  code: string;
  section: string;
  students: number;
  modules: number;
  lessons: number;
  avgMastery: number;
}

interface CoursesGridProps {
  courses: Course[];
  onViewCourse: (course: Course) => void;
}

export function CoursesGrid({ courses, onViewCourse }: CoursesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <Card
          key={course.id}
          className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onViewCourse(course)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{course.title}</CardTitle>
                <CardDescription>{course.code}</CardDescription>
              </div>
              <Badge variant="outline">Sec. {course.section}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Students
                </span>
                <span className="font-semibold">{course.students}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Lessons
                </span>
                <span className="font-semibold">{course.lessons}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Avg Mastery</span>
                <span className={`font-semibold ${course.avgMastery >= 75 ? 'text-green-600' : 'text-orange-600'}`}>
                  {course.avgMastery}%
                </span>
              </div>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
              Manage Course
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
