/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Receipt,
  Calendar
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';

interface Fee {
  id: string;
  fee_type: string;
  amount: number;
  due_date: string;
  status: 'paid' | 'pending' | 'overdue' | 'waived';
  paid_amount?: number;
  paid_date?: string;
  transaction_id?: string;
  payment_method?: string;
  remarks?: string;
}

interface FeeSummary {
  total_due: number;
  total_paid: number;
  total_pending: number;
  paid_count: number;
  pending_count: number;
  next_due_date?: string;
  next_due_amount?: number;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StudentFeesPage() {
  const { toast } = useToast();
  const [fees, setFees] = useState<Fee[]>([]);
  const [summary, setSummary] = useState<FeeSummary>({
    total_due: 0,
    total_paid: 0,
    total_pending: 0,
    paid_count: 0,
    pending_count: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: feesData, error } = await supabase
        .from('fees')
        .select('*')
        .eq('student_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Check for overdue
      const today = new Date().toISOString().split('T')[0];
      const updatedFees = feesData?.map(fee => ({
        ...fee,
        status: fee.status === 'pending' && fee.due_date < today ? 'overdue' : fee.status
      })) || [];

      setFees(updatedFees);

      // Calculate summary
      const summary = updatedFees.reduce((acc, fee) => {
        if (fee.status === 'paid') {
          acc.total_paid += fee.amount;
          acc.paid_count++;
        } else {
          acc.total_pending += fee.amount;
          acc.pending_count++;
        }
        acc.total_due += fee.amount;
        return acc;
      }, { total_due: 0, total_paid: 0, total_pending: 0, paid_count: 0, pending_count: 0 });

      // Find next due
      const pendingFees = updatedFees.filter(f => f.status !== 'paid');
      if (pendingFees.length > 0) {
        summary.next_due_date = pendingFees[0].due_date;
        summary.next_due_amount = pendingFees[0].amount;
      }

      setSummary(summary);
    } catch (error) {
      console.error('Error fetching fees:', error);
      toast({
        title: 'Error',
        description: 'Failed to load fee information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Overdue</Badge>;
      case 'waived':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Waived</Badge>;
      default:
        return null;
    }
  };

  const handlePayment = (feeId: string) => {
    // Integrate with payment gateway
    toast({
      title: 'Payment Gateway',
      description: 'Redirecting to payment page...',
    });
  };

  const downloadReceipt = (feeId: string) => {
    // Generate receipt PDF
    toast({
      title: 'Downloading',
      description: 'Your receipt is being downloaded',
    });
  };

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
          <h1 className="text-3xl font-bold text-gray-900">My Fees</h1>
          <p className="text-gray-600 mt-1">
            View and manage your fee payments
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => window.print()}
        >
          <Download className="h-4 w-4" />
          Download Statement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Due</p>
                <p className="text-2xl font-bold text-blue-900">
                  ₹{summary.total_due.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Paid</p>
                <p className="text-2xl font-bold text-green-900">
                  ₹{summary.total_paid.toLocaleString()}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">
                  ₹{summary.total_pending.toLocaleString()}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Next Due</p>
                <p className="text-lg font-bold text-purple-900">
                  {summary.next_due_date 
                    ? format(new Date(summary.next_due_date), 'MMM d, yyyy')
                    : 'No pending'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      <Card className="mb-6 border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Payment Progress</p>
            <span className="text-sm text-gray-600">
              {summary.paid_count} of {summary.paid_count + summary.pending_count} payments completed
            </span>
          </div>
          <Progress 
            value={summary.total_due > 0 ? (summary.total_paid / summary.total_due) * 100 : 0} 
            className="h-2 mb-4"
          />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Completed Payments</p>
              <p className="font-semibold text-green-600">{summary.paid_count}</p>
            </div>
            <div>
              <p className="text-gray-500">Pending Payments</p>
              <p className="font-semibold text-yellow-600">{summary.pending_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Alert */}
      {fees.some(f => f.status === 'overdue') && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Overdue Payments</p>
                <p className="text-sm text-red-600">
                  You have {fees.filter(f => f.status === 'overdue').length} overdue payments.
                  Please pay immediately to avoid late fees.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee Table */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="text-lg">Fee History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fee Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No fee records found
                  </TableCell>
                </TableRow>
              ) : (
                fees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="capitalize">{fee.fee_type}</TableCell>
                    <TableCell className="font-medium">₹{fee.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {format(new Date(fee.due_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(fee.status)}</TableCell>
                    <TableCell>
                      {fee.paid_date 
                        ? format(new Date(fee.paid_date), 'MMM d, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {fee.transaction_id || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {fee.status !== 'paid' && (
                          <Button
                            size="sm"
                            onClick={() => handlePayment(fee.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay Now
                          </Button>
                        )}
                        {fee.status === 'paid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReceipt(fee.id)}
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            Receipt
                          </Button>
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