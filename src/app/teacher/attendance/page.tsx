/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, XCircle, Clock, Search, Save, CalendarIcon,
  Users, BookOpen, AlertCircle, Loader2, Download
} from 'lucide-react';

import { toast } from 'sonner';
import { supabase } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  enrollment_number: string;
  profile_picture_url?: string;
}

interface Program {
  id: string;
  name: string;
  code: string;
}

// "Class" in DB = the actual scheduled class students enroll in
interface ClassItem {
  id: string;
  name: string;
  code: string;
  section?: string;
  semester?: number;
  program_id: string;
  teacher_id?: string;
}

type AttendanceStatusValue = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceStatus {
  [studentId: string]: AttendanceStatusValue | null;
}

interface AttendanceNotes {
  [studentId: string]: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e.message === 'string' && e.message) return e.message;
    if (typeof e.details === 'string' && e.details) return e.details;
    if (typeof e.hint === 'string' && e.hint) return e.hint;
    if (typeof e.code === 'string' && e.code) return `Error code: ${e.code}`;
    const json = JSON.stringify(err);
    if (json !== '{}') return json;
  }
  if (typeof err === 'string' && err) return err;
  return 'An unknown error occurred';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [user, setUser]                           = useState<User | null>(null);
  const [loading, setLoading]                     = useState(true);
  const [saving, setSaving]                       = useState(false);
  const [programs, setPrograms]                   = useState<Program[]>([]);
  const [classes, setClasses]                     = useState<ClassItem[]>([]);
  const [students, setStudents]                   = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents]   = useState<Student[]>([]);

  const [selectedProgram, setSelectedProgram]     = useState<string | null>(null);
  const [selectedClass, setSelectedClass]         = useState<string | null>(null);
  const [selectedDate, setSelectedDate]           = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery]             = useState('');

  const [attendance, setAttendance]               = useState<AttendanceStatus>({});
  const [attendanceNotes, setAttendanceNotes]     = useState<AttendanceNotes>({});
  const [existingAttendance, setExistingAttendance] = useState(false);

  const [stats, setStats] = useState({
    present: 0, absent: 0, late: 0, excused: 0, unmarked: 0,
  });

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => { initializeData(); }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredStudents(students); return; }
    const q = searchQuery.toLowerCase();
    setFilteredStudents(
      students.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.enrollment_number?.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, students]);

  useEffect(() => {
    const s = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    students.forEach(st => {
      const status = attendance[st.id];
      if (status) s[status]++;
      else s.unmarked++;
    });
    setStats(s);
  }, [attendance, students]);

  useEffect(() => {
    if (selectedProgram) {
      fetchClasses(selectedProgram);
    } else {
      setClasses([]);
      setSelectedClass(null);
    }
  }, [selectedProgram]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
      checkExistingAttendance(selectedClass, selectedDate);
    } else {
      setStudents([]);
      setFilteredStudents([]);
      setAttendance({});
      setAttendanceNotes({});
      setExistingAttendance(false);
    }
  }, [selectedClass, selectedDate]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  async function initializeData() {
    try {
      setLoading(true);

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) { toast.error('Authentication error. Please log in again.'); return; }
      if (!authUser) { toast.error('Please log in to continue'); return; }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        console.error('User fetch error:', extractErrorMessage(userError));
        toast.error('Failed to load user profile');
        return;
      }

      if (userData.role !== 'teacher' && userData.role !== 'admin') {
        toast.error('Access denied. Teacher role required.');
        return;
      }

      setUser(userData);
      await fetchPrograms();
    } catch (err) {
      console.error('Init error:', extractErrorMessage(err));
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPrograms() {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, code')
        .order('name');

      if (error) { console.error('Programs error:', extractErrorMessage(error)); toast.error('Failed to load programs'); return; }
      setPrograms(data ?? []);
    } catch (err) {
      console.error('Programs error:', extractErrorMessage(err));
      toast.error('Failed to load programs');
    }
  }

  // Fetch from `classes` table (not `courses`) — students enroll in classes
  async function fetchClasses(programId: string) {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, section, semester, program_id, teacher_id')
        .eq('program_id', programId)
        .order('semester', { ascending: true })
        .order('name');

      if (error) { console.error('Classes error:', extractErrorMessage(error)); toast.error('Failed to load classes'); return; }
      setClasses(data ?? []);
    } catch (err) {
      console.error('Classes error:', extractErrorMessage(err));
      toast.error('Failed to load classes');
    }
  }

  // class_enrollments.class_id → classes.id
  // join to users to get student profile
  async function fetchStudents(classId: string) {
    try {
      const { data: enrollments, error } = await supabase
        .from('class_enrollments')
        .select(`
          student_id,
          status,
          students:users!class_enrollments_student_id_fkey (
            id,
            full_name,
            email,
            enrollment_number,
            profile_picture_url
          )
        `)
        .eq('class_id', classId)
        .eq('status', 'active');

      if (error) {
        console.error('Students error:', extractErrorMessage(error));
        toast.error('Failed to load students');
        return;
      }

      const studentData = (enrollments ?? [])
        .flatMap(e => e.students)
        .filter(Boolean) as Student[];

      setStudents(studentData);
      setFilteredStudents(studentData);
    } catch (err) {
      console.error('Students error:', extractErrorMessage(err));
      toast.error('Failed to load students');
    }
  }

  // attendance table: student_id + course_id + attendance_date (unique)
  // NOTE: attendance.course_id stores the class id (naming mismatch in DB)
  async function checkExistingAttendance(classId: string, date: string) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, status, notes')
        .eq('course_id', classId)        // attendance.course_id = the class being attended
        .eq('attendance_date', date);

      if (error) {
        console.error('Check attendance error:', extractErrorMessage(error), error);
        toast.warning(`Could not load existing attendance: ${extractErrorMessage(error)}`);
        setAttendance({});
        setAttendanceNotes({});
        setExistingAttendance(false);
        return;
      }

      if (data && data.length > 0) {
        const statusMap: AttendanceStatus = {};
        const notesMap: AttendanceNotes  = {};
        data.forEach(r => {
          statusMap[r.student_id] = r.status as AttendanceStatusValue;
          if (r.notes) notesMap[r.student_id] = r.notes;
        });
        setAttendance(statusMap);
        setAttendanceNotes(notesMap);
        setExistingAttendance(true);
        toast.info('Loaded existing attendance for this date');
      } else {
        setAttendance({});
        setAttendanceNotes({});
        setExistingAttendance(false);
      }
    } catch (err) {
      console.error('Check attendance error:', extractErrorMessage(err));
      setAttendance({});
      setAttendanceNotes({});
      setExistingAttendance(false);
      toast.warning('Could not check existing attendance. Starting fresh.');
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleAttendanceChange(studentId: string, status: AttendanceStatusValue) {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  }

  function handleNoteChange(studentId: string, note: string) {
    setAttendanceNotes(prev => ({ ...prev, [studentId]: note }));
  }

  function handleMarkAll(status: AttendanceStatusValue) {
    const next: AttendanceStatus = {};
    students.forEach(s => { next[s.id] = status; });
    setAttendance(next);
    toast.success(`Marked all students as ${status}`);
  }

  async function handleSaveAttendance() {
    if (!selectedClass) { toast.error('Please select a class'); return; }

    const markedEntries = Object.entries(attendance).filter(([, v]) => v !== null);
    if (markedEntries.length === 0) {
      toast.error('Please mark attendance for at least one student');
      return;
    }

    try {
      setSaving(true);

      const records = markedEntries.map(([studentId, status]) => ({
        student_id:      studentId,
        course_id:       selectedClass,   // attendance table column is course_id
        attendance_date: selectedDate,
        status:          status as string,
        notes:           attendanceNotes[studentId] || null,
        created_at:      new Date().toISOString(),
      }));

      // Unique constraint: (student_id, course_id, attendance_date)
      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,course_id,attendance_date' });

      if (error) {
        console.error('Save error:', extractErrorMessage(error));
        toast.error(`Failed to save: ${extractErrorMessage(error)}`);
        return;
      }

      toast.success('Attendance saved successfully');
      setExistingAttendance(true);
    } catch (err) {
      console.error('Save error:', extractErrorMessage(err));
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportAttendance() {
    if (!selectedClass || students.length === 0) { toast.error('No data to export'); return; }

    try {
      const cls  = classes.find(c => c.id === selectedClass);
      const prog = programs.find(p => p.id === selectedProgram);

      const headers = ['Roll No', 'Name', 'Email', 'Status', 'Notes'];
      const rows = students.map(s => [
        s.enrollment_number || 'N/A',
        s.full_name,
        s.email,
        attendance[s.id] || 'Not Marked',
        attendanceNotes[s.id] || '',
      ]);

      const csv = [
        `Attendance Report - ${cls?.name} (${cls?.code})`,
        `Program: ${prog?.name}`,
        `Date: ${selectedDate}`,
        '',
        headers.join(','),
        ...rows.map(r => r.map(c => `"${c}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `attendance_${cls?.code}_${selectedDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported successfully');
    } catch (err) {
      console.error('Export error:', extractErrorMessage(err));
      toast.error('Failed to export');
    }
  }

  // ── Render guards ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading attendance system...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-700">Access denied. Teacher role required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentProgram = programs.find(p => p.id === selectedProgram);
  const currentClass   = classes.find(c => c.id === selectedClass);

  const STATUS_BUTTONS = [
    { value: 'present' as const, Icon: CheckCircle, bg: 'bg-green-100',  icon: 'text-green-600',  title: 'Present'  },
    { value: 'absent'  as const, Icon: XCircle,     bg: 'bg-red-100',    icon: 'text-red-600',    title: 'Absent'   },
    { value: 'late'    as const, Icon: Clock,        bg: 'bg-yellow-100', icon: 'text-yellow-600', title: 'Late'     },
    { value: 'excused' as const, Icon: AlertCircle,  bg: 'bg-blue-100',   icon: 'text-blue-600',   title: 'Excused'  },
  ];

  const BADGE_STYLES: Record<AttendanceStatusValue, string> = {
    present: 'bg-green-50 text-green-700 border-green-300',
    absent:  'bg-red-50 text-red-700 border-red-300',
    late:    'bg-yellow-50 text-yellow-700 border-yellow-300',
    excused: 'bg-blue-50 text-blue-700 border-blue-300',
  };

  const BORDER_COLORS: Record<string, string> = {
    present: '#10b981', absent: '#ef4444', late: '#f59e0b', excused: '#3b82f6',
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-500 mt-1">Mark and manage student attendance</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-48"
            max={new Date().toISOString().split('T')[0]}
          />
          {selectedClass && students.length > 0 && (
            <Button variant="outline" onClick={handleExportAttendance}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {selectedClass && students.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Present',  value: stats.present,  color: 'text-green-600'  },
            { label: 'Absent',   value: stats.absent,   color: 'text-red-600'    },
            { label: 'Late',     value: stats.late,     color: 'text-yellow-600' },
            { label: 'Excused',  value: stats.excused,  color: 'text-blue-600'   },
            { label: 'Unmarked', value: stats.unmarked, color: 'text-gray-600'   },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Program + Class selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Programs */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <BookOpen className="mr-2 h-5 w-5 text-blue-600" />
              Select Program
            </CardTitle>
            <CardDescription>Choose the academic program</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {programs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No programs available</p>
            ) : programs.map(program => (
              <button
                key={program.id}
                onClick={() => { setSelectedProgram(program.id); setSelectedClass(null); }}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  selectedProgram === program.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{program.name}</p>
                    <p className="text-sm text-gray-500">{program.code}</p>
                  </div>
                  {selectedProgram === program.id && <CheckCircle className="h-5 w-5 text-blue-600" />}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Classes */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Users className="mr-2 h-5 w-5 text-green-600" />
              Select Class
            </CardTitle>
            <CardDescription>
              {currentProgram ? `Classes in ${currentProgram.name}` : 'Select a program first'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {!selectedProgram ? (
              <p className="text-center text-gray-500 py-8">Please select a program first</p>
            ) : classes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No classes found for this program</p>
            ) : classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => {
                  setSelectedClass(cls.id);
                  setAttendance({});
                  setAttendanceNotes({});
                  setSearchQuery('');
                }}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  selectedClass === cls.id
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{cls.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">{cls.code}</span>
                      {cls.section && (
                        <Badge variant="outline" className="text-xs">Section {cls.section}</Badge>
                      )}
                      {cls.semester && (
                        <Badge variant="outline" className="text-xs">Sem {cls.semester}</Badge>
                      )}
                    </div>
                  </div>
                  {selectedClass === cls.id && <CheckCircle className="h-5 w-5 text-green-600" />}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Attendance marking */}
      {selectedClass && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-green-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center text-xl gap-2">
                  <CalendarIcon className="h-6 w-6 text-blue-600" />
                  Mark Attendance
                  {existingAttendance && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                      Editing existing
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {currentClass?.name} ({currentClass?.code})
                  {currentClass?.section && ` · Section ${currentClass.section}`}
                  {currentClass?.semester && ` · Sem ${currentClass.semester}`}
                  {currentProgram && ` · ${currentProgram.name}`}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleMarkAll('present')} className="bg-green-50 hover:bg-green-100">
                  Mark All Present
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleMarkAll('absent')} className="bg-red-50 hover:bg-red-100">
                  Mark All Absent
                </Button>
                <Button
                  onClick={handleSaveAttendance}
                  disabled={saving || Object.values(attendance).filter(Boolean).length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save Attendance</>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Search */}
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, email, or roll number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Student list */}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery ? 'No students match your search' : 'No active students enrolled in this class'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map(student => {
                  const status = attendance[student.id] ?? null;
                  const borderColor = status ? (BORDER_COLORS[status] ?? '#e5e7eb') : '#e5e7eb';

                  return (
                    <div
                      key={student.id}
                      className="flex flex-col md:flex-row md:items-center gap-4 p-4 border-2 rounded-lg hover:bg-gray-50 transition-all"
                      style={{ borderColor }}
                    >
                      {/* Avatar + info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {student.profile_picture_url ? (
                            <img
                              src={student.profile_picture_url}
                              alt={student.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {student.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">{student.full_name}</p>
                            {student.enrollment_number && (
                              <Badge variant="outline" className="text-xs">{student.enrollment_number}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">{student.email}</p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        {/* Status buttons */}
                        <div className="flex items-center gap-2">
                          {STATUS_BUTTONS.map(({ value, Icon, bg, icon, title }) => (
                            <button
                              key={value}
                              onClick={() => handleAttendanceChange(student.id, value)}
                              title={title}
                              className={`p-3 rounded-lg transition-all ${
                                status === value ? `${bg} shadow-md` : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                            >
                              <Icon className={`h-5 w-5 ${status === value ? icon : 'text-gray-400'}`} />
                            </button>
                          ))}
                        </div>

                        {/* Badge */}
                        {status && (
                          <Badge variant="outline" className={`min-w-[80px] justify-center ${BADGE_STYLES[status]}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        )}

                        {/* Notes — shown for non-present statuses */}
                        {status && status !== 'present' && (
                          <Input
                            type="text"
                            placeholder="Add note (optional)"
                            value={attendanceNotes[student.id] || ''}
                            onChange={e => handleNoteChange(student.id, e.target.value)}
                            className="md:w-48"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!selectedClass && (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <CalendarIcon className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Mark Attendance</h3>
            <p className="text-gray-500 text-center max-w-md">
              Select a program and class above to start marking attendance for your students
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}