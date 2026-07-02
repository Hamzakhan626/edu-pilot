// /* eslint-disable @typescript-eslint/no-explicit-any */
// 'use client';

// import { useState, useEffect } from 'react';
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Input } from '@/components/ui/input';
// import {
//   Users,
//   UserPlus,
//   Shield,
//   GraduationCap,
//   BookOpen,
//   Search,
//   MoreVertical,
//   Edit,
//   Mail,
//   Phone,
//   X,
//   Save,
// } from 'lucide-react';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import { supabase } from '@/lib/supabase/client';

// type Role =
//   | 'student'
//   | 'teacher'
//   | 'admin'
//   | 'parent'
//   | 'hr'
//   | 'hod'
//   | 'finance'
//   | 'staff';

// type Status = 'active' | 'inactive' | 'suspended';

// interface Department {
//   id: string;
//   name: string;
//   code?: string | null;
// }

// interface UserRow {
//   id: string;
//   email: string;
//   full_name: string;
//   phone: string | null;
//   role: Role;
//   address: string | null;
//   created_at: string;
//   updated_at: string;
//   semester: number | null;
//   enrollment_number: string | null;
// }

// interface User {
//   id: string;
//   name: string;
//   email: string;
//   phone: string;
//   role: Role;
//   status: Status;
//   joinedDate: string;
//   lastActive: string;
// }

// interface NewUserForm {
//   name: string;
//   email: string;
//   phone: string;
//   role: Role;
//   status: Status;
//   password: string;
//   confirmPassword: string;
//   address: string;
//   emergencyContact: string;
//   department_id: string;
// }

// export default function RolesUsersPage() {
//   const [users, setUsers] = useState<User[]>([]);
//   const [departments, setDepartments] = useState<Department[]>([]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedRole, setSelectedRole] = useState<string>('all');
//   const [selectedStatus, setSelectedStatus] = useState<string>('all');
//   const [showAddUserModal, setShowAddUserModal] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [creating, setCreating] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const [formData, setFormData] = useState<NewUserForm>({
//     name: '',
//     email: '',
//     phone: '',
//     role: 'student',
//     status: 'active',
//     password: '',
//     confirmPassword: '',
//     address: '',
//     emergencyContact: '',
//     department_id: '',
//   });

//   const [errors, setErrors] = useState<
//     Partial<Record<keyof NewUserForm, string>>
//   >({});

//   const roleColors: Record<Role, string> = {
//     admin: 'bg-purple-100 text-purple-700 border-purple-200',
//     teacher: 'bg-blue-100 text-blue-700 border-blue-200',
//     student: 'bg-green-100 text-green-700 border-green-200',
//     parent: 'bg-orange-100 text-orange-700 border-orange-200',
//     hr: 'bg-pink-100 text-pink-700 border-pink-200',
//     hod: 'bg-indigo-100 text-indigo-700 border-indigo-200',
//     finance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
//     staff: 'bg-slate-100 text-slate-700 border-slate-200',
//   };

//   const statusColors: Record<Status, string> = {
//     active: 'bg-green-100 text-green-700',
//     inactive: 'bg-gray-100 text-gray-700',
//     suspended: 'bg-red-100 text-red-700',
//   };

//   const handleInputChange = (field: keyof NewUserForm, value: string) => {
//     setFormData((prev) => ({ ...prev, [field]: value }));
//     if (errors[field]) {
//       setErrors((prev) => ({ ...prev, [field]: '' }));
//     }
//   };

//   const handleRoleChange = (value: Role) => {
//     setFormData((prev) => ({
//       ...prev,
//       role: value,
//       // keep department if switching between dept-based roles, else reset
//       department_id:
//         value === 'student' || value === 'teacher' || value === 'hod'
//           ? prev.department_id
//           : '',
//     }));
//     if (errors.role) {
//       setErrors((prev) => ({ ...prev, role: '' }));
//     }
//   };

//   const validateForm = (): boolean => {
//     const newErrors: Partial<Record<keyof NewUserForm, string>> = {};

//     if (!formData.name.trim()) newErrors.name = 'Name is required';
//     if (!formData.email.trim()) {
//       newErrors.email = 'Email is required';
//     } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
//       newErrors.email = 'Invalid email format';
//     }
//     if (!formData.phone.trim()) newErrors.phone = 'Phone is required';

