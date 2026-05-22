'use client';

import { TeacherDashboard } from '@/components/dashboard/teacher-dashboard';

export default function TeacherDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <TeacherDashboard />
      </div>
    </div>
  );
}