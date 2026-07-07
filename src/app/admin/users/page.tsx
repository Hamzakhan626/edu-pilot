/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // added for navigation
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserPlus,
  Shield,
  GraduationCap,
  BookOpen,
  Search,
  MoreVertical,
  Edit,
  Mail,
  Phone,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type Role =
  | 'student'
  | 'teacher'
  | 'admin'
  | 'parent'
  | 'hr'
  | 'hod'
  | 'finance'
  | 'staff';

type Status = 'active' | 'inactive' | 'suspended';

interface Department {
  id: string;
  name: string;
  code?: string | null;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  address: string | null;
  created_at: string;
  updated_at: string;
  semester: number | null;
  enrollment_number: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: Status;
  joinedDate: string;
  lastActive: string;
}

export default function RolesUsersPage() {
  const router = useRouter(); // used to navigate to create page
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No more modal states, form states, or validation – all removed

  const roleColors: Record<Role, string> = {
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
    teacher: 'bg-blue-100 text-blue-700 border-blue-200',
    student: 'bg-green-100 text-green-700 border-green-200',
    parent: 'bg-orange-100 text-orange-700 border-orange-200',
    hr: 'bg-pink-100 text-pink-700 border-pink-200',
    hod: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    finance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    staff: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const statusColors: Record<Status, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-700',
  };

  // Load users and departments from Supabase
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersResult, deptResult] = await Promise.all([
        supabase
          .from('users')
          .select(
            `
            id,
            email,
            full_name,
            phone,
            role,
            address,
            created_at,
            updated_at,
            semester,
            enrollment_number
          `,
          )
          .order('created_at', { ascending: false }),
        supabase.from('departments').select('id, name, code'),
      ]);

      if (usersResult.error) {
        setError('Failed to load users.');
        console.error(usersResult.error);
      } else {
        const mapped: User[] =
          (usersResult.data as UserRow[] | null)?.map((u) => {
            const name = u.full_name;
            const joinedDate = u.created_at?.split('T')[0] ?? '';
            const lastActive = 'Active';
            const status: Status = 'active';

            return {
              id: u.id,
              name,
              email: u.email,
              phone: u.phone ?? '',
              role: u.role,
              status,
              joinedDate,
              lastActive,
            };
          }) ?? [];

        setUsers(mapped);
      }

      if (deptResult.error) {
        console.error('Failed to load departments:', deptResult.error);
      } else {
        setDepartments(deptResult.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Statistics from loaded users
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    teachers: users.filter((u) => u.role === 'teacher').length,
    students: users.filter((u) => u.role === 'student').length,
    parents: users.filter((u) => u.role === 'parent').length,
    active: users.filter((u) => u.status === 'active').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
    suspended: users.filter((u) => u.status === 'suspended').length,
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);

    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus =
      selectedStatus === 'all' || user.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles & Users</h1>
          <p className="text-gray-500 mt-1">
            Manage user accounts and role assignments
          </p>
        </div>
        {/* Button now navigates to the dedicated create page */}
        <Button
          className="border"
          onClick={() => router.push('/admin/users/create')}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-purple-100 rounded-xl mr-4">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.admins}</p>
              <p className="text-sm text-gray-500">Admins</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.teachers}</p>
              <p className="text-sm text-gray-500">Teachers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <GraduationCap className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.students}</p>
              <p className="text-sm text-gray-500">Students</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Search and filter users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="hr">HR</option>
              <option value="hod">HOD</option>
              <option value="finance">Finance</option>
              <option value="staff">Staff</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading users...
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 border rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">
                            {user.name}
                          </h3>
                          <Badge className={roleColors[user.role]}>
                            {user.role.charAt(0).toUpperCase() +
                              user.role.slice(1)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={statusColors[user.status]}
                          >
                            {user.status.charAt(0).toUpperCase() +
                              user.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{user.phone}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                          <span>Joined: {user.joinedDate}</span>
                          <span>Last active: {user.lastActive}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {filteredUsers.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No users found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}