//     if (!formData.password) {
//       newErrors.password = 'Password is required';
//     } else if (formData.password.length < 8) {
//       newErrors.password = 'Password must be at least 8 characters';
//     }
//     if (formData.password !== formData.confirmPassword) {
//       newErrors.confirmPassword = 'Passwords do not match';
//     }

//     // Department required for student, teacher, HOD
//     if (
//       (formData.role === 'student' ||
//         formData.role === 'teacher' ||
//         formData.role === 'hod') &&
//       !formData.department_id
//     ) {
//       newErrors.department_id = 'Department is required for this role';
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   // Load users and departments from Supabase
//   const fetchData = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       const [usersResult, deptResult] = await Promise.all([
//         supabase
//           .from('users')
//           .select(
//             `
//             id,
//             email,
//             full_name,
//             phone,
//             role,
//             address,
//             created_at,
//             updated_at,
//             semester,
//             enrollment_number
//           `,
//           )
//           .order('created_at', { ascending: false }),
//         supabase.from('departments').select('id, name, code'),
//       ]);

//       if (usersResult.error) {
//         setError('Failed to load users.');
//         console.error(usersResult.error);
//       } else {
//         const mapped: User[] =
//           (usersResult.data as UserRow[] | null)?.map((u) => {
//             const name = u.full_name;
//             const joinedDate = u.created_at?.split('T')[0] ?? '';
//             const lastActive = 'Active';
//             const status: Status = 'active';

//             return {
//               id: u.id,
//               name,
//               email: u.email,
//               phone: u.phone ?? '',
//               role: u.role,
//               status,
//               joinedDate,
//               lastActive,
//             };
//           }) ?? [];

//         setUsers(mapped);
//       }

//       if (deptResult.error) {
//         console.error('Failed to load departments:', deptResult.error);
//       } else {
//         setDepartments(deptResult.data || []);
//       }
//     } catch (err) {
//       console.error(err);
//       setError('Failed to load data.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     void fetchData();
//   }, []);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     try {
//       setCreating(true);
//       setError(null);

//       // 1) Create auth user
//       const { data: signUpData, error: signUpError } =
//         await supabase.auth.signUp({
//           email: formData.email,
//           password: formData.password,
//         });

//       if (signUpError) {
//         setError(signUpError.message);
//         return;
//       }

//       const authUser = signUpData.user;
//       if (!authUser) {
//         setError('Failed to create auth user.');
//         return;
//       }

//       // 2) Insert into public.users
//       const insertData: any = {
//         id: authUser.id,
//         email: formData.email,
//         full_name: formData.name,
//         role: formData.role,
//         phone: formData.phone || null,
//         address: formData.address || null,
//         // if you later add semester/enrollment_number here, do it consistently
//       };

//       if (
//         (formData.role === 'student' ||
//           formData.role === 'teacher' ||
//           formData.role === 'hod') &&
//         formData.department_id
//       ) {
//         insertData.department_id = formData.department_id;
//       }

//       const { data: inserted, error: insertError } = await supabase
//         .from('users')
//         .insert([insertData])
//         .select()
//         .single();

//       if (insertError) {
//         console.error(insertError);
//         setError(insertError.message);
//         return;
//       }

//       const row = inserted as UserRow;

//       const newUser: User = {
//         id: row.id,
//         name: row.full_name,
//         email: row.email,
//         phone: row.phone ?? '',
//         role: row.role,
//         status: 'active',
//         joinedDate: row.created_at?.split('T')[0] ?? '',
//         lastActive: 'Just now',
//       };

//       setUsers((prev) => [newUser, ...prev]);
//       setShowAddUserModal(false);
//       setFormData({
//         name: '',
//         email: '',
//         phone: '',
//         role: 'student',
//         status: 'active',
//         password: '',
//         confirmPassword: '',
//         address: '',
//         emergencyContact: '',
//         department_id: '',
//       });
//       setErrors({});
//     } catch (err: any) {
//       console.error(err);
//       setError(err.message ?? 'Failed to create user.');
//     } finally {
//       setCreating(false);
//     }
//   };

//   const handleCloseModal = () => {
//     setShowAddUserModal(false);
//     setErrors({});
//   };

