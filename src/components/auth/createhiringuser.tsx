/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  X,
  UserPlus,
  Mail,
  Building2,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Phone,
} from 'lucide-react';
import { createUserByAdmin, type UserRole } from '@/lib/auth';

// Types matching your hiring management structure
type HiringStatus = 'pending' | 'approved' | 'rejected' | 'on_hold' | 'closed';
type RoleType = 'faculty' | 'staff' | 'hod' | 'hr' | 'finance' | 'other';
type EmploymentType = 'full_time' | 'part_time' | 'contract';

interface Department {
  id: string;
  name: string;
  code?: string;
}

interface HiringRequest {
  id: string;
  title: string;
  role_type: RoleType;
  employment_type: EmploymentType;
  description?: string;
  qualifications?: string;
  responsibilities?: string;
  department_id?: string;
  min_salary?: number;
  max_salary?: number;
  status: HiringStatus;
  positions_requested?: number;
  positions_approved?: number;
}

interface UserFormData {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  department_id: string;
  employment_type: EmploymentType;
  salary?: number;
}

interface CreateUserFromHiringModalProps {
  isOpen: boolean;
  onClose: () => void;
  hiringRequest: HiringRequest;
  departments: Department[];
  onUserCreated: (userId: string) => void;
  onCancel: () => void;
}

// Map hiring role types to user roles
const roleTypeToUserRole = (roleType: RoleType): UserRole => {
  const mapping: Record<RoleType, UserRole> = {
    faculty: 'teacher',
    staff: 'staff',
    hod: 'hod',
    hr: 'hr',
    finance: 'finance',
    other: 'staff',
  };
  return mapping[roleType];
};

const roleLabels: Record<UserRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin',
  parent: 'Parent',
  hr: 'HR',
  hod: 'Head of Department',
  finance: 'Finance',
  staff: 'Staff',
};

export default function CreateUserFromHiringModal({
  isOpen,
  onClose,
  onCancel,
  hiringRequest,
  departments,
  onUserCreated,
}: CreateUserFromHiringModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    password: '',
    role: roleTypeToUserRole(hiringRequest.role_type),
    phone: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Pakistan',
    department_id: hiringRequest.department_id || '',
    employment_type: hiringRequest.employment_type,
    salary: hiringRequest.min_salary,
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: roleTypeToUserRole(hiringRequest.role_type),
        phone: '',
        date_of_birth: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'Pakistan',
        department_id: hiringRequest.department_id || '',
        employment_type: hiringRequest.employment_type,
        salary: hiringRequest.min_salary,
      });
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, hiringRequest]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.full_name.trim()) {
      return 'Full name is required';
    }
    if (!formData.email.trim()) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Please enter a valid email address';
    }
    if (!formData.password || formData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (!formData.department_id) {
      return 'Department is required';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create user using your auth function
      await createUserByAdmin(
        formData.full_name,
        formData.email,
        formData.password,
        formData.role,
        {
          department_id: formData.department_id || undefined,
        }
      );

      setSuccess(true);

      // Call the callback
      onUserCreated('user-created');

      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create user account';
      setError(errorMsg);
      console.error('User creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  if (!isOpen) return null;

  const selectedDepartment = departments.find((d) => d.id === formData.department_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <Card className="bg-white shadow-2xl border-0 max-h-full">
          {/* Header */}
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  Create User Account from Hiring Request
                </CardTitle>
                <CardDescription className="mt-2 text-sm">
                  Complete the user profile for:{' '}
                  <span className="font-semibold text-slate-900">{hiringRequest.title}</span>
                </CardDescription>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                    {roleLabels[formData.role]}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-medium">
                    {hiringRequest.employment_type.replace('_', ' ')}
                  </span>
                  {selectedDepartment && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-medium">
                      <Building2 className="h-3 w-3" />
                      {selectedDepartment.name}
                    </span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                disabled={loading}
                className="rounded-full h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Success State */}
          {success && (
            <div className="p-4 bg-green-50 border-b border-green-200">
              <div className="flex items-center gap-3 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">User account created successfully!</p>
                  <p className="text-sm text-green-700">
                    The hiring request has been approved.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200">
              <div className="flex items-center gap-3 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Form Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Job Details Summary */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Position Details</h3>
                <div className="space-y-2 text-sm">
                  {hiringRequest.description && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Description</p>
                      <p className="text-slate-900 line-clamp-2">{hiringRequest.description}</p>
                    </div>
                  )}
                  {(hiringRequest.min_salary || hiringRequest.max_salary) && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Salary Range</p>
                      <p className="text-slate-900">
                        {hiringRequest.min_salary?.toLocaleString()} -{' '}
                        {hiringRequest.max_salary?.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {hiringRequest.positions_requested && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Positions</p>
                      <p className="text-slate-900">
                        Requested: {hiringRequest.positions_requested}
                        {hiringRequest.positions_approved && ` | Approved: ${hiringRequest.positions_approved}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      required
                      disabled={loading || success}
                      className="bg-white text-sm h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john.doe@university.edu"
                      required
                      disabled={loading || success}
                      className="bg-white text-sm h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      disabled={loading || success}
                      className="bg-white text-sm h-9"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      User will be prompted to change on first login
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+92 300 0000000"
                        disabled={loading || success}
                        className="bg-white text-sm h-9 pl-8"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-600" />
                  Employment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white h-9"
                      disabled={loading || success}
                    >
                      <option value="teacher">Teacher</option>
                      <option value="staff">Staff</option>
                      <option value="hod">Head of Department</option>
                      <option value="hr">HR</option>
                      <option value="finance">Finance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white h-9"
                      disabled={loading || success}
                      required
                    >
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.code ? `(${d.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Employment Type
                    </label>
                    <select
                      name="employment_type"
                      value={formData.employment_type}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white h-9"
                      disabled={loading || success}
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Salary (Optional)
                    </label>
                    <Input
                      name="salary"
                      type="number"
                      value={formData.salary || ''}
                      onChange={handleInputChange}
                      placeholder="Enter salary"
                      disabled={loading || success}
                      className="bg-white text-sm h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        disabled={loading || success}
                        className="bg-white text-sm h-9 pl-8"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Address */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-600" />
                  Contact & Address
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Street Address
                    </label>
                    <Textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter street address"
                      rows={2}
                      disabled={loading || success}
                      className="bg-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                      <Input
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="City"
                        disabled={loading || success}
                        className="bg-white text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        State/Province
                      </label>
                      <Input
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="State"
                        disabled={loading || success}
                        className="bg-white text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Postal Code
                      </label>
                      <Input
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleInputChange}
                        placeholder="00000"
                        disabled={loading || success}
                        className="bg-white text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Country
                      </label>
                      <Input
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        placeholder="Country"
                        disabled={loading || success}
                        className="bg-white text-sm h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            {/* Footer Actions */}
            <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 sticky bottom-0">
              <div className="text-xs text-slate-600">
                {success ? (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Account created successfully! Request approved.
                  </span>
                ) : (
                  <span>Create user account to approve this hiring request</span>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 flex-1 sm:flex-none"
                  size="sm"
                >
                  Cancel (Keep Pending)
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || success}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex-1 sm:flex-none"
                  size="sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Creating...
                    </span>
                  ) : success ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3" />
                      Created
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus className="h-3 w-3" />
                      Create Account & Approve
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}