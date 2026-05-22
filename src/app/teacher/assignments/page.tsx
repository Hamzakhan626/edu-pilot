/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Upload, CheckCircle, Calendar, ClipboardList, Star, Plus, Eye, CheckCheck, AlertCircle, UserCheck, X, FileUp, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

// Types based on database schema
type Program = {
  id: string;
  name: string;
  code: string;
  department_id: string;
  degree: string;
};

type Semester = {
  id: string;
  name: string;
  semester_type: string;
  year: number;
  program_id: string;
  start_date: string;
  end_date: string;
  status: string;
};

type Course = {
  id: string;
  name: string;
  code: string;
  description: string;
  department_id: string;
  program_id: string;
  semester_id: string;
  teacher_id: string;
  section: string;
  credits: number;
  semester: number;
  students: number;
};

type Assignment = {
  id: string;
  class_id: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
  updated_at: string;
};

type AssignmentSubmission = {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_text: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  submitted_at: string | null;
  score: number | null;
  feedback: string | null;
  status: string;
  graded_at: string | null;
  student?: {
    id: string;
    full_name: string;
    enrollment_number: string;
  };
};

type Student = {
  id: string;
  full_name: string;
  enrollment_number: string;
  email: string;
};

type AttendanceRecord = {
  [studentId: string]: 'present' | 'absent' | 'leave';
};

type AttendanceSummary = {
  student_id: string;
  student_name: string;
  enrollment_number: string;
  total_classes: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
};