//   // Statistics from loaded users
//   const stats = {
//     total: users.length,
//     admins: users.filter((u) => u.role === 'admin').length,
//     teachers: users.filter((u) => u.role === 'teacher').length,
//     students: users.filter((u) => u.role === 'student').length,
//     parents: users.filter((u) => u.role === 'parent').length,
//     active: users.filter((u) => u.status === 'active').length,
//     inactive: users.filter((u) => u.status === 'inactive').length,
//     suspended: users.filter((u) => u.status === 'suspended').length,
//   };

//   const filteredUsers = users.filter((user) => {
//     const matchesSearch =
//       user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       user.phone.includes(searchQuery);

//     const matchesRole = selectedRole === 'all' || user.role === selectedRole;
//     const matchesStatus =
//       selectedStatus === 'all' || user.status === selectedStatus;

//     return matchesSearch && matchesRole && matchesStatus;
//   });

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-900">Roles & Users</h1>
//           <p className="text-gray-500 mt-1">
//             Manage user accounts and role assignments
//           </p>
//         </div>
//         <Button className="border" onClick={() => setShowAddUserModal(true)}>
//           <UserPlus className="mr-2 h-4 w-4 " />
//           Add New User
//         </Button>
//       </div>

//       {error && (
//         <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
//           {error}
//         </div>
//       )}

//       {/* Add User Modal */}
//       {showAddUserModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 h-screen">
//           <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
//             {/* Header */}
//             <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
//               <div>
//                 <h2 className="text-2xl font-bold text-gray-900">
//                   Add New User
//                 </h2>
//                 <p className="text-sm text-gray-500 mt-1">
//                   Fill in the details to create a new user account
//                 </p>
//               </div>
//               <Button variant="outline" size="sm" onClick={handleCloseModal}>
//                 <X className="h-4 w-4" />
//               </Button>
//             </div>

//             {/* Scrollable body */}
//             <div className="flex-1 overflow-y-auto">
//               <form onSubmit={handleSubmit} className="p-6 space-y-6">
//                 {/* Basic Information */}
//                 <div className="space-y-4">
//                   <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                     <Users className="h-5 w-5 mr-2 text-blue-600" />
//                     Basic Information
//                   </h3>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div className="space-y-2">
//                       <Label htmlFor="name">Full Name *</Label>
//                       <Input
//                         id="name"
//                         placeholder="Enter full name"
//                         value={formData.name}
//                         onChange={(e) =>
//                           handleInputChange('name', e.target.value)
//                         }
//                         className={errors.name ? 'border-red-500' : ''}
//                       />
//                       {errors.name && (
//                         <p className="text-xs text-red-500">{errors.name}</p>
//                       )}
//                     </div>

//                     <div className="space-y-2">
//                       <Label htmlFor="email">Email Address *</Label>
//                       <Input
//                         id="email"
//                         type="email"
//                         placeholder="user@example.com"
//                         value={formData.email}
//                         onChange={(e) =>
//                           handleInputChange('email', e.target.value)
//                         }
//                         className={errors.email ? 'border-red-500' : ''}
//                       />
//                       {errors.email && (
//                         <p className="text-xs text-red-500">{errors.email}</p>
//                       )}
//                     </div>

//                     <div className="space-y-2">
//                       <Label htmlFor="phone">Phone Number *</Label>
//                       <Input
//                         id="phone"
//                         placeholder="+92 3XX XXXXXXX"
//                         value={formData.phone}
//                         onChange={(e) =>
//                           handleInputChange('phone', e.target.value)
//                         }
//                         className={errors.phone ? 'border-red-500' : ''}
//                       />
//                       {errors.phone && (
//                         <p className="text-xs text-red-500">{errors.phone}</p>
//                       )}
//                     </div>

//                     <div className="space-y-2">
//                       <Label htmlFor="emergencyContact">
//                         Emergency Contact
//                       </Label>
//                       <Input
//                         id="emergencyContact"
//                         placeholder="+92 3XX XXXXXXX"
//                         value={formData.emergencyContact}
//                         onChange={(e) =>
//                           handleInputChange(
//                             'emergencyContact',
//                             e.target.value,
//                           )
//                         }
//                       />
//                     </div>
//                   </div>

