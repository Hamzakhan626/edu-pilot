'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NotificationFiltersProps {
  filter: 'all' | 'unread' | 'read';
  onFilterChange: (value: 'all' | 'unread' | 'read') => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  totalCount: number;
  userRole: string;
}

export function NotificationFilters({
  filter,
  onFilterChange,
  typeFilter,
  onTypeFilterChange,
  totalCount,
  userRole,
}: NotificationFiltersProps) {
  
  // Different notification types based on role
  const getNotificationTypes = () => {
    const baseTypes = [
      { value: 'all', label: 'All Types' },
    ];

    const commonTypes = [
      { value: 'announcement', label: 'Announcements' },
    ];

    const roleSpecificTypes = {
      admin: [
        { value: 'attendance_marked', label: 'Attendance' },
        { value: 'quiz_created', label: 'Quizzes' },
        { value: 'fee_due', label: 'Fees' },
        { value: 'grade_published', label: 'Grades' },
        { value: 'lesson_added', label: 'Lessons' },
        { value: 'course_registration', label: 'Registrations' },
        { value: 'system_alert', label: 'System Alerts' },
      ],
      student: [
        { value: 'attendance_marked', label: 'My Attendance' },
        { value: 'quiz_created', label: 'My Quizzes' },
        { value: 'fee_due', label: 'My Fees' },
        { value: 'grade_published', label: 'My Grades' },
        { value: 'lesson_added', label: 'New Lessons' },
      ],
      teacher: [
        { value: 'attendance_marked', label: 'Class Attendance' },
        { value: 'quiz_created', label: 'My Quizzes' },
        { value: 'grade_published', label: 'Grades to Review' },
        { value: 'lesson_added', label: 'My Lessons' },
      ],
      hod: [
        { value: 'attendance_marked', label: 'Department Attendance' },
        { value: 'quiz_created', label: 'Department Quizzes' },
        { value: 'fee_due', label: 'Department Fees' },
        { value: 'grade_published', label: 'Department Grades' },
      ],
      finance: [
        { value: 'fee_due', label: 'Fee Payments' },
        { value: 'fee_paid', label: 'Payments Received' },
      ],
    };

    return [...baseTypes, ...commonTypes, ...(roleSpecificTypes[userRole as keyof typeof roleSpecificTypes] || [])];
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <Tabs value={filter} onValueChange={(v) => onFilterChange(v as typeof filter)} className="w-full md:w-auto">
        <TabsList className="bg-gray-100 border border-gray-200">
          <TabsTrigger value="all" className="data-[state=active]:bg-white">
            All ({totalCount})
          </TabsTrigger>
          <TabsTrigger value="unread" className="data-[state=active]:bg-white">
            Unread
          </TabsTrigger>
          <TabsTrigger value="read" className="data-[state=active]:bg-white">
            Read
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Select value={typeFilter} onValueChange={onTypeFilterChange}>
        <SelectTrigger className="w-full md:w-[200px] bg-white border-gray-300">
          <SelectValue placeholder="Filter by type" />
        </SelectTrigger>
        <SelectContent className="bg-white border-gray-200">
          {getNotificationTypes().map((type) => (
            <SelectItem key={type.value} value={type.value} className="text-gray-900">
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}