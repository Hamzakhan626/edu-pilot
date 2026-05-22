/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
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
  X,
  Save,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface NewUserForm {
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: Status;
  password: string;
  confirmPassword: string;
  address: string;
  emergencyContact: string;
  department_id: string;
}

export default function RolesUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<NewUserForm>({
    name: '',
    email: '',
    phone: '',
    role: 'student',
    status: 'active',
    password: '',
    confirmPassword: '',
    address: '',
    emergencyContact: '',
    department_id: '',
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof NewUserForm, string>>
  >({});

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

  const handleInputChange = (field: keyof NewUserForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleRoleChange = (value: Role) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
      // keep department if switching between dept-based roles, else reset
      department_id:
        value === 'student' || value === 'teacher' || value === 'hod'
          ? prev.department_id
          : '',
    }));
    if (errors.role) {
      setErrors((prev) => ({ ...prev, role: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof NewUserForm, string>> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Department required for student, teacher, HOD
    if (
      (formData.role === 'student' ||
        formData.role === 'teacher' ||
        formData.role === 'hod') &&
      !formData.department_id
    ) {
      newErrors.department_id = 'Department is required for this role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setCreating(true);
      setError(null);

      // 1) Create auth user
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const authUser = signUpData.user;
      if (!authUser) {
        setError('Failed to create auth user.');
        return;
      }

      // 2) Insert into public.users
      const insertData: any = {
        id: authUser.id,
        email: formData.email,
        full_name: formData.name,
        role: formData.role,
        phone: formData.phone || null,
        address: formData.address || null,
        // if you later add semester/enrollment_number here, do it consistently
      };

      if (
        (formData.role === 'student' ||
          formData.role === 'teacher' ||
          formData.role === 'hod') &&
        formData.department_id
      ) {
        insertData.department_id = formData.department_id;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('users')
        .insert([insertData])
        .select()
        .single();

      if (insertError) {
        console.error(insertError);
        setError(insertError.message);
        return;
      }

      const row = inserted as UserRow;

      const newUser: User = {
        id: row.id,
        name: row.full_name,
        email: row.email,
        phone: row.phone ?? '',
        role: row.role,
        status: 'active',
        joinedDate: row.created_at?.split('T')[0] ?? '',
        lastActive: 'Just now',
      };

      setUsers((prev) => [newUser, ...prev]);
      setShowAddUserModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'student',
        status: 'active',
        password: '',
        confirmPassword: '',
        address: '',
        emergencyContact: '',
        department_id: '',
      });
      setErrors({});
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddUserModal(false);
    setErrors({});
  };

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
        <Button className="border" onClick={() => setShowAddUserModal(true)}>
          <UserPlus className="mr-2 h-4 w-4 " />
          Add New User
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 h-screen">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Add New User
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Fill in the details to create a new user account
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter full name"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange('name', e.target.value)
                        }
                        className={errors.name ? 'border-red-500' : ''}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500">{errors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange('email', e.target.value)
                        }
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        placeholder="+92 3XX XXXXXXX"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange('phone', e.target.value)
                        }
                        className={errors.phone ? 'border-red-500' : ''}
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-500">{errors.phone}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">
                        Emergency Contact
                      </Label>
                      <Input
                        id="emergencyContact"
                        placeholder="+92 3XX XXXXXXX"
                        value={formData.emergencyContact}
                        onChange={(e) =>
                          handleInputChange(
                            'emergencyContact',
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter complete address"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange('address', e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                </div>

                {/* Role & Access */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-purple-600" />
                    Role & Access
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">User Role *</Label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) =>
                          handleRoleChange(e.target.value as Role)
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                        <option value="parent">Parent</option>
                        <option value="hr">HR</option>
                        <option value="hod">HOD</option>
                        <option value="finance">Finance</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Account Status *</Label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) =>
                          handleInputChange('status', e.target.value as Status)
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  {/* Department selection for student/teacher/HOD */}
                  {(formData.role === 'student' ||
                    formData.role === 'teacher' ||
                    formData.role === 'hod') && (
                    <div className="space-y-2">
                      <Label htmlFor="department">
                        Department *
                      </Label>
                      <select
                        id="department"
                        value={formData.department_id}
                        onChange={(e) =>
                          handleInputChange('department_id', e.target.value)
                        }
                        className={`w-full px-3 py-2 border rounded-lg bg-white ${
                          errors.department_id ? 'border-red-500' : ''
                        }`}
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}{' '}
                            {dept.code ? `(${dept.code})` : ''}
                          </option>
                        ))}
                      </select>
                      {errors.department_id && (
                        <p className="text-xs text-red-500">
                          {errors.department_id}
                        </p>
                      )}
                      {formData.role === 'hod' && (
                        <p className="text-xs text-gray-500">
                          This user will be assigned as Head of Department for
                          the selected department.
                        </p>
                      )}
                      {(formData.role === 'student' ||
                        formData.role === 'teacher') && (
                        <p className="text-xs text-gray-500">
                          This defines the department this{' '}
                          {formData.role} belongs to. Detailed
                          program/semester is managed in the dedicated
                          admin create-user page.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Security */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-red-600" />
                    Security
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange('password', e.target.value)
                        }
                        className={errors.password ? 'border-red-500' : ''}
                      />
                      {errors.password && (
                        <p className="text-xs text-red-500">
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm Password *
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          handleInputChange(
                            'confirmPassword',
                            e.target.value,
                          )
                        }
                        className={
                          errors.confirmPassword ? 'border-red-500' : ''
                        }
                      />
                      {errors.confirmPassword && (
                        <p className="text-xs text-red-500">
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={creating}>
                {creating ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </div>
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