//                   <div className="space-y-2">
//                     <Label htmlFor="address">Address</Label>
//                     <Textarea
//                       id="address"
//                       placeholder="Enter complete address"
//                       value={formData.address}
//                       onChange={(e) =>
//                         handleInputChange('address', e.target.value)
//                       }
//                       rows={2}
//                     />
//                   </div>
//                 </div>

//                 {/* Role & Access */}
//                 <div className="space-y-4">
//                   <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                     <Shield className="h-5 w-5 mr-2 text-purple-600" />
//                     Role & Access
//                   </h3>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div className="space-y-2">
//                       <Label htmlFor="role">User Role *</Label>
//                       <select
//                         id="role"
//                         value={formData.role}
//                         onChange={(e) =>
//                           handleRoleChange(e.target.value as Role)
//                         }
//                         className="w-full px-3 py-2 border rounded-lg bg-white"
//                       >
//                         <option value="student">Student</option>
//                         <option value="teacher">Teacher</option>
//                         <option value="admin">Admin</option>
//                         <option value="parent">Parent</option>
//                         <option value="hr">HR</option>
//                         <option value="hod">HOD</option>
//                         <option value="finance">Finance</option>
//                         <option value="staff">Staff</option>
//                       </select>
//                     </div>

//                     <div className="space-y-2">
//                       <Label htmlFor="status">Account Status *</Label>
//                       <select
//                         id="status"
//                         value={formData.status}
//                         onChange={(e) =>
//                           handleInputChange('status', e.target.value as Status)
//                         }
//                         className="w-full px-3 py-2 border rounded-lg bg-white"
//                       >
//                         <option value="active">Active</option>
//                         <option value="inactive">Inactive</option>
//                         <option value="suspended">Suspended</option>
//                       </select>
//                     </div>
//                   </div>

//                   {/* Department selection for student/teacher/HOD */}
//                   {(formData.role === 'student' ||
//                     formData.role === 'teacher' ||
//                     formData.role === 'hod') && (
//                     <div className="space-y-2">
//                       <Label htmlFor="department">
//                         Department *
//                       </Label>
//                       <select
//                         id="department"
//                         value={formData.department_id}
//                         onChange={(e) =>
//                           handleInputChange('department_id', e.target.value)
//                         }
//                         className={`w-full px-3 py-2 border rounded-lg bg-white ${
//                           errors.department_id ? 'border-red-500' : ''
//                         }`}
//                       >
//                         <option value="">Select Department</option>
//                         {departments.map((dept) => (
//                           <option key={dept.id} value={dept.id}>
//                             {dept.name}{' '}
//                             {dept.code ? `(${dept.code})` : ''}
//                           </option>
//                         ))}
//                       </select>
//                       {errors.department_id && (
//                         <p className="text-xs text-red-500">
//                           {errors.department_id}
//                         </p>
//                       )}
//                       {formData.role === 'hod' && (
//                         <p className="text-xs text-gray-500">
//                           This user will be assigned as Head of Department for
//                           the selected department.
//                         </p>
//                       )}
//                       {(formData.role === 'student' ||
//                         formData.role === 'teacher') && (
//                         <p className="text-xs text-gray-500">
//                           This defines the department this{' '}
//                           {formData.role} belongs to. Detailed
//                           program/semester is managed in the dedicated
//                           admin create-user page.
//                         </p>
//                       )}
//                     </div>
//                   )}
//                 </div>

//                 {/* Security */}
//                 <div className="space-y-4">
//                   <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                     <Shield className="h-5 w-5 mr-2 text-red-600" />
//                     Security
//                   </h3>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div className="space-y-2">
//                       <Label htmlFor="password">Password *</Label>
//                       <Input
//                         id="password"
//                         type="password"
//                         placeholder="Minimum 8 characters"
//                         value={formData.password}
//                         onChange={(e) =>
//                           handleInputChange('password', e.target.value)
//                         }
//                         className={errors.password ? 'border-red-500' : ''}
//                       />
//                       {errors.password && (
//                         <p className="text-xs text-red-500">
//                           {errors.password}
//                         </p>
//                       )}
//                     </div>