export default function TeacherAssignmentsPage() {
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [currentTeacherId, setCurrentTeacherId] = useState<string>('');
  
  const [gradingAssignmentId, setGradingAssignmentId] = useState<string | null>(null);
  const [grades, setGrades] = useState<{ [key: string]: number }>({});
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  
  const [activeTab, setActiveTab] = useState<'assignments' | 'attendance'>('assignments');
  
  // Assignment Dialog State
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxScore: '',
    file: null as File | null
  });
  const [uploadingAssignment, setUploadingAssignment] = useState(false);

  // Attendance State
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Get current user (teacher)
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user details from users table
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();
        
        if (userData) {
          setCurrentTeacherId(userData.id);
        }
      }
    };
    getCurrentUser();
  }, []);

  // Fetch programs for the teacher
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!currentTeacherId) return;
      
      setLoading(true);
      try {
        // Get programs through teacher_programs junction table
        const { data, error } = await supabase
          .from('teacher_programs')
          .select(`
            program:programs (
              id,
              name,
              code,
              department_id,
              degree
            )
          `)
          .eq('teacher_id', currentTeacherId);

        if (error) throw error;

        // Extract programs from the nested structure
        const uniquePrograms = data
          ?.map(item => item.program)
          .flat()
          .filter((program, index, self) => 
            program && self.findIndex(p => p?.id === program.id) === index
          ) as Program[];

        setPrograms(uniquePrograms || []);
      } catch (error) {
        console.error('Error fetching programs:', error);
        toast({
          title: 'Error',
          description: 'Failed to load programs',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, [currentTeacherId]);

  // Fetch semesters when program is selected
  useEffect(() => {
    const fetchSemesters = async () => {
      if (!selectedProgram) {
        setSemesters([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('semesters')
          .select('*')
          .eq('program_id', selectedProgram)
          .order('year', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSemesters(data || []);
      } catch (error) {
        console.error('Error fetching semesters:', error);
        toast({
          title: 'Error',
          description: 'Failed to load semesters',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSemesters();
  }, [selectedProgram]);

  // Fetch courses when semester is selected
  useEffect(() => {
    const fetchCourses = async () => {
      if (!selectedSemester || !currentTeacherId) {
        setCourses([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('semester_id', selectedSemester)
          .eq('teacher_id', currentTeacherId)
          .order('code');

        if (error) throw error;
        setCourses(data || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast({
          title: 'Error',
          description: 'Failed to load courses',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [selectedSemester, currentTeacherId]);

  // Fetch assignments and students when course is selected
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!selectedCourse) {
        setAssignments([]);
        setStudents([]);
        return;
      }

      setLoading(true);
      try {
        // Fetch assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .eq('class_id', selectedCourse)
          .order('created_at', { ascending: false });

        if (assignmentsError) throw assignmentsError;
        setAssignments(assignmentsData || []);

        // Fetch enrolled students
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('class_enrollments')
          .select(`
            student:users!class_enrollments_student_id_fkey (
              id,
              full_name,
              enrollment_number,
              email
            )
          `)
          .eq('class_id', selectedCourse)
          .eq('status', 'active');

        if (enrollmentsError) throw enrollmentsError;

        const studentsData = enrollmentsData
          ?.map(item => item.student)
          .filter(student => student !== null) as unknown as Student[];

        setStudents(studentsData || []);

        // Fetch attendance summary
        await fetchAttendanceSummary();
      } catch (error) {
        console.error('Error fetching course data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load course data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [selectedCourse]);

  // Fetch attendance summary
  const fetchAttendanceSummary = async () => {
    if (!selectedCourse) return;

    try {
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select(`
          student_id,
          status,
          student:users!attendance_student_id_fkey (
            full_name,
            enrollment_number
          )
        `)
        .eq('class_id', selectedCourse);

      if (error) throw error;

      // Calculate summary
      const summary: { [key: string]: AttendanceSummary } = {};

      attendanceData?.forEach(record => {
        if (!summary[record.student_id]) {
          const student = Array.isArray(record.student) ? record.student[0] : record.student;
          summary[record.student_id] = {
            student_id: record.student_id,
            student_name: student.full_name,
            enrollment_number: student.enrollment_number,
            total_classes: 0,
            present: 0,
            absent: 0,
            leave: 0,
            percentage: 0
          };
        }

        summary[record.student_id].total_classes++;
        if (record.status === 'present') summary[record.student_id].present++;
        if (record.status === 'absent') summary[record.student_id].absent++;
        if (record.status === 'leave') summary[record.student_id].leave++;
      });

      // Calculate percentages
      const summaryArray = Object.values(summary).map(s => ({
        ...s,
        percentage: s.total_classes > 0 ? (s.present / s.total_classes) * 100 : 0
      }));

      setAttendanceSummary(summaryArray);
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
    }
  };

  // Fetch submissions for an assignment
  const fetchSubmissions = async (assignmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          student:users!assignment_submissions_student_id_fkey (
            id,
            full_name,
            enrollment_number
          )
        `)
        .eq('assignment_id', assignmentId);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load submissions',
        variant: 'destructive'
      });
    }
  };

  // Create new assignment
  const handleCreateAssignment = async () => {
    if (!selectedCourse) return;

    setUploadingAssignment(true);
    try {
      let attachmentUrl = null;
      let attachmentName = null;

      // Upload file if present
      if (assignmentForm.file) {
        const fileExt = assignmentForm.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `assignments/${selectedCourse}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course-materials')
          .upload(filePath, assignmentForm.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course-materials')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        attachmentName = assignmentForm.file.name;
      }

      // Create assignment
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          class_id: selectedCourse,
          title: assignmentForm.title,
          description: assignmentForm.description,
          due_date: new Date(assignmentForm.dueDate).toISOString(),
          max_score: parseInt(assignmentForm.maxScore),
          attachment_url: attachmentUrl,
          attachment_name: attachmentName
        })
        .select()
        .single();

      if (error) throw error;

      // Create submission records for all enrolled students
      const submissionRecords = students.map(student => ({
        assignment_id: data.id,
        student_id: student.id,
        status: 'pending'
      }));

      const { error: submissionsError } = await supabase
        .from('assignment_submissions')
        .insert(submissionRecords);

      if (submissionsError) throw submissionsError;

      toast({
        title: 'Success',
        description: 'Assignment created successfully'
      });

      // Refresh assignments
      setAssignments([data, ...assignments]);
      setIsAssignmentDialogOpen(false);
      
      // Reset form
      setAssignmentForm({
        title: '',
        description: '',
        dueDate: '',
        maxScore: '',
        file: null
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create assignment',
        variant: 'destructive'
      });
    } finally {
      setUploadingAssignment(false);
    }
  };

  // Submit grades
  const handleSubmitGrades = async (assignmentId: string) => {
    setLoading(true);
    try {
      const updates = Object.entries(grades)
        .filter(([key]) => key.startsWith(assignmentId))
        .map(([key, grade]) => {
          const submissionId = key.split('-')[1];
          return {
            id: submissionId,
            score: grade,
            status: 'graded',
            graded_at: new Date().toISOString()
          };
        });

      for (const update of updates) {
        const { error } = await supabase
          .from('assignment_submissions')
          .update({
            score: update.score,
            status: update.status,
            graded_at: update.graded_at
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Grades submitted successfully'
      });

      setGradingAssignmentId(null);
      
      // Clear grades for this assignment
      const newGrades = { ...grades };
      Object.keys(newGrades).forEach(key => {
        if (key.startsWith(assignmentId)) {
          delete newGrades[key];
        }
      });
      setGrades(newGrades);

      // Refresh submissions
      await fetchSubmissions(assignmentId);
    } catch (error) {
      console.error('Error submitting grades:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit grades',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Mark attendance
  const handleMarkAttendance = async () => {
    if (!selectedCourse || !attendanceDate) return;

    setSavingAttendance(true);
    try {
      // Check if attendance already exists for this date
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id, student_id')
        .eq('class_id', selectedCourse)
        .eq('attendance_date', attendanceDate);

      const attendanceRecordsArray = Object.entries(attendanceRecords).map(([studentId, status]) => ({
        student_id: studentId,
        class_id: selectedCourse,
        attendance_date: attendanceDate,
        status: status
      }));

      // For students not marked, default to absent
      students.forEach(student => {
        if (!attendanceRecords[student.id]) {
          attendanceRecordsArray.push({
            student_id: student.id,
            class_id: selectedCourse,
            attendance_date: attendanceDate,
            status: 'absent'
          });
        }
      });

      if (existingAttendance && existingAttendance.length > 0) {
        // Update existing records
        for (const record of attendanceRecordsArray) {
          const existing = existingAttendance.find(e => e.student_id === record.student_id);
          if (existing) {
            const { error } = await supabase
              .from('attendance')
              .update({ status: record.status })
              .eq('id', existing.id);

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('attendance')
              .insert(record);

            if (error) throw error;
          }
        }
      } else {
        // Insert new records
        const { error } = await supabase
          .from('attendance')
          .insert(attendanceRecordsArray);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Attendance marked successfully'
      });

      setIsAttendanceDialogOpen(false);
      setAttendanceDate('');
      setAttendanceRecords({});

      // Refresh attendance summary
      await fetchAttendanceSummary();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark attendance',
        variant: 'destructive'
      });
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAssignmentForm(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleGradeSubmission = (submissionId: string, grade: number) => {
    setGrades(prev => ({
      ...prev,
      [submissionId]: grade
    }));
  };

  const toggleAttendance = (studentId: string, status: 'present' | 'absent' | 'leave') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? 'absent' : status
    }));
  };

  const getSubmissionStats = (assignment: Assignment) => {
    const assignmentSubmissions = submissions.filter(s => s.assignment_id === assignment.id);
    const submitted = assignmentSubmissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;
    const pending = assignmentSubmissions.filter(s => s.status === 'pending').length;
    const graded = assignmentSubmissions.filter(s => s.status === 'graded').length;
    return { submitted, pending, graded, total: assignmentSubmissions.length };
  };

  const getDaysLeft = (dueDate: string): number => {
    try {
      const due = new Date(dueDate);
      due.setHours(23, 59, 59, 999);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const selectedCourseData = courses.find(c => c.id === selectedCourse);
  const selectedProgramData = programs.find(p => p.id === selectedProgram);
  const selectedSemesterData = semesters.find(s => s.id === selectedSemester);

  // When grading assignment is set, fetch submissions
  useEffect(() => {
    if (gradingAssignmentId) {
      fetchSubmissions(gradingAssignmentId);
    }
  }, [gradingAssignmentId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Course Management</h1>
              <p className="text-gray-600 text-sm mt-1">Manage assignments and attendance</p>
            </div>
            {selectedCourse && (
              <div className="flex gap-2">
                <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Mark Attendance
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Mark Attendance</DialogTitle>
                      <DialogDescription>
                        Record attendance for {selectedCourseData?.code} - {selectedCourseData?.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={attendanceDate}
                          onChange={(e) => setAttendanceDate(e.target.value)}
                          max={getTodayDate()}
                          className="mt-1"
                        />
                      </div>

                      {attendanceDate && (
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Students</Label>
                          {students.map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{student.full_name}</p>
                                <p className="text-xs text-gray-500">{student.enrollment_number}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={attendanceRecords[student.id] === 'present' ? 'default' : 'outline'}
                                  onClick={() => toggleAttendance(student.id, 'present')}
                                  className="text-xs"
                                >
                                  Present
                                </Button>
                                <Button
                                  size="sm"
                                  variant={attendanceRecords[student.id] === 'leave' ? 'default' : 'outline'}
                                  onClick={() => toggleAttendance(student.id, 'leave')}
                                  className="text-xs"
                                >
                                  Leave
                                </Button>
                                <Button
                                  size="sm"
                                  variant={attendanceRecords[student.id] === 'absent' || !attendanceRecords[student.id] ? 'destructive' : 'outline'}
                                  onClick={() => toggleAttendance(student.id, 'absent')}
                                  className="text-xs"
                                >
                                  Absent
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleMarkAttendance} 
                          disabled={!attendanceDate || savingAttendance}
                        >
                          {savingAttendance ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Attendance
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Assignment</DialogTitle>
                      <DialogDescription>
                        Add a new assignment for {selectedCourseData?.code} - {selectedCourseData?.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Assignment Title *</Label>
                        <Input
                          placeholder="e.g., Week 1 Lab Assignment"
                          value={assignmentForm.title}
                          onChange={(e) => setAssignmentForm(prev => ({ ...prev, title: e.target.value }))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Description *</Label>
                        <Textarea
                          placeholder="Describe the assignment requirements..."
                          value={assignmentForm.description}
                          onChange={(e) => setAssignmentForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={4}
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Due Date *</Label>
                          <Input
                            type="date"
                            value={assignmentForm.dueDate}
                            onChange={(e) => setAssignmentForm(prev => ({ ...prev, dueDate: e.target.value }))}
                            min={getTodayDate()}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Total Points *</Label>
                          <Input
                            type="number"
                            placeholder="100"
                            value={assignmentForm.maxScore}
                            onChange={(e) => setAssignmentForm(prev => ({ ...prev, maxScore: e.target.value }))}
                            min="0"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Upload Assignment File (Optional)</Label>
                        <div className="mt-1">
                          <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                            <div className="text-center">
                              <FileUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">
                                {assignmentForm.file ? assignmentForm.file.name : 'Click to upload or drag and drop'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX up to 10MB</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx"
                              onChange={handleFileChange}
                            />
                          </label>
                          {assignmentForm.file && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAssignmentForm(prev => ({ ...prev, file: null }))}
                              className="mt-2 text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Remove file
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateAssignment}
                          disabled={!assignmentForm.title || !assignmentForm.description || !assignmentForm.dueDate || !assignmentForm.maxScore || uploadingAssignment}
                        >
                          {uploadingAssignment ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Create Assignment
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Selection Panel */}
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Select Course</CardTitle>
            <CardDescription>Choose program, semester, and course to manage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Program Selection */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                Step 1: Select Program
              </Label>
              {loading && !programs.length ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading programs...
                </div>
              ) : programs.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No programs available</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {programs.map(program => (
                    <Button
                      key={program.id}
                      variant={selectedProgram === program.id ? "default" : "outline"}
                      onClick={() => {
                        setSelectedProgram(program.id);
                        setSelectedSemester('');
                        setSelectedCourse('');
                      }}
                      className="text-xs sm:text-sm"
                    >
                      <span className="font-semibold">{program.code}</span>
                      <span className="hidden sm:inline ml-2 text-xs opacity-75">- {program.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Semester Selection */}
            {selectedProgram && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Step 2: Select Semester
                </Label>
                {loading && !semesters.length ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading semesters...
                  </div>
                ) : semesters.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No semesters available for this program</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {semesters.map(semester => (
                      <Button
                        key={semester.id}
                        variant={selectedSemester === semester.id ? "default" : "outline"}
                        onClick={() => {
                          setSelectedSemester(semester.id);
                          setSelectedCourse('');
                        }}
                        className="text-xs sm:text-sm"
                      >
                        {semester.name} ({semester.semester_type})
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Course Selection */}
            {selectedSemester && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Step 3: Select Course
                </Label>
                {loading && !courses.length ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading courses...
                  </div>
                ) : courses.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No courses available for this semester</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {courses.map(course => (
                      <Button
                        key={course.id}
                        variant={selectedCourse === course.id ? "default" : "outline"}
                        onClick={() => setSelectedCourse(course.id)}
                        className="text-left justify-start text-xs sm:text-sm h-auto py-3"
                      >
                        <div className="truncate w-full">
                          <div className="font-semibold">{course.code} - Section {course.section}</div>
                          <div className="text-xs opacity-75 mt-0.5">{course.name}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Breadcrumb */}
            {(selectedProgram || selectedSemester || selectedCourse) && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                  <span className="font-medium text-gray-900">Selected:</span>
                  {selectedProgramData && (
                    <>
                      <span>{selectedProgramData.code}</span>
                      {selectedSemesterData && <span className="text-gray-400">→</span>}
                    </>
                  )}
                  {selectedSemesterData && (
                    <>
                      <span>{selectedSemesterData.name}</span>
                      {selectedCourseData && <span className="text-gray-400">→</span>}
                    </>
                  )}
                  {selectedCourseData && (
                    <span className="font-medium text-gray-900">{selectedCourseData.code}</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Details & Content */}
        {selectedCourseData ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Course Header */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedCourseData.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                      <span className="flex items-center font-semibold">
                        <ClipboardList className="h-4 w-4 mr-1" />
                        {selectedCourseData.code}
                      </span>
                      <span>•</span>
                      <span>Section {selectedCourseData.section}</span>
                      <span>•</span>
                      <span>{selectedSemesterData?.name}</span>
                      <span>•</span>
                      <span>{students.length} Students</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('assignments')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'assignments'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <ClipboardList className="h-4 w-4 inline mr-2" />
                    Assignments
                  </button>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'attendance'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <UserCheck className="h-4 w-4 inline mr-2" />
                    Attendance
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Assignments Tab */}
                {activeTab === 'assignments' && (
                  <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="flex items-center p-4">
                          <div className="p-3 bg-blue-100 rounded-lg mr-4">
                            <ClipboardList className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{assignments.length}</p>
                            <p className="text-sm text-gray-500">Total Assignments</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="flex items-center p-4">
                          <div className="p-3 bg-orange-100 rounded-lg mr-4">
                            <Upload className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">
                              {assignments.reduce((acc, a) => {
                                const stats = getSubmissionStats(a);
                                return acc + stats.pending;
                              }, 0)}
                            </p>
                            <p className="text-sm text-gray-500">Pending Submissions</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="flex items-center p-4">
                          <div className="p-3 bg-green-100 rounded-lg mr-4">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">
                              {assignments.reduce((acc, a) => {
                                const stats = getSubmissionStats(a);
                                return acc + stats.graded;
                              }, 0)}
                            </p>
                            <p className="text-sm text-gray-500">Graded</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Assignments List */}
                    <div className="space-y-4">
                      {assignments.length === 0 ? (
                        <Card className="border-0 shadow-sm">
                          <CardContent className="text-center p-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                              <ClipboardList className="h-8 w-8 text-gray-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Assignments Yet</h4>
                            <p className="text-gray-500 text-sm mb-6">Get started by creating your first assignment for this course</p>
                            <Button onClick={() => setIsAssignmentDialogOpen(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create First Assignment
                            </Button>
                          </CardContent>
                        </Card>
                      ) : (
                        assignments.map(assignment => {
                          const stats = getSubmissionStats(assignment);
                          const daysLeft = getDaysLeft(assignment.due_date);
                          const isGrading = gradingAssignmentId === assignment.id;
                          const isOverdue = daysLeft < 0;
                          const isDueSoon = daysLeft >= 0 && daysLeft <= 2;

                          return (
                            <Card key={assignment.id} className="border-0 shadow-md hover:shadow-lg transition-all">
                              <CardHeader className="pb-3">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                  <div className="space-y-2 flex-1">
                                    <div className="flex items-start gap-2">
                                      <CardTitle className="text-lg sm:text-xl">{assignment.title}</CardTitle>
                                      {stats.pending > 0 && (
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                                          {stats.pending} pending
                                        </Badge>
                                      )}
                                    </div>
                                    <CardDescription className="text-sm">{assignment.description}</CardDescription>
                                    {assignment.attachment_url && (
                                      <a 
                                        href={assignment.attachment_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center text-xs text-blue-600 hover:underline"
                                      >
                                        <FileUp className="h-3 w-3 mr-1" />
                                        {assignment.attachment_name}
                                      </a>
                                    )}
                                  </div>
                                  <Badge 
                                    variant={isOverdue ? "destructive" : isDueSoon ? "default" : "secondary"}
                                    className="w-fit"
                                  >
                                    {isOverdue ? 'Overdue' : `Due ${formatDate(assignment.due_date)}`}
                                  </Badge>
                                </div>
                              </CardHeader>
                              
                              <CardContent className="space-y-4">
                                {/* Submission Stats */}
                                <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                                  <div className="text-center">
                                    <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.submitted}</p>
                                    <p className="text-xs text-gray-600">Submitted</p>
                                  </div>
                                  <div className="text-center border-x border-gray-300">
                                    <p className="text-lg sm:text-xl font-bold text-orange-600">{stats.pending}</p>
                                    <p className="text-xs text-gray-600">Pending</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-lg sm:text-xl font-bold text-green-600">{stats.graded}</p>
                                    <p className="text-xs text-gray-600">Graded</p>
                                  </div>
                                </div>

                                {/* Assignment Details */}
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center">
                                    <Star className="h-4 w-4 mr-1.5 text-yellow-500" />
                                    <span className="font-medium">{assignment.max_score}</span> points
                                  </span>
                                  <span className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1.5" />
                                    {formatDate(assignment.due_date)}
                                  </span>
                                  {!isOverdue && daysLeft >= 0 && (
                                    <span className={`flex items-center font-medium ${isDueSoon ? 'text-orange-600' : 'text-blue-600'}`}>
                                      <Clock className="h-4 w-4 mr-1.5" />
                                      {daysLeft === 0 ? 'Due today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                                    </span>
                                  )}
                                  {isOverdue && (
                                    <span className="flex items-center font-medium text-red-600">
                                      <AlertCircle className="h-4 w-4 mr-1.5" />
                                      {Math.abs(daysLeft)} day{Math.abs(daysLeft) === 1 ? '' : 's'} overdue
                                    </span>
                                  )}
                                </div>

                                {/* Grading View */}
                                {isGrading ? (
                                  <div className="space-y-4 border-t pt-4">
                                    <h4 className="font-semibold text-gray-900 flex items-center">
                                      <CheckCheck className="h-4 w-4 mr-2" />
                                      Grade Submissions
                                    </h4>
                                    <div className="space-y-3">
                                      {submissions
                                        .filter(s => s.assignment_id === assignment.id)
                                        .map((submission) => (
                                          <div key={submission.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="min-w-0 flex-1">
                                              <p className="font-medium text-gray-900 text-sm">{submission.student?.full_name}</p>
                                              <p className="text-xs text-gray-600 mt-0.5">
                                                {submission.status === 'submitted' || submission.status === 'graded'
                                                  ? `Submitted: ${formatDate(submission.submitted_at!)}`
                                                  : 'Not submitted yet'
                                                }
                                              </p>
                                            </div>
                                            {(submission.status === 'submitted' || submission.status === 'graded') && (
                                              <div className="flex items-center gap-2">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max={assignment.max_score}
                                                  placeholder="0"
                                                  value={grades[`${assignment.id}-${submission.id}`] ?? submission.score ?? ''}
                                                  onChange={(e) => handleGradeSubmission(`${assignment.id}-${submission.id}`, parseInt(e.target.value) || 0)}
                                                  className="w-20 px-3 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <span className="text-xs text-gray-500">/ {assignment.max_score}</span>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end border-t pt-4">
                                      <Button variant="outline" onClick={() => {
                                        setGradingAssignmentId(null);
                                        const newGrades = { ...grades };
                                        Object.keys(newGrades).forEach(key => {
                                          if (key.startsWith(assignment.id)) {
                                            delete newGrades[key];
                                          }
                                        });
                                        setGrades(newGrades);
                                      }}>
                                        Cancel
                                      </Button>
                                      <Button 
                                        onClick={() => handleSubmitGrades(assignment.id)}
                                        disabled={loading}
                                      >
                                        {loading ? (
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                          <CheckCheck className="h-4 w-4 mr-2" />
                                        )}
                                        Save Grades
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end border-t pt-4">
                                    {stats.submitted > 0 && (
                                      <Button 
                                        size="sm"
                                        onClick={() => setGradingAssignmentId(assignment.id)}
                                      >
                                        <CheckCheck className="h-4 w-4 mr-2" />
                                        Grade {stats.submitted} Submission{stats.submitted !== 1 ? 's' : ''}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Student Attendance</h3>
                        <p className="text-sm text-gray-600 mt-1">View and manage attendance records</p>
                      </div>
                      <Button onClick={() => setIsAttendanceDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Mark Attendance
                      </Button>
                    </div>

                    {students.length === 0 ? (
                      <Card className="border-0 shadow-sm">
                        <CardContent className="text-center p-12">
                          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                            <UserCheck className="h-8 w-8 text-gray-400" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Students Enrolled</h4>
                          <p className="text-gray-500 text-sm">There are no students enrolled in this course yet</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Roll Number
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Student Name
                                  </th>
                                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Total Classes
                                  </th>
                                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Present
                                  </th>
                                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Attendance %
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {students.map((student) => {
                                  const summary = attendanceSummary.find(a => a.student_id === student.id);
                                  const totalClasses = summary?.total_classes || 0;
                                  const present = summary?.present || 0;
                                  const percentage = summary?.percentage?.toFixed(1) || '0.0';
                                  
                                  return (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {student.enrollment_number}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {student.full_name}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                        {totalClasses}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                        {present}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <Badge 
                                          variant={parseFloat(percentage) >= 75 ? "default" : "destructive"}
                                          className={parseFloat(percentage) >= 75 ? "bg-green-100 text-green-700" : ""}
                                        >
                                          {percentage}%
                                        </Badge>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Card className="border-0 shadow-md">
            <CardContent className="text-center p-8 sm:p-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <ClipboardList className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Course</h3>
              <p className="text-gray-500 text-sm">Please select a program, semester, and course to view and manage assignments</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}