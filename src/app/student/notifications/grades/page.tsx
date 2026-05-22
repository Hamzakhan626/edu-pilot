/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  TrendingUp,
  Award,
  BookOpen,
  Download,
  Eye,
  Calendar
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Grade {
  id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  exam_name: string;
  exam_date: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: string;
  remarks?: string;
}

interface CoursePerformance {
  course_id: string;
  course_name: string;
  course_code: string;
  average: number;
  highest: number;
  lowest: number;
  grades: Grade[];
}

interface ExamResult {
  id: string;
  marks_obtained: number;
  remarks?: string;
  exams: {
    id: string;
    title: string;
    exam_date: string;
    total_marks: number;
    course_id: string;
    courses: {
      id: string;
      name: string;
      code: string;
    };
  };
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StudentGradesPage() {
  const { toast } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [coursePerformance, setCoursePerformance] = useState<CoursePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallGPA, setOverallGPA] = useState(0);
  const [selectedSemester, setSelectedSemester] = useState<string>('all');

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get exam results
      const { data: results, error } = await supabase
        .from('exam_results')
        .select(`
          id,
          marks_obtained,
          remarks,
          exams (
            id,
            title,
            exam_date,
            total_marks,
            course_id,
            courses (
              id,
              name,
              code
            )
          )
        `)
        .eq('student_id', user.id)
        .order('exam_date', { ascending: false });

      if (error) throw error;

      const formattedGrades = (results as unknown as ExamResult[])?.map(result => {
        const percentage = (result.marks_obtained / result.exams.total_marks) * 100;
        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';

        return {
          id: result.id,
          course_id: result.exams.courses.id,
          course_name: result.exams.courses.name,
          course_code: result.exams.courses.code,
          exam_name: result.exams.title,
          exam_date: result.exams.exam_date,
          marks_obtained: result.marks_obtained,
          total_marks: result.exams.total_marks,
          percentage,
          grade,
          remarks: result.remarks
        };
      }) || [];

      setGrades(formattedGrades);

      // Calculate course-wise performance
      const courseMap = new Map<string, Grade[]>();
      formattedGrades.forEach(grade => {
        if (!courseMap.has(grade.course_id)) {
          courseMap.set(grade.course_id, []);
        }
        courseMap.get(grade.course_id)!.push(grade);
      });

      const performance = Array.from(courseMap.entries()).map(([courseId, courseGrades]) => {
        const percentages = courseGrades.map(g => g.percentage);
        return {
          course_id: courseId,
          course_name: courseGrades[0].course_name,
          course_code: courseGrades[0].course_code,
          average: percentages.reduce((a, b) => a + b, 0) / percentages.length,
          highest: Math.max(...percentages),
          lowest: Math.min(...percentages),
          grades: courseGrades
        };
      });

      setCoursePerformance(performance);

      // Calculate overall GPA (simplified)
      const totalPercentage = formattedGrades.reduce((sum, g) => sum + g.percentage, 0);
      const avgPercentage = formattedGrades.length > 0 ? totalPercentage / formattedGrades.length : 0;
      
      if (avgPercentage >= 90) setOverallGPA(4.0);
      else if (avgPercentage >= 80) setOverallGPA(3.5);
      else if (avgPercentage >= 70) setOverallGPA(3.0);
      else if (avgPercentage >= 60) setOverallGPA(2.5);
      else if (avgPercentage >= 50) setOverallGPA(2.0);
      else setOverallGPA(1.0);

    } catch (error) {
      console.error('Error fetching grades:', error);
      toast({
        title: 'Error',
        description: 'Failed to load grades',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeBadge = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800 border-green-200';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const filteredGrades = selectedSemester === 'all' 
    ? grades 
    : grades.filter(g => g.course_name.includes(selectedSemester));

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl bg-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Grades</h1>
          <p className="text-gray-600 mt-1">
            View your academic performance across all courses
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            // Export functionality
          }}
        >
          <Download className="h-4 w-4" />
          Download Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Overall GPA</p>
                <p className="text-3xl font-bold text-blue-900">{overallGPA.toFixed(2)}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Average Percentage</p>
                <p className="text-3xl font-bold text-green-900">
                  {grades.length > 0 
                    ? (grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length).toFixed(1)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Total Exams</p>
                <p className="text-3xl font-bold text-purple-900">{grades.length}</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course-wise Performance */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Performance</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {coursePerformance.map((course) => (
          <Card key={course.course_id} className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200 py-3">
              <div>
                <h3 className="font-semibold text-gray-900">{course.course_name}</h3>
                <p className="text-sm text-gray-500">{course.course_code}</p>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Average</p>
                  <p className="text-lg font-bold text-blue-600">{course.average.toFixed(1)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Highest</p>
                  <p className="text-lg font-bold text-green-600">{course.highest.toFixed(1)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Lowest</p>
                  <p className="text-lg font-bold text-yellow-600">{course.lowest.toFixed(1)}%</p>
                </div>
              </div>
              <Progress value={course.average} className="h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grade Table */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Exam Results</CardTitle>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {coursePerformance.map(c => (
                  <SelectItem key={c.course_id} value={c.course_name}>
                    {c.course_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No grades found
                  </TableCell>
                </TableRow>
              ) : (
                filteredGrades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell>
                      {format(new Date(grade.exam_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{grade.course_code}</p>
                        <p className="text-xs text-gray-500">{grade.course_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{grade.exam_name}</TableCell>
                    <TableCell>
                      <span className="font-medium">{grade.marks_obtained}</span>
                      <span className="text-gray-500">/{grade.total_marks}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${getGradeColor(grade.grade)}`}>
                        {grade.percentage.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getGradeBadge(grade.grade)}>
                        {grade.grade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">{grade.remarks || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}