//                     <div className="space-y-2">
//                       <Label htmlFor="confirmPassword">
//                         Confirm Password *
//                       </Label>
//                       <Input
//                         id="confirmPassword"
//                         type="password"
//                         placeholder="Re-enter password"
//                         value={formData.confirmPassword}
//                         onChange={(e) =>
//                           handleInputChange(
//                             'confirmPassword',
//                             e.target.value,
//                           )
//                         }
//                         className={
//                           errors.confirmPassword ? 'border-red-500' : ''
//                         }
//                       />
//                       {errors.confirmPassword && (
//                         <p className="text-xs text-red-500">
//                           {errors.confirmPassword}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </form>
//             </div>

//             {/* Footer */}
//             <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t flex-shrink-0">
//               <Button
//                 type="button"
//                 variant="outline"
//                 onClick={handleCloseModal}
//               >
//                 Cancel
//               </Button>
//               <Button onClick={handleSubmit} disabled={creating}>
//                 {creating ? (
//                   <>
//                     <Save className="mr-2 h-4 w-4 animate-spin" />
//                     Creating...
//                   </>
//                 ) : (
//                   <>
//                     <Save className="mr-2 h-4 w-4" />
//                     Create User
//                   </>
//                 )}
//               </Button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Statistics Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//         <Card className="border-0 shadow-lg">
//           <CardContent className="flex items-center p-6">
//             <div className="p-3 bg-blue-100 rounded-xl mr-4">
//               <Users className="h-6 w-6 text-blue-600" />
//             </div>
//             <div>
//               <p className="text-2xl font-bold">{stats.total}</p>
//               <p className="text-sm text-gray-500">Total Users</p>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border-0 shadow-lg">
//           <CardContent className="flex items-center p-6">
//             <div className="p-3 bg-purple-100 rounded-xl mr-4">
//               <Shield className="h-6 w-6 text-purple-600" />
//             </div>
//             <div>
//               <p className="text-2xl font-bold">{stats.admins}</p>
//               <p className="text-sm text-gray-500">Admins</p>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border-0 shadow-lg">
//           <CardContent className="flex items-center p-6">
//             <div className="p-3 bg-blue-100 rounded-xl mr-4">
//               <BookOpen className="h-6 w-6 text-blue-600" />
//             </div>
//             <div>
//               <p className="text-2xl font-bold">{stats.teachers}</p>
//               <p className="text-sm text-gray-500">Teachers</p>
//             </div>
//           </CardContent>
//         </Card>

//         <Card className="border-0 shadow-lg">
//           <CardContent className="flex items-center p-6">
//             <div className="p-3 bg-green-100 rounded-xl mr-4">
//               <GraduationCap className="h-6 w-6 text-green-600" />
//             </div>
//             <div>
//               <p className="text-2xl font-bold">{stats.students}</p>
//               <p className="text-sm text-gray-500">Students</p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Filters and Search */}
//       <Card className="border-0 shadow-lg">
//         <CardHeader>
//           <CardTitle>User Management</CardTitle>
//           <CardDescription>Search and filter users</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="flex flex-col md:flex-row gap-4 mb-6">
//             <div className="flex-1 relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
//               <Input
//                 placeholder="Search by name, email, or phone..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//             <select
//               value={selectedRole}
//               onChange={(e) => setSelectedRole(e.target.value)}
//               className="px-4 py-2 border rounded-lg bg-white"
//             >
//               <option value="all">All Roles</option>
//               <option value="admin">Admin</option>
//               <option value="teacher">Teacher</option>
//               <option value="student">Student</option>
//               <option value="parent">Parent</option>
//               <option value="hr">HR</option>
//               <option value="hod">HOD</option>
//               <option value="finance">Finance</option>
//               <option value="staff">Staff</option>
//             </select>
//             <select
//               value={selectedStatus}
//               onChange={(e) => setSelectedStatus(e.target.value)}
//               className="px-4 py-2 border rounded-lg bg-white"
//             >
//               <option value="all">All Status</option>
//               <option value="active">Active</option>
//               <option value="inactive">Inactive</option>
//               <option value="suspended">Suspended</option>
//             </select>
//           </div>

