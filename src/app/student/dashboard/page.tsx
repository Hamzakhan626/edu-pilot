'use client';

import { StudentDashboard } from '@/components/dashboard/student-dashboard';

export default function StudentDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <StudentDashboard />
      </div>
    </div>
  );
}