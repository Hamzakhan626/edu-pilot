// lib/mock-data.ts

export interface ClassItem {
  id: string;
  name: string;
  teacher: string;
  students: number;
  progress: number;
  nextClass: string;
  color: string;
}

export interface Assignment {
  id: string;
  title: string;
  class: string;
  dueDate: string;
  status: 'pending' | 'submitted';
  points: number;
  submitted: boolean;
  grade?: number;
}

export interface Quiz {
  id: string;
  title: string;
  class: string;
  date: string;
  duration: number;
  questions: number;
  status: 'upcoming' | 'completed';
  streak: number;
  score?: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'assignment' | 'quiz' | 'grade' | 'message';
  date: string;
  read: boolean;
}

export interface AttendanceItem {
  date: string;
  class: string;
  status: 'present' | 'absent';
  time: string;
}

export interface FeeInstallment {
  id: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending';
}

export interface Fees {
  total: number;
  paid: number;
  pending: number;
  dueDate: string;
  installments: FeeInstallment[];
}

export interface Student {
  id: string;
  name: string;
  email: string;
  attendance: number;
  grade: string;
  streak: number;
  atRisk: boolean;
}

export const mockClasses: ClassItem[] = [
  {
    id: '1',
    name: 'Advanced Mathematics',
    teacher: 'Dr. Sarah Wilson',
    students: 28,
    progress: 75,
    nextClass: '2025-01-15T10:00:00',
    color: 'bg-blue-500',
  },
  {
    id: '2',
    name: 'Physics Fundamentals',
    teacher: 'Prof. John Davis',
    students: 22,
    progress: 60,
    nextClass: '2025-01-15T14:00:00',
    color: 'bg-green-500',
  },
  {
    id: '3',
    name: 'Chemistry Lab',
    teacher: 'Dr. Emily Parker',
    students: 18,
    progress: 85,
    nextClass: '2025-01-16T09:00:00',
    color: 'bg-purple-500',
  },
];

export const mockAssignments: Assignment[] = [
  {
    id: '1',
    title: 'Calculus Problem Set',
    class: 'Advanced Mathematics',
    dueDate: '2025-01-20T23:59:00',
    status: 'pending',
    points: 100,
    submitted: false,
  },
  {
    id: '2',
    title: 'Lab Report - Pendulum Motion',
    class: 'Physics Fundamentals',
    dueDate: '2025-01-18T23:59:00',
    status: 'submitted',
    points: 85,
    submitted: true,
    grade: 92,
  },
  {
    id: '3',
    title: 'Chemical Bonding Essay',
    class: 'Chemistry Lab',
    dueDate: '2025-01-25T23:59:00',
    status: 'pending',
    points: 75,
    submitted: false,
  },
];

export const mockQuizzes: Quiz[] = [
  {
    id: '1',
    title: 'Derivatives and Integration',
    class: 'Advanced Mathematics',
    date: '2025-01-17T10:00:00',
    duration: 45,
    questions: 20,
    status: 'upcoming',
    streak: 5,
  },
  {
    id: '2',
    title: "Newton's Laws",
    class: 'Physics Fundamentals',
    date: '2025-01-14T14:00:00',
    duration: 30,
    questions: 15,
    status: 'completed',
    score: 87,
    streak: 3,
  },
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'New Assignment Posted',
    message: 'Calculus Problem Set has been posted for Advanced Mathematics',
    type: 'assignment',
    date: '2025-01-14T09:00:00',
    read: false,
  },
  {
    id: '2',
    title: 'Quiz Reminder',
    message: 'Physics quiz scheduled for tomorrow at 2:00 PM',
    type: 'quiz',
    date: '2025-01-14T08:30:00',
    read: false,
  },
  {
    id: '3',
    title: 'Grade Posted',
    message: 'Your Lab Report grade has been posted: 92/100',
    type: 'grade',
    date: '2025-01-13T16:20:00',
    read: true,
  },
];

export const mockAttendance: AttendanceItem[] = [
  {
    date: '2025-01-14',
    class: 'Advanced Mathematics',
    status: 'present',
    time: '10:00 AM',
  },
  {
    date: '2025-01-14',
    class: 'Physics Fundamentals',
    status: 'present',
    time: '2:00 PM',
  },
  {
    date: '2025-01-13',
    class: 'Chemistry Lab',
    status: 'absent',
    time: '9:00 AM',
  },
  {
    date: '2025-01-13',
    class: 'Advanced Mathematics',
    status: 'present',
    time: '10:00 AM',
  },
];

export const mockFees: Fees = {
  total: 15000,
  paid: 10000,
  pending: 5000,
  dueDate: '2025-01-30T23:59:00',
  installments: [
    { id: '1', amount: 5000, dueDate: '2024-12-31', status: 'paid' },
    { id: '2', amount: 5000, dueDate: '2025-01-30', status: 'paid' },
    { id: '3', amount: 5000, dueDate: '2025-02-28', status: 'pending' },
  ],
};

export const mockStudents: Student[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    email: 'alex@student.com',
    attendance: 92,
    grade: 'A',
    streak: 12,
    atRisk: false,
  },
  {
    id: '2',
    name: 'Emma Davis',
    email: 'emma@student.com',
    attendance: 78,
    grade: 'C+',
    streak: 3,
    atRisk: true,
  },
  {
    id: '3',
    name: 'Liam Wilson',
    email: 'liam@student.com',
    attendance: 95,
    grade: 'A+',
    streak: 18,
    atRisk: false,
  },
];