//           {/* Users List */}
//           <div className="space-y-3">
//             {loading ? (
//               <div className="text-center py-8 text-gray-500">
//                 Loading users...
//               </div>
//             ) : (
//               filteredUsers.map((user) => (
//                 <div
//                   key={user.id}
//                   className="p-4 border rounded-xl hover:shadow-md transition-shadow"
//                 >
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center space-x-4 flex-1">
//                       <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
//                         {user.name
//                           .split(' ')
//                           .map((n) => n[0])
//                           .join('')}
//                       </div>
//                       <div className="flex-1">
//                         <div className="flex items-center space-x-2">
//                           <h3 className="font-semibold text-gray-900">
//                             {user.name}
//                           </h3>
//                           <Badge className={roleColors[user.role]}>
//                             {user.role.charAt(0).toUpperCase() +
//                               user.role.slice(1)}
//                           </Badge>
//                           <Badge
//                             variant="outline"
//                             className={statusColors[user.status]}
//                           >
//                             {user.status.charAt(0).toUpperCase() +
//                               user.status.slice(1)}
//                           </Badge>
//                         </div>
//                         <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
//                           <div className="flex items-center space-x-1">
//                             <Mail className="h-3 w-3" />
//                             <span>{user.email}</span>
//                           </div>
//                           <div className="flex items-center space-x-1">
//                             <Phone className="h-3 w-3" />
//                             <span>{user.phone}</span>
//                           </div>
//                         </div>
//                         <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
//                           <span>Joined: {user.joinedDate}</span>
//                           <span>Last active: {user.lastActive}</span>
//                         </div>
//                       </div>
//                     </div>
//                     <div className="flex items-center space-x-2">
//                       <Button variant="outline" size="sm">
//                         <Edit className="h-4 w-4" />
//                       </Button>
//                       <Button variant="outline" size="sm">
//                         <MoreVertical className="h-4 w-4" />
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>

//           {filteredUsers.length === 0 && !loading && (
//             <div className="text-center py-12">
//               <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//               <h3 className="text-lg font-medium text-gray-900 mb-2">
//                 No users found
//               </h3>
//               <p className="text-gray-500">
//                 Try adjusting your search or filter criteria
//               </p>
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef } from 'react';
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
  Trash2,
  UserCheck,
  UserX,
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
  department_id: string | null;
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
  address?: string | null;
  department_id?: string | null;
  semester?: number | null;
  enrollment_number?: string | null;
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

interface EditUserForm {
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: Status;
  address: string;
  department_id: string;
}

