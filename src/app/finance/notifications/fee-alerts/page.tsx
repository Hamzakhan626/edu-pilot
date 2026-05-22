/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Download,
  Send,
  Search,
  TrendingUp,
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';

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
import { Skeleton } from '@/components/ui/skeleton';

// ---------- Types ----------
interface FeeAlert {
  id: string;
  student_id: string;
  student_name: string;
  enrollment_number: string;
  department_name: string;
  semester: number;
  fee_type: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'overdue' | 'paid' | 'waived';
  days_overdue?: number;
  created_at: string;
}

interface FeeStats {
  total_collected: number;
  total_pending: number;
  total_overdue: number;
  collection_rate: number;
  students_paid: number;
  students_pending: number;
  students_overdue: number;
}

interface Department {
  id: string;
  name: string;
}

// Supabase client
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FeeAlertsPage() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<FeeAlert[]>([]);
  const [stats, setStats] = useState<FeeStats>({
    total_collected: 0,
    total_pending: 0,
    total_overdue: 0,
    collection_rate: 0,
    students_paid: 0,
    students_pending: 0,
    students_overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<FeeAlert | null>(null);
  const [reminderMessage, setReminderMessage] = useState('');
  const [sending, setSending] = useState(false);

  // ---------- Data fetching ----------
  const fetchFeeAlerts = useCallback(async () => {
    const { data: fees, error } = await supabase
      .from('fees')
      .select(
        `id, student_id, amount, due_date, status, fee_type, created_at,
         users!inner(
           full_name, enrollment_number, semester, department_id,
           departments(name)
         )`
      )
      .order('due_date', { ascending: true });

    if (error) throw error;

    const today = new Date();
    const formatted: FeeAlert[] = (fees ?? []).map((fee: any) => {
      const dueDate = new Date(fee.due_date);
      const daysOverdue =
        dueDate < today
          ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

      const effectiveStatus =
        fee.status === 'pending' && daysOverdue > 0 ? 'overdue' : fee.status;

      return {
        id: fee.id,
        student_id: fee.student_id,
        student_name: fee.users?.full_name ?? 'Unknown',
        enrollment_number: fee.users?.enrollment_number ?? 'N/A',
        department_name: fee.users?.departments?.name ?? 'N/A',
        semester: fee.users?.semester ?? 1,
        fee_type: fee.fee_type,
        amount: fee.amount,
        due_date: fee.due_date,
        status: effectiveStatus as FeeAlert['status'],
        days_overdue: daysOverdue > 0 ? daysOverdue : undefined,
        created_at: fee.created_at,
      };
    });

    setAlerts(formatted);
  }, []);

  const fetchDepartments = useCallback(async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .order('name');
    if (error) throw error;
    setDepartments((data as Department[]) ?? []);
  }, []);

  const fetchFeeStats = useCallback(async () => {
    const { data: fees, error } = await supabase
      .from('fees')
      .select('amount, status, due_date, student_id');

    if (error) throw error;
    const feeList = fees ?? [];

    const totalCollected = feeList
      .filter((f) => f.status === 'paid')
      .reduce((sum, f) => sum + f.amount, 0);
    const totalPending = feeList
      .filter((f) => f.status === 'pending')
      .reduce((sum, f) => sum + f.amount, 0);

    // Unique students
    const uniqueStudents = new Set(feeList.map((f) => f.student_id));

    const paidStudents = new Set(
      feeList.filter((f) => f.status === 'paid').map((f) => f.student_id)
    ).size;
    const pendingStudents = new Set(
      feeList.filter((f) => f.status === 'pending').map((f) => f.student_id)
    ).size;

    // Overdue = pending and past due date
    const today = new Date();
    const overdueFees = feeList.filter((f) => {
      if (f.status !== 'pending') return false;
      return new Date(f.due_date) < today;
    });
    const totalOverdue = overdueFees.reduce((sum, f) => sum + f.amount, 0);
    const overdueStudents = new Set(overdueFees.map((f) => f.student_id)).size;

    const totalAmount = totalCollected + totalPending;
    setStats({
      total_collected: totalCollected,
      total_pending: totalPending,
      total_overdue: totalOverdue,
      collection_rate: totalAmount > 0 ? (totalCollected / totalAmount) * 100 : 0,
      students_paid: paidStudents,
      students_pending: pendingStudents,
      students_overdue: overdueStudents,
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchFeeAlerts(), fetchDepartments(), fetchFeeStats()]);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load fee alerts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchFeeAlerts, fetchDepartments, fetchFeeStats, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------- Actions ----------
  const markAsPaid = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('fees')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      await fetchData();
      toast({
        title: 'Success',
        description: 'Payment recorded',
        className: 'bg-white border-green-200',
      });
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const sendReminder = async () => {
    if (!selectedAlert || !reminderMessage.trim()) return;

    try {
      setSending(true);
      const { error } = await supabase.from('notifications').insert({
        user_id: selectedAlert.student_id,
        title: 'Fee Payment Reminder',
        message: reminderMessage,
        notification_type: 'fee_reminder',
        related_entity_id: selectedAlert.id,
        related_entity_type: 'fee',
        is_read: false,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reminder sent successfully',
        className: 'bg-white border-green-200',
      });
      setSelectedAlert(null);
      setReminderMessage('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // ---------- Filtering ----------
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.enrollment_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    const matchesDept =
      departmentFilter === 'all' || alert.department_name === departmentFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const overdueCount = alerts.filter((a) => a.status === 'overdue').length;

  // ---------- CSV helpers ----------
  const generateCSV = (data: FeeAlert[]) => {
    const headers = [
      'Student Name',
      'Enrollment No',
      'Department',
      'Semester',
      'Fee Type',
      'Amount',
      'Due Date',
      'Status',
    ];
    const rows = data.map((a) => [
      a.student_name,
      a.enrollment_number,
      a.department_name,
      a.semester,
      a.fee_type,
      a.amount,
      format(new Date(a.due_date), 'yyyy-MM-dd'),
      a.status,
    ]);
    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">Overdue</Badge>
        );
      case 'waived':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">Waived</Badge>
        );
      default:
        return null;
    }
  };

  // ---------- UI ----------
  if (loading) {
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fee Alerts</h1>
          <p className="text-gray-600 mt-1">Monitor and manage student fee payments</p>
        </div>
        <Button
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => {
            const csv = generateCSV(filteredAlerts);
            downloadCSV(csv, 'fee-alerts.csv');
          }}
        >
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Collected</p>
                <p className="text-2xl font-bold text-green-900">
                  ₹{(stats.total_collected / 100000).toFixed(1)}L
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">
                  ₹{(stats.total_pending / 100000).toFixed(1)}L
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Overdue</p>
                <p className="text-2xl font-bold text-red-900">
                  ₹{(stats.total_overdue / 100000).toFixed(1)}L
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Collection Rate</p>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.collection_rate.toFixed(1)}%
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection Progress */}
      <Card className="mb-6 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Collection Progress</p>
            <span className="text-sm text-gray-600">
              {stats.collection_rate.toFixed(1)}%
            </span>
          </div>
          <Progress value={stats.collection_rate} className="h-2 mb-4" />
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Students Paid</p>
              <p className="font-semibold text-green-600">{stats.students_paid}</p>
            </div>
            <div>
              <p className="text-gray-500">Students Pending</p>
              <p className="font-semibold text-yellow-600">{stats.students_pending}</p>
            </div>
            <div>
              <p className="text-gray-500">Students Overdue</p>
              <p className="font-semibold text-red-600">{stats.students_overdue}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Banner */}
      {overdueCount > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Overdue Payments</p>
                <p className="text-sm text-red-600">
                  {overdueCount} students have overdue payments. Send reminders.
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
                placeholder="Search by name or enrollment..."
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
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Fee Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No fee alerts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{alert.student_name}</p>
                        <p className="text-sm text-gray-500">{alert.enrollment_number}</p>
                        <p className="text-xs text-gray-400">
                          {alert.department_name} • Sem {alert.semester}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{alert.fee_type}</TableCell>
                    <TableCell className="font-medium">
                      ₹{alert.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p
                          className={
                            new Date(alert.due_date) < new Date()
                              ? 'text-red-600 font-medium'
                              : ''
                          }
                        >
                          {format(new Date(alert.due_date), 'MMM d, yyyy')}
                        </p>
                        {alert.days_overdue && (
                          <p className="text-xs text-red-500">
                            {alert.days_overdue} days overdue
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(alert.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {alert.status !== 'paid' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsPaid(alert.id)}
                              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Paid
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAlert(alert);
                                    setReminderMessage(
                                      `Dear ${alert.student_name}, kindly pay your ${alert.fee_type} fee of ₹${alert.amount} by ${format(new Date(alert.due_date), 'MMM d, yyyy')}.`
                                    );
                                  }}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Remind
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white">
                                <DialogHeader>
                                  <DialogTitle>
                                    Send Reminder to {alert.student_name}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <Textarea
                                    placeholder="Enter reminder message..."
                                    value={reminderMessage}
                                    onChange={(e) => setReminderMessage(e.target.value)}
                                    rows={4}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => setSelectedAlert(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button onClick={sendReminder} disabled={sending}>
                                      {sending ? 'Sending...' : 'Send Reminder'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                      </div>
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