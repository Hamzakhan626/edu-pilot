'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Briefcase,
  UserPlus,
  Users,
  Building2,
  Calendar,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
  Loader2,
} from 'lucide-react';

import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/auth';

// Types (aligned with DB)
type RoleType = 'Faculty' | 'Staff';
type HiringStatus = 'Draft' | 'PendingHoD' | 'PendingHR' | 'Approved' | 'Rejected' | 'Hired';
type Stage = 'Requested' | 'Screening' | 'Interview' | 'Offer' | 'Onboarding';
type VacancyReason = 'NewPosition' | 'Replacement' | 'LoadIncrease';
type Priority = 'High' | 'Normal' | 'Low';

interface HiringRequest {
  id: string;
  title: string;                 // main column, used as position title
  position_title?: string;       // optional, but we set it same as title
  role_type: RoleType;
  department: string;
  program?: string;
  requested_by: string;
  requested_by_name?: string;
  requested_role: string;
  requested_date: string;
  needed_by: string;
  status: HiringStatus;
  stage: Stage;
  fte: number;
  priority: Priority;
  budget_code?: string;
  vacancy_reason: VacancyReason;
  candidate_name?: string;
  candidate_email?: string;
}

// Form data for new request
interface NewRequestForm {
  position_title: string;
  role_type: RoleType;
  department_id: string;
  program: string;
  requested_role: string;
  needed_by: string;
  fte: number;
  priority: Priority;
  budget_code: string;
  vacancy_reason: VacancyReason;
  description?: string;
  qualifications?: string;
  responsibilities?: string;
}

export default function HRHiringRequestsPage() {
  
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<HiringRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
const [viewModalOpen, setViewModalOpen] = useState(false);
const [selectedRequest, setSelectedRequest] = useState<HiringRequest | null>(null);
const [updating, setUpdating] = useState(false);
const [notifying, setNotifying] = useState(false);
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<NewRequestForm>({
    position_title: '',
    // title :" ",
    role_type: 'Faculty',
    department_id: '',
    program: '',
    requested_role: 'HoD',
    needed_by: '',
    fte: 1,
    priority: 'Normal',
    budget_code: '',
    vacancy_reason: 'NewPosition',
  });
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | HiringStatus>('all');
  const [selectedRoleType, setSelectedRoleType] = useState<'all' | RoleType>('all');

  // Fetch user, departments, and requests
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Auth
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(userError.message);
        if (!authUser) throw new Error('No authenticated user');
        setUser(authUser);

        // 2. Fetch departments (for dropdown)
        const { data: depts, error: deptError } = await supabase
          .from('departments')
          .select('id, name')
          .order('name');
        if (deptError) throw new Error(deptError.message);
        setDepartments(depts || []);

        // 3. Fetch user's hiring requests with joins
        const { data, error: fetchError } = await supabase
  .from('hiring_requests')
  .select(`
    id,
    title,
    position_title,
    role_type,
    program,
    requested_role,
    created_at,
    needed_by,
    status,
    stage,
    fte,
    priority,
    budget_code,
    vacancy_reason,
    candidate_name,
    candidate_email,
    department:departments(name),
    requested_by_user:users!hiring_requests_requested_by_fkey(id, full_name)
  `)
  .eq('requested_by', authUser.id)
  .order('created_at', { ascending: false });

        if (fetchError) throw new Error(fetchError.message);

      const mapped = (data || []).map((item: any) => ({
  id: item.id,
  title: item.title,                           // primary
  position_title: item.title,                  // UI expects position_title
  role_type: item.role_type,
  department: item.department?.name || 'Unknown',
  program: item.program,
  requested_by: item.requested_by,
  requested_by_name: item.requested_by_user?.full_name,
  requested_role: item.requested_role,
  requested_date: item.created_at,
  needed_by: item.needed_by,
  status: item.status,
  stage: item.stage,
  fte: item.fte,
  priority: item.priority,
  budget_code: item.budget_code,
  vacancy_reason: item.vacancy_reason,
  candidate_name: item.candidate_name,
  candidate_email: item.candidate_email,
}));
        setRequests(mapped);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);
 
  // Approve request
const handleApprove = async (request: HiringRequest) => {
  if (!user) return;
  setUpdating(true);
  try {
    const { error } = await supabase
      .from('hiring_requests')
      .update({ 
        status: 'Approved',
        approved_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id);

    if (error) throw error;
    
    // Refresh list
    await fetchRequests();
    alert('Request approved successfully');
  } catch (err: any) {
    console.error(err);
    alert(err.message || 'Failed to approve');
  } finally {
    setUpdating(false);
  }
};

// Reject request
const handleReject = async (request: HiringRequest) => {
  if (!user) return;
  const reason = prompt('Please enter rejection reason:');
  if (!reason) return;
  
  setUpdating(true);
  try {
    const { error } = await supabase
      .from('hiring_requests')
      .update({ 
        status: 'Rejected',
        rejection_reason: reason,
        approved_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id);

    if (error) throw error;
    
    await fetchRequests();
    alert('Request rejected');
  } catch (err: any) {
    console.error(err);
    alert(err.message || 'Failed to reject');
  } finally {
    setUpdating(false);
  }
};

// Notify requester
// const handleNotifyRequester = async (request: HiringRequest) => {
//   if (!request.requested_by) {
//     alert('Requester ID not found');
//     return;
//   }
//   setNotifying(true);
//   try {
//     const { error } = await supabase
//       .from('notifications')
//       .insert({
//         user_id: request.requested_by,
//         message: `Your hiring request "${request.title}" has been updated. Please check the status.`,
//         type: 'hiring_update',
//         created_at: new Date().toISOString(),
//         read: false,
//       });
//     if (error) throw error;
//     alert(`Notification sent to ${request.requested_by_name || 'requester'}`);
//   } catch (err: any) {
//     console.error(err);
//     alert(`Could not send notification: ${err.message}. Please inform manually.`);
//   } finally {
//     setNotifying(false);
//   }
// };

// Helper to refetch requests
const fetchRequests = async () => {
  if (!user) return;
  const { data, error } = await supabase
    .from('hiring_requests')
    .select(`
      id, title, position_title, role_type, program, requested_role,
      created_at, needed_by, status, stage, fte, priority, budget_code,
      vacancy_reason, candidate_name, candidate_email,
      department:departments(name),
      requested_by_user:users!hiring_requests_requested_by_fkey(id, full_name)
    `)
    .eq('requested_by', user.id)
    .order('created_at', { ascending: false });
  
  if (!error && data) {
    const mapped = data.map((item: any) => ({
      id: item.id,
      title: item.title,
      position_title: item.title,
      role_type: item.role_type,
      department: item.department?.name || 'Unknown',
      program: item.program,
      requested_by: item.requested_by,
      requested_by_name: item.requested_by_user?.full_name,
      requested_role: item.requested_role,
      requested_date: item.created_at,
      needed_by: item.needed_by,
      status: item.status,
      stage: item.stage,
      fte: item.fte,
      priority: item.priority,
      budget_code: item.budget_code,
      vacancy_reason: item.vacancy_reason,
      candidate_name: item.candidate_name,
      candidate_email: item.candidate_email,
    }));
    setRequests(mapped);
  }
};
  // Handle form input changes
  const handleFormChange = (field: keyof NewRequestForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  
  const handleNotifyRequester = async (request: HiringRequest) => {
  if (!request.requested_by) {
    alert('Requester ID not found');
    return;
  }

  setNotifying(true);
  try {
    // Try to insert into notifications table
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: request.requested_by,
        message: `Your hiring request "${request.title}" has been updated. Please check the status.`,
        type: 'hiring_update',
        created_at: new Date().toISOString(),
        read: false,
      });

    if (error) throw error;

    alert(`Notification sent to ${request.requested_by_name || 'requester'}`);
  } catch (err: any) {
    console.error('Notification error:', err);
    // Fallback: show an alert instead of breaking
    alert(`Could not send notification: ${err.message}. But you can manually inform the requester.`);
  } finally {
    setNotifying(false);
  }
}; 

  // Submit new request
const handleCreateRequest = async () => {
  if (!user) return;
  if (!formData.position_title.trim()) {
    alert('Position title is required');
    return;
  }
  if (!formData.department_id) {
    alert('Please select a department');
    return;
  }
  if (!formData.needed_by) {
    alert('Please select a needed-by date');
    return;
  }

  setSubmitting(true);
  try {
    // ✅ Fixed: include 'title' column (NOT NULL) and map position_title to it
  const newRequest = {
  title: formData.position_title,           // ✅ required column
  position_title: formData.position_title,  // optional, but set same
  role_type: formData.role_type,
  department_id: formData.department_id,
  program: formData.program || null,
  requested_role: formData.requested_role,
  needed_by: formData.needed_by,
  fte: formData.fte,
  priority: formData.priority,
  budget_code: formData.budget_code || null,
  vacancy_reason: formData.vacancy_reason,
  status: 'Draft',
  stage: 'Requested',
  requested_by: user.id,
  description: formData.description || null,
  qualifications: formData.qualifications || null,
  responsibilities: formData.responsibilities || null,
  // Additional required fields (default values)
  employment_type: 'FullTime',               // required, adjust as needed
  positions_requested: 1,
  positions_approved: 0,
      };

    const { error: insertError } = await supabase
      .from('hiring_requests')
      .insert(newRequest);

    if (insertError) throw new Error(insertError.message);

    // Reset and close
    setIsModalOpen(false);
    setFormData({
      position_title: '',
      role_type: 'Faculty',
      department_id: '',
      program: '',
      requested_role: 'HoD',
      needed_by: '',
      fte: 1,
      priority: 'Normal',
      budget_code: '',
      vacancy_reason: 'NewPosition',
      description: '',
      qualifications: '',
      responsibilities: '',
    });

    // Refetch the updated list (same as before)
    const { data, error: fetchError } = await supabase
       .from('hiring_requests')
       .select(`
        id,
        title,
        position_title,
        role_type,
        program,
        requested_role,
        created_at,
        needed_by,
        status,
        stage,
        fte,
        priority,
        budget_code,
        vacancy_reason,
        candidate_name,
        candidate_email,
        department:departments(name),
        requested_by_user:users!hiring_requests_requested_by_fkey(id, full_name)
      `)
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false });

    if (!fetchError && data) {
      const mapped = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        position_title: item.position_title,
        role_type: item.role_type,
        department: item.department?.name || 'Unknown',
        program: item.program,
        requested_by: item.requested_by,
        requested_by_name: item.requested_by_user?.full_name,
        requested_role: item.requested_role,
        requested_date: item.created_at,
        needed_by: item.needed_by,
        status: item.status,
        stage: item.stage,
        fte: item.fte,
        priority: item.priority,
        budget_code: item.budget_code,
        vacancy_reason: item.vacancy_reason,
        candidate_name: item.candidate_name,
        candidate_email: item.candidate_email,
      }));
      setRequests(mapped);
    }
  } catch (err: any) {
    console.error(err);
    alert(err.message || 'Failed to create request');
  } finally {
    setSubmitting(false);
  }
};
  // Derived stats
  const totalRequests = requests.length;
  const openRequests = requests.filter((r) => r.status !== 'Rejected' && r.status !== 'Hired').length;
  const facultyRequests = requests.filter((r) => r.role_type === 'Faculty').length;
  const staffRequests = requests.filter((r) => r.role_type === 'Staff').length;
  const highPriority = requests.filter((r) => r.priority === 'High').length;
  const summaryCards = [
    { label: 'Total Hiring Requests', value: totalRequests, icon: Briefcase, color: 'blue', note: `${facultyRequests} Faculty • ${staffRequests} Staff` },
    { label: 'Open / In Progress', value: openRequests, icon: Clock, color: 'orange', note: 'Draft, pending, and in screening/interview' },
    { label: 'High Priority Requests', value: highPriority, icon: AlertCircle, color: 'red', note: 'Need faster turnaround' },
    { label: 'Approved / Hired', value: `${requests.filter((r) => r.status === 'Approved').length} / ${requests.filter((r) => r.status === 'Hired').length}`, icon: CheckCircle, color: 'green', note: 'Ready for or in onboarding' },
  ];

  // Filtering
  const filteredRequests = requests.filter((r) => {
    const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
    const matchesRole = selectedRoleType === 'all' || r.role_type === selectedRoleType;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.department.toLowerCase().includes(q) || (r.program && r.program.toLowerCase().includes(q)) || (r.requested_by_name && r.requested_by_name.toLowerCase().includes(q));
    return matchesStatus && matchesRole && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600">Loading your hiring requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-semibold">Error loading data</p>
        <p className="text-sm">{error}</p>
        <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 transition-all duration-500 ease-out 
        hover:scale-105 hover:shadow-2xl border-1  rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl text-white font-bold mb-1">Hiring Requests</h1>
            <p className="text-sky-100">Manage faculty and staff hiring workflow from request to onboarding</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white text-black hover:bg-gray-300 shadow-md transition-all">
              <UserPlus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white rounded-2xl">
            <DialogHeader className="px-6 pt-6 pb-2 border-b border-gray-100">
              <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-6 w-6 text-emerald-600" />
                Create Hiring Request
              </DialogTitle>
              <DialogDescription className="text-gray-500 mt-1">
                Fill in the details below to submit a new hiring request. Required fields are marked with *
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-4 space-y-8">
              {/* Section 1: Position Overview */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-emerald-600" />
                  Position Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="position_title" className="text-gray-700 font-medium">
                      Job Title <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="position_title"
                        value={formData.position_title}
                        onChange={(e) => handleFormChange('position_title', e.target.value)}
                        className="pl-9"
                        placeholder="e.g., Assistant Professor – Machine Learning"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role_type" className="text-gray-700 font-medium">
                      Role Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.role_type} onValueChange={(v) => handleFormChange('role_type', v as RoleType)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select role type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Faculty">
                          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-indigo-500" /> Faculty</div>
                        </SelectItem>
                        <SelectItem value="Staff">
                          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-purple-500" /> Staff</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 2: Department & Program */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Department Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-gray-700 font-medium">
                      Department <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.department_id} onValueChange={(v) => handleFormChange('department_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent className='bg-white'>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="program" className="text-gray-700 font-medium">Program (optional)</Label>
                    <Input id="program" value={formData.program} onChange={(e) => handleFormChange('program', e.target.value)} placeholder="e.g., BS Computer Science" />
                  </div>
                </div>
              </div>

              {/* Section 3: Request & Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  Request & Timeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="requested_role" className="text-gray-700 font-medium">
                      Approving Authority <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.requested_role} onValueChange={(v) => handleFormChange('requested_role', v)}>
                      <SelectTrigger><SelectValue placeholder="Who will approve?" /></SelectTrigger>
                      <SelectContent className='bg-white'>
                        <SelectItem value="HoD">Head of Department (HoD)</SelectItem>
                        <SelectItem value="Dean">Dean</SelectItem>
                        <SelectItem value="Director">Director</SelectItem>
                        <SelectItem value="Admin">Administration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="needed_by" className="text-gray-700 font-medium">
                      Needed By Date <span className="text-red-500">*</span>
                    </Label>
                    <Input id="needed_by" type="date" value={formData.needed_by} onChange={(e) => handleFormChange('needed_by', e.target.value)} className="bg-white" />
                  </div>
                </div>
              </div>

              {/* Section 4: Position Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Position Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="fte" className="text-gray-700 font-medium">FTE (Full-time equivalent)</Label>
                    <Input id="fte" type="number" step="0.1" min="0.1" max="2" value={formData.fte} onChange={(e) => handleFormChange('fte', parseFloat(e.target.value))} />
                    <p className="text-xs text-gray-400">1.0 = full-time, 0.5 = half-time</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-gray-700 font-medium">Priority Level</Label>
                    <Select value={formData.priority} onValueChange={(v) => handleFormChange('priority', v as Priority)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className='bg-white'>
                        <SelectItem value="High"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500" /> High</div></SelectItem>
                        <SelectItem value="Normal"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /> Normal</div></SelectItem>
                        <SelectItem value="Low"><div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-gray-500" /> Low</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section 5: Budget & Reason */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Budget & Justification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="vacancy_reason" className="text-gray-700 font-medium">Vacancy Reason</Label>
                    <Select value={formData.vacancy_reason} onValueChange={(v) => handleFormChange('vacancy_reason', v as VacancyReason)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className='bg-white'>
                        <SelectItem value="NewPosition">New Position</SelectItem>
                        <SelectItem value="Replacement">Replacement</SelectItem>
                        <SelectItem value="LoadIncrease">Load Increase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget_code" className="text-gray-700 font-medium">Budget Code (optional)</Label>
                    <Input id="budget_code" value={formData.budget_code} onChange={(e) => handleFormChange('budget_code', e.target.value)} placeholder="e.g., CS-ML-2025" />
                  </div>
                </div>
              </div>

              {/* Section 6: Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700 font-medium">Role Description (optional)</Label>
                <Textarea id="description" rows={4} value={formData.description || ''} onChange={(e) => handleFormChange('description', e.target.value)} placeholder="Describe the key responsibilities, qualifications, and expectations for this position..." className="resize-none" />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-gray-300">Cancel</Button>
              <Button onClick={handleCreateRequest} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : <><CheckCircle className="mr-2 h-4 w-4" /> Submit Request</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((stat, idx) => {
          const Icon = stat.icon;
          const isAlert = stat.label === 'Open / In Progress' || stat.label === 'High Priority Requests';
          return (
            <Card key={idx} className="transition-all duration-500 ease-out 
               hover:scale-105 hover:shadow-2xl border-1  rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                  {isAlert ? <TrendingDown className="h-4 w-4 text-red-500" /> : <TrendingUp className="h-4 w-4 text-green-500" />}
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                <p className="text-xs text-gray-600">{stat.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="transition-all duration-500 ease-out 
          hover:scale-105 hover:shadow-2xl border-1  rounded-xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Filter hiring requests by status and role type</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value === 'all' ? 'all' : e.target.value as HiringStatus)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="all">All Status</option>
                <option value="Draft">Draft</option>
                <option value="PendingHoD">Pending HoD</option>
                <option value="PendingHR">Pending HR</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Hired">Hired</option>
              </select>
              <select value={selectedRoleType} onChange={(e) => setSelectedRoleType(e.target.value === 'all' ? 'all' : e.target.value as RoleType)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="all">All Roles</option>
                <option value="Faculty">Faculty</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search by ID, position, department, program, or requester..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card className="border-1 rounded-xl  shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" />Requests Pipeline</CardTitle>
          <CardDescription>Each request with stage, budget, priority, and candidate (if assigned)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRequests.map((r) => (
              <div key={r.id} className=" transition-all duration-500 ease-out 
                   hover:scale-105 hover:shadow-2xl border-1   border-gray-200 rounded-lg p-6 ">
                {/* Same rendering as before – unchanged */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-3">
                  <div className="flex gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-emerald-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">{r.position_title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.role_type === 'Faculty' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>{r.role_type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${{
                          Draft: 'bg-gray-50 text-gray-700 border border-gray-200',
                          PendingHoD: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
                          PendingHR: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
                          Approved: 'bg-blue-50 text-blue-700 border border-blue-200',
                          Rejected: 'bg-red-50 text-red-700 border border-red-200',
                          Hired: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                        }[r.status]}`}>{r.status}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${{
                          High: 'bg-red-50 text-red-700 border border-red-200',
                          Normal: 'bg-blue-50 text-blue-700 border border-blue-200',
                          Low: 'bg-gray-50 text-gray-700 border border-gray-200',
                        }[r.priority]}`}>{r.priority} priority</span>
                      </div>
                      <p className="text-sm text-gray-600">{r.department}{r.program && ` • ${r.program}`}</p>
                      <p className="text-xs text-gray-500">Requested by {r.requested_by_name || r.requested_by} ({r.requested_role}) • ID {r.id}</p>
                      <p className="text-xs text-gray-500 mt-1">Requested: {new Date(r.requested_date).toLocaleDateString()} • Needed by: {new Date(r.needed_by).toLocaleDateString()} • FTE: {r.fte}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start lg:items-end gap-1 text-xs text-gray-600">
                    <p className="flex items-center gap-1"><Building2 className="h-3 w-3" />Stage: <span className="font-semibold">{r.stage}</span></p>
                    {r.budget_code && <p className="flex items-center gap-1"><FileText className="h-3 w-3" />Budget: <span className="font-mono">{r.budget_code}</span></p>}
                    <p className="flex items-center gap-1"><Calendar className="h-3 w-3" />Vacancy type: <span className="font-semibold">{r.vacancy_reason === 'NewPosition' ? 'New position' : r.vacancy_reason === 'Replacement' ? 'Replacement' : 'Load increase'}</span></p>
                 <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-1"
                        onClick={() => {
                          setSelectedRequest(r);
                          setViewModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Request
                      </Button>
                  </div>
                </div>
                <div className="mt-3 border-t border-gray-200 pt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-gray-600">
                  <div>
                    {r.candidate_name ? (
                      <>
                        <p className="font-semibold text-gray-800 mb-0.5">Candidate: {r.candidate_name}</p>
                        {r.candidate_email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" /><span>{r.candidate_email}</span></p>}
                      </>
                    ) : (
                      <p className="text-gray-500">No candidate selected yet. Request is in pre‑hiring stages.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                   <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleNotifyRequester(r)}
                        disabled={notifying}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Notify Requester
                      </Button>
                  {r.status === 'PendingHR' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleApprove(r)}
                                disabled={updating}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleReject(r)}
                                disabled={updating}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                  </div>
                </div>
              </div>
            ))}
            {filteredRequests.length === 0 && (
              <div className="text-center py-10">
                <Briefcase className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No hiring requests match the selected filters or search query.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* ========== VIEW REQUEST MODAL ========== */}
{selectedRequest && (
  <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
    <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto p-0 bg-white rounded-2xl">
      <DialogHeader className="px-6 pt-6 pb-2 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
        <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-600" />
          Hiring Request Details
        </DialogTitle>
        <DialogDescription className="text-gray-600">
          Request ID: {selectedRequest.id}
        </DialogDescription>
      </DialogHeader>

      <div className="px-6 py-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Position Title</Label>
            <p className="text-gray-900 font-medium mt-1">{selectedRequest.title}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Role Type</Label>
            <p className="text-gray-900 mt-1">{selectedRequest.role_type}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Department</Label>
            <p className="text-gray-900 mt-1">{selectedRequest.department}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Program</Label>
            <p className="text-gray-900 mt-1">{selectedRequest.program || '—'}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Requested By</Label>
            <p className="text-gray-900 mt-1">{selectedRequest.requested_by_name || selectedRequest.requested_by}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Approving Authority</Label>
            <p className="text-gray-900 mt-1">{selectedRequest.requested_role}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Requested Date</Label>
            <p className="text-gray-900 mt-1">{new Date(selectedRequest.requested_date).toLocaleDateString()}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Needed By</Label>
            <p className="text-gray-900 mt-1">{new Date(selectedRequest.needed_by).toLocaleDateString()}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Status</Label>
            <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${
              {
                Draft: 'bg-gray-100 text-gray-700',
                PendingHoD: 'bg-yellow-100 text-yellow-700',
                PendingHR: 'bg-yellow-100 text-yellow-700',
                Approved: 'bg-blue-100 text-blue-700',
                Rejected: 'bg-red-100 text-red-700',
                Hired: 'bg-emerald-100 text-emerald-700',
              }[selectedRequest.status]
            }`}>
              {selectedRequest.status}
            </span>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Stage</Label>
            <p className="text-gray-900 mt-1">{selectedRequest.stage}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">FTE</Label>
            <p className="text-gray-900 mt-1">{selectedRequest.fte}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Priority</Label>
            <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${
              selectedRequest.priority === 'High' ? 'bg-red-100 text-red-700' :
              selectedRequest.priority === 'Normal' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {selectedRequest.priority}
            </span>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Budget Code</Label>
            <p className="text-gray-900 font-mono text-sm mt-1">{selectedRequest.budget_code || '—'}</p>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">Vacancy Reason</Label>
            <p className="text-gray-900 mt-1">
              {selectedRequest.vacancy_reason === 'NewPosition' ? 'New Position' :
               selectedRequest.vacancy_reason === 'Replacement' ? 'Replacement' : 'Load Increase'}
            </p>
          </div>
        </div>

        {(selectedRequest.candidate_name || selectedRequest.candidate_email) && (
          <div className="border-t border-gray-100 pt-4">
            <Label className="text-xs font-semibold text-gray-500 uppercase">Candidate</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              {selectedRequest.candidate_name && <p><span className="font-medium">Name:</span> {selectedRequest.candidate_name}</p>}
              {selectedRequest.candidate_email && <p><span className="font-medium">Email:</span> {selectedRequest.candidate_email}</p>}
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <Button variant="outline" onClick={() => setViewModalOpen(false)}>Close</Button>
        <Button 
          onClick={() => handleNotifyRequester(selectedRequest)} 
          disabled={notifying}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {notifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
          Notify Requester
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
    </div>
  );
}