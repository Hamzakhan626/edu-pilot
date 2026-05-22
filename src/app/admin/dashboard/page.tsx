'use client';

import { AdminDashboard } from '@/components/dashboard/admin-dashboard';

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <AdminDashboard />
      </div>
    </div>
  );
}