export default function RolesUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for the dropdown container
   const dropdownMenuRef = useRef<HTMLDivElement>(null);

  // Add user form
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

  // Edit user form
  const [editFormData, setEditFormData] = useState<EditUserForm>({
    name: '',
    email: '',
    phone: '',
    role: 'student',
    status: 'active',
    address: '',
    department_id: '',
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof NewUserForm, string>>
  >({});
  const [editErrors, setEditErrors] = useState<
    Partial<Record<keyof EditUserForm, string>>
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

  // ----- Add User handlers -----
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

  // ----- Edit User handlers -----
  const handleEditInputChange = (field: keyof EditUserForm, value: string) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleEditRoleChange = (value: Role) => {
    setEditFormData((prev) => ({
      ...prev,
      role: value,
      department_id:
        value === 'student' || value === 'teacher' || value === 'hod'
          ? prev.department_id
          : '',
    }));
    if (editErrors.role) {
      setEditErrors((prev) => ({ ...prev, role: '' }));
    }
  };

  const validateEditForm = (): boolean => {
    const newErrors: Partial<Record<keyof EditUserForm, string>> = {};

    if (!editFormData.name.trim()) newErrors.name = 'Name is required';
    if (!editFormData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!editFormData.phone.trim()) newErrors.phone = 'Phone is required';

    if (
      (editFormData.role === 'student' ||
        editFormData.role === 'teacher' ||
        editFormData.role === 'hod') &&
      !editFormData.department_id
    ) {
      newErrors.department_id = 'Department is required for this role';
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ----- Fetch data -----
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
            enrollment_number,
            department_id
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
          (usersResult.data as UserRow[] | null)?.map((u) => ({
            id: u.id,
            name: u.full_name,
            email: u.email,
            phone: u.phone ?? '',
            role: u.role,
            status: 'active',
            joinedDate: u.created_at?.split('T')[0] ?? '',
            lastActive: 'Active',
            address: u.address,
            department_id: u.department_id,
            semester: u.semester,
            enrollment_number: u.enrollment_number,
          })) ?? [];

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

  // ----- Dropdown click‑outside handler (fixed) -----
   useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(null);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // ----- Create user -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setCreating(true);
      setError(null);

      // Check email existence
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();

      if (checkError) {
        setError('Failed to check existing user.');
        return;
      }
      if (existingUser) {
        setError('A user with this email already exists. Please use a different email.');
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered')) {
          setError('This email is already registered. Please use a different email.');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      const authUser = signUpData.user;
      if (!authUser) {
        setError('Failed to create auth user.');
        return;
      }

      const insertData: any = {
        id: authUser.id,
        email: formData.email,
        full_name: formData.name,
        role: formData.role,
        phone: formData.phone || null,
        address: formData.address || null,
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
        address: row.address,
        department_id: row.department_id,
        semester: row.semester,
        enrollment_number: row.enrollment_number,
      };

      setUsers((prev) => [newUser, ...prev]);
      setShowAddUserModal(false);
      resetAddForm();
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const resetAddForm = () => {
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
  };

  // ----- Edit user (fixed: always update and close on success) -----
  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      address: user.address || '',
      department_id: user.department_id || '',
    });
    setShowEditModal(true);
    setDropdownOpen(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEditForm()) return;
    if (!editingUser) return;

    try {
      setUpdating(true);
      setError(null);

      // Check email conflict only if email changed
      if (editFormData.email !== editingUser.email) {
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('email', editFormData.email)
          .maybeSingle();

        if (checkError) {
          setError('Failed to check email availability.');
          return;
        }
        if (existingUser && existingUser.id !== editingUser.id) {
          setError('This email is already used by another user. Please use a different one.');
          return;
        }
      }

      // Build payload
      const updateData: any = {
        full_name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        role: editFormData.role,
        address: editFormData.address || null,
      };

      if (
        (editFormData.role === 'student' ||
          editFormData.role === 'teacher' ||
          editFormData.role === 'hod') &&
        editFormData.department_id
      ) {
        updateData.department_id = editFormData.department_id;
      } else {
        updateData.department_id = null;
      }

      // Execute update
      const { data, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id)
        .select('*');

      if (updateError) {
        if (updateError.code === '23505') {
          setError('This email is already taken. Please choose another.');
        } else {
          setError(updateError.message);
        }
        return;
      }

      // Even if data is empty (shouldn't happen with select('*')), we still treat as success
      if (data && data.length > 0) {
        const updatedRow = data[0] as UserRow;
        const updatedUser: User = {
          id: updatedRow.id,
          name: updatedRow.full_name,
          email: updatedRow.email,
          phone: updatedRow.phone ?? '',
          role: updatedRow.role,
          status: editFormData.status,
          joinedDate: editingUser.joinedDate,
          lastActive: 'Just now',
          address: updatedRow.address,
          department_id: updatedRow.department_id,
          semester: updatedRow.semester,
          enrollment_number: updatedRow.enrollment_number,
        };
        setUsers((prev) =>
          prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );
      } else {
        // Fallback: just update the name and email in local state (should not happen)
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  name: editFormData.name,
                  email: editFormData.email,
                  phone: editFormData.phone,
                  role: editFormData.role,
                  status: editFormData.status,
                  address: editFormData.address || null,
                  department_id: editFormData.department_id || null,
                }
              : u
          )
        );
      }

      // Close modal
      setShowEditModal(false);
      setEditingUser(null);
      setEditErrors({});
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Failed to update user.');
    } finally {
      setUpdating(false);
    }
  };

  // ----- Delete user -----
  const handleDeleteClick = (user: User) => {
    setDeleteConfirmUser(user);
    setDropdownOpen(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmUser) return;
    try {
      setDeleting(true);
      setError(null);

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', deleteConfirmUser.id);

      if (error) {
        setError(error.message);
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== deleteConfirmUser.id));
      setDeleteConfirmUser(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  // ----- Toggle status (frontend only) -----
  const handleToggleStatus = (user: User) => {
    const newStatus: Status = user.status === 'active' ? 'suspended' : 'active';
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
    );
    setDropdownOpen(null);
  };

  // Statistics
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
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ===== ADD USER MODAL ===== (unchanged) */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 h-screen">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Add New User
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Fill in the details to create a new user account
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddUserModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
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
                          handleInputChange('emergencyContact', e.target.value)
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
                  {(formData.role === 'student' ||
                    formData.role === 'teacher' ||
                    formData.role === 'hod') && (
                    <div className="space-y-2">
                      <Label htmlFor="department">Department *</Label>
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
                            {dept.name} {dept.code ? `(${dept.code})` : ''}
                          </option>
                        ))}
                      </select>
                      {errors.department_id && (
                        <p className="text-xs text-red-500">
                          {errors.department_id}
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
                          handleInputChange('confirmPassword', e.target.value)
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
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddUserModal(false)}
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

      {/* ===== EDIT USER MODAL ===== */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 h-screen">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit User
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Update user details
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  setEditErrors({});
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Full Name *</Label>
                      <Input
                        id="edit-name"
                        placeholder="Enter full name"
                        value={editFormData.name}
                        onChange={(e) =>
                          handleEditInputChange('name', e.target.value)
                        }
                        className={editErrors.name ? 'border-red-500' : ''}
                      />
                      {editErrors.name && (
                        <p className="text-xs text-red-500">
                          {editErrors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email Address *</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        placeholder="user@example.com"
                        value={editFormData.email}
                        onChange={(e) =>
                          handleEditInputChange('email', e.target.value)
                        }
                        className={editErrors.email ? 'border-red-500' : ''}
                      />
                      {editErrors.email && (
                        <p className="text-xs text-red-500">
                          {editErrors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Phone Number *</Label>
                      <Input
                        id="edit-phone"
                        placeholder="+92 3XX XXXXXXX"
                        value={editFormData.phone}
                        onChange={(e) =>
                          handleEditInputChange('phone', e.target.value)
                        }
                        className={editErrors.phone ? 'border-red-500' : ''}
                      />
                      {editErrors.phone && (
                        <p className="text-xs text-red-500">
                          {editErrors.phone}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-address">Address</Label>
                      <Input
                        id="edit-address"
                        placeholder="Enter address"
                        value={editFormData.address}
                        onChange={(e) =>
                          handleEditInputChange('address', e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-purple-600" />
                    Role & Access
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-role">User Role *</Label>
                      <select
                        id="edit-role"
                        value={editFormData.role}
                        onChange={(e) =>
                          handleEditRoleChange(e.target.value as Role)
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
                      <Label htmlFor="edit-status">Account Status</Label>
                      <select
                        id="edit-status"
                        value={editFormData.status}
                        onChange={(e) =>
                          handleEditInputChange(
                            'status',
                            e.target.value as Status
                          )
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>
                  {(editFormData.role === 'student' ||
                    editFormData.role === 'teacher' ||
                    editFormData.role === 'hod') && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-department">Department *</Label>
                      <select
                        id="edit-department"
                        value={editFormData.department_id}
                        onChange={(e) =>
                          handleEditInputChange(
                            'department_id',
                            e.target.value
                          )
                        }
                        className={`w-full px-3 py-2 border rounded-lg bg-white ${
                          editErrors.department_id ? 'border-red-500' : ''
                        }`}
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name} {dept.code ? `(${dept.code})` : ''}
                          </option>
                        ))}
                      </select>
                      {editErrors.department_id && (
                        <p className="text-xs text-red-500">
                          {editErrors.department_id}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  setEditErrors({});
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleEditSubmit} disabled={updating}>
                {updating ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update User
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900">Confirm Delete</h3>
            <p className="text-gray-600 mt-2">
              Are you sure you want to delete user{' '}
              <strong>{deleteConfirmUser.name}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmUser(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
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

      {/* Filters and Users List */}
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

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {/* 3‑dot dropdown – FIXED */}
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(
                              dropdownOpen === user.id ? null : user.id
                            );
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {dropdownOpen === user.id && (
                          <div
                            ref={dropdownMenuRef}
                            className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-50 py-1"
                            onMouseDown={(e) => e.stopPropagation()} // prevent outside click from closing
                          >
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(user);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(user);
                              }}
                            >
                              {user.status === 'active' ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2 text-red-500" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2 text-green-500" />
                                  Activate
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(user);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
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