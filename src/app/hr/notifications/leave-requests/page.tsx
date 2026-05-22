/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';
import { getCurrentUser } from '@/lib/auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaveRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  department_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  applied_on: string;
  reviewed_by?: string;
  reviewed_at?: string;
  comments?: string;
}

interface LeaveStats {
  total_pending: number;
  total_approved: number;
  total_rejected: number;
  employees_on_leave: number;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HoDLeaveRequestsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<LeaveStats>({
    total_pending: 0,
    total_approved: 0,
    total_rejected: 0,
    employees_on_leave: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [processing, setProcessing] = useState(false);

  // Auth & department
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (currentUser.role !== 'hod' && currentUser.role !== 'admin') {
      router.push('/login');
      return;
    }
    setUser(currentUser);

    supabase
      .from('departments')
      .select('id, name, code')
      .eq('hod_id', currentUser.id)
      .maybeSingle()
      .then(({ data: dept, error }) => {
        if (error || !dept) {
          toast({
            title: 'Error',
            description: 'No department assigned to your account.',
            variant: 'destructive',
          });
          router.push('/hod/programs');
          return;
        }
        setDepartment(dept);
      });
  }, []);

  // Data fetching
  const fetchLeaveRequests = useCallback(async () => {
    if (!department) return;
    const { data: leaves, error } = await supabase
      .from('leave_requests')
      .select(
        `id, user_id, leave_type, start_date, end_date, days, reason, status, applied_on, reviewed_by, reviewed_at, comments,
         users!inner(
           full_name, role,
           departments!inner(name)
         )`
      )
      .eq('users.departments.id', department.id)
      .order('applied_on', { ascending: false });

    if (error) throw error;

    const formatted: LeaveRequest[] = (leaves ?? []).map((leave: any) => ({
      id: leave.id,
      user_id: leave.user_id,
      user_name: leave.users?.full_name || 'Unknown',
      user_role: leave.users?.role || 'staff',
      department_name: leave.users?.departments?.name || department.name,
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      end_date: leave.end_date,
      days: leave.days,
      reason: leave.reason,
      status: leave.status,
      applied_on: leave.applied_on,
      reviewed_by: leave.reviewed_by,
      reviewed_at: leave.reviewed_at,
      comments: leave.comments,
    }));

    setRequests(formatted);
  }, [department]);

  const fetchLeaveStats = useCallback(async () => {
    if (!department) return;
    const { data: leaves, error } = await supabase
      .from('leave_requests')
      .select('status, user_id, start_date, end_date, users!inner(departments!inner(id))')
      .eq('users.departments.id', department.id);

    if (error) throw error;
    const list = leaves ?? [];

    const pending = list.filter((l) => l.status === 'pending').length;
    const approved = list.filter((l) => l.status === 'approved').length;
    const rejected = list.filter((l) => l.status === 'rejected').length;

    const today = new Date().toISOString().split('T')[0];
    const onLeave = list.filter(
      (l) =>
        l.status === 'approved' &&
        l.start_date <= today &&
        l.end_date >= today
    ).length;

    setStats({
      total_pending: pending,
      total_approved: approved,
      total_rejected: rejected,
      employees_on_leave: onLeave,
    });
  }, [department]);

  const fetchData = useCallback(async () => {
    if (!department) return;
    try {
      setLoading(true);
      await Promise.all([fetchLeaveRequests(), fetchLeaveStats()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load leave requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [department, fetchLeaveRequests, fetchLeaveStats, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReview = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      setProcessing(true);
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          reviewed_by: userData.user?.id,
          reviewed_at: new Date().toISOString(),
          comments: reviewComment,
        })
        .eq('id', requestId);

      if (error) throw error;

      // Create notification
      const request = requests.find((r) => r.id === requestId);
      if (request) {
        await supabase.from('notifications').insert({
          user_id: request.user_id,
          title: `Leave Request ${status}`,
          message: `Your leave request for ${request.days} days has been ${status}.${reviewComment ? ` Comment: ${reviewComment}` : ''}`,
          notification_type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
          related_entity_id: requestId,
          related_entity_type: 'leave',
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      await fetchData();
      toast({ title: 'Success', description: `Leave request ${status}` });
      setSelectedRequest(null);
      setReviewComment('');
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to process request', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = req.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Cancelled</Badge>;
      default:
        return null;
    }
  };

  if (loading || !department) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl bg-white min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/hod/dashboard')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Leave Requests</h1>
        <p className="text-gray-600 mt-1">
          {department.name} ({department.code}) – Manage leave applications
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.total_pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Approved (Total)</p>
                <p className="text-2xl font-bold text-green-900">{stats.total_approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Rejected</p>
                <p className="text-2xl font-bold text-red-900">{stats.total_rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">On Leave Today</p>
                <p className="text-2xl font-bold text-blue-900">{stats.employees_on_leave}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Pending Requests</p>
                <p className="text-sm text-yellow-600">
                  You have {pendingCount} leave requests pending review
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No leave requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {request.user_name.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{request.user_name}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {request.user_role} • {request.department_name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize font-medium">{request.leave_type}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(request.start_date), 'MMM d')}</div>
                        <div className="text-gray-500">
                          to {format(new Date(request.end_date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{request.days} days</TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-gray-600 truncate" title={request.reason}>
                        {request.reason}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(request.applied_on), 'MMM d')}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(request.applied_on), 'h:mm a')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-right">
                      {request.status === 'pending' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-white max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Review Leave Request</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center gap-3 mb-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-blue-100 text-blue-700">
                                      {request.user_name.split(' ').map((n) => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-gray-900">{request.user_name}</p>
                                    <p className="text-sm text-gray-600">
                                      {request.user_role} • {request.department_name}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-500">Leave Type</p>
                                    <p className="font-medium capitalize">{request.leave_type}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Duration</p>
                                    <p className="font-medium">{request.days} days</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Start Date</p>
                                    <p className="font-medium">
                                      {format(new Date(request.start_date), 'PPP')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">End Date</p>
                                    <p className="font-medium">
                                      {format(new Date(request.end_date), 'PPP')}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <p className="text-gray-500 text-sm">Reason</p>
                                  <p className="text-gray-700">{request.reason}</p>
                                </div>
                              </div>
                              <Textarea
                                placeholder="Add comments (optional)..."
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                rows={3}
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => handleReview(request.id, 'approved')}
                                  disabled={processing}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {processing ? 'Processing...' : 'Approve'}
                                </Button>
                                <Button
                                  onClick={() => handleReview(request.id, 'rejected')}
                                  disabled={processing}
                                  variant="destructive"
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}