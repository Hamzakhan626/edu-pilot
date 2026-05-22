/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Users,
  User,
  Building2,
  CheckCircle,
  Clock,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  X,
  FileText,
  Printer,
  Calendar,
  AlertCircle,
  Plus,
  Edit,
  Send,
  Ban,
  Check,
  Calculator,
  Briefcase,
  CreditCard,
  History,
  Settings
} from 'lucide-react';
import supabase from '@/lib/supabase/client';

// Types
interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  department_id: string | null;
  enrollment_number: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface PayrollRecord {
  id: string;
  user_id: string;
  period: string;
  pay_date: string;
  basic_salary: number;
  allowances: number;
  overtime: number;
  deductions: number;
  net_pay: number;
  gross_pay: number;
  status: 'Draft' | 'PendingApproval' | 'Approved' | 'Paid' | 'OnHold';
  pay_type: 'Monthly' | 'Hourly' | 'Stipend';
  run_type: 'Regular' | 'Overtime' | 'Adjustment';
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  department?: Department;
  creator?: { id: string; full_name: string };
  approver?: { id: string; full_name: string };
}

interface PayrollRun {
  period: string;
  pay_date: string;
  employees: number;
  gross: number;
  deductions: number;
  net: number;
  status: string;
  run_type: string;
}

interface CreatePayrollForm {
  period: string;
  pay_date: string;
  pay_type: 'Monthly' | 'Hourly' | 'Stipend';
  run_type: 'Regular' | 'Overtime' | 'Adjustment';
  department_id: string;
  notes: string;
}

interface EditPayrollForm {
  basic_salary: string;
  allowances: string;
  overtime: string;
  deductions: string;
  notes: string;
}

type PayrollStatus = 'all' | 'Draft' | 'PendingApproval' | 'Approved' | 'Paid' | 'OnHold';
type ViewMode = 'runs' | 'employees';
type ActiveTab = 'payroll' | 'create' | 'history';

// Utility functions
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return formatDate(dateStr) + ' ' + date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusBadge(status: string): string {
  switch (status) {
    case 'Draft':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'PendingApproval':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Approved':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Paid':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'OnHold':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function getMonthYear(): string {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default function FinancePayrollManagementPage() {
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('runs');
  const [activeTab, setActiveTab] = useState<ActiveTab>('payroll');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<PayrollStatus>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  
  // Selected record for details/editing
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showCreateRun, setShowCreateRun] = useState<boolean>(false);
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Forms
  const [createForm, setCreateForm] = useState<CreatePayrollForm>({
    period: getMonthYear(),
    pay_date: new Date().toISOString().split('T')[0],
    pay_type: 'Monthly',
    run_type: 'Regular',
    department_id: 'all',
    notes: ''
  });

  const [editForm, setEditForm] = useState<EditPayrollForm>({
    basic_salary: '',
    allowances: '',
    overtime: '',
    deductions: '',
    notes: ''
  });
  
  // Alert
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const isFinanceRole = userRole === 'finance' || userRole === 'admin';
  const canManagePayroll = isFinanceRole;

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(userData?.role || '');
      }

      const [
        { data: depts },
        { data: users },
        { data: records, error }
      ] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('users').select('*').order('full_name'),
        supabase
          .from('payroll_records')
          .select(`
            *,
            user:user_id (
              id,
              full_name,
              email,
              role,
              phone,
              department_id,
              enrollment_number
            ),
            creator:created_by (
              id,
              full_name
            ),
            approver:approved_by (
              id,
              full_name
            )
          `)
          .order('period', { ascending: false })
          .order('created_at', { ascending: false })
      ]);

      if (error) {
        if (error.code === '42P01') {
          setPayrollRecords([]);
          setAlert({
            type: 'info',
            message: 'Payroll records table not found. Please create the payroll_records table.'
          });
        } else {
          throw error;
        }
      } else {
        const recordsWithDept = (records || []).map(record => ({
          ...record,
          department: record.user?.department_id 
            ? depts?.find(d => d.id === record.user?.department_id)
            : undefined
        }));
        setPayrollRecords(recordsWithDept);
      }

      setDepartments(depts || []);
      setAllUsers(users || []);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load payroll data. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const periods = Array.from(new Set(payrollRecords.map(r => r.period))).sort().reverse();

  // Group records into runs
  const payrollRuns: PayrollRun[] = Object.entries(
    payrollRecords.reduce((acc: Record<string, PayrollRecord[]>, record) => {
      const key = record.period;
      if (!acc[key]) acc[key] = [];
      acc[key].push(record);
      return acc;
    }, {})
  ).map(([period, records]) => ({
    period,
    pay_date: records[0]?.pay_date || '',
    employees: records.length,
    gross: records.reduce((s, r) => s + r.gross_pay, 0),
    deductions: records.reduce((s, r) => s + r.deductions, 0),
    net: records.reduce((s, r) => s + r.net_pay, 0),
    status: records.some(r => r.status === 'PendingApproval') ? 'PendingApproval' :
            records.every(r => r.status === 'Paid') ? 'Paid' :
            records.every(r => r.status === 'Approved' || r.status === 'Paid') ? 'Approved' : 'Draft',
    run_type: records[0]?.run_type || 'Regular'
  }));

  // Statistics
  const totalGross = payrollRecords.reduce((s, r) => s + r.gross_pay, 0);
  const totalNet = payrollRecords.reduce((s, r) => s + r.net_pay, 0);
  const totalDeductions = payrollRecords.reduce((s, r) => s + r.deductions, 0);
  const approvedCount = payrollRecords.filter(r => r.status === 'Approved').length;
  const pendingCount = payrollRecords.filter(r => r.status === 'PendingApproval' || r.status === 'Draft').length;
  const paidCount = payrollRecords.filter(r => r.status === 'Paid').length;
  const uniqueEmployees = new Set(payrollRecords.map(r => r.user_id)).size;

  // ============ FINANCE POWERS ============

  // 1. Create Payroll Run
  const handleCreatePayrollRun = async () => {
    if (!canManagePayroll) return;

    setProcessingAction(true);
    try {
      // Get employees based on department filter
      let employeesQuery = supabase
        .from('users')
        .select('*')
        .in('role', ['teacher', 'hod', 'admin', 'staff']);

      if (createForm.department_id !== 'all') {
        employeesQuery = employeesQuery.eq('department_id', createForm.department_id);
      }

      const { data: employees, error: empError } = await employeesQuery;

      if (empError) throw empError;
      if (!employees || employees.length === 0) {
        setAlert({ type: 'error', message: 'No employees found for the selected criteria' });
        return;
      }

      // Create payroll records for each employee
      const payrollEntries = employees.map(emp => {
        const basicSalary = emp.role === 'hod' ? 320000 :
                           emp.role === 'teacher' ? 300000 :
                           emp.role === 'admin' ? 160000 : 120000;
        const allowances = basicSalary * 0.25;
        const overtime = createForm.run_type === 'Overtime' ? basicSalary * 0.1 : 0;
        const deductions = basicSalary * 0.15;
        const grossPay = basicSalary + allowances + overtime;
        const netPay = grossPay - deductions;

        return {
          user_id: emp.id,
          period: createForm.period,
          pay_date: createForm.pay_date,
          basic_salary: basicSalary,
          allowances: allowances,
          overtime: overtime,
          deductions: deductions,
          net_pay: netPay,
          gross_pay: grossPay,
          status: 'Draft',
          pay_type: createForm.pay_type,
          run_type: createForm.run_type,
          created_by: currentUserId,
          notes: createForm.notes || null
        };
      });

      const { error: insertError } = await supabase
        .from('payroll_records')
        .insert(payrollEntries);

      if (insertError) throw insertError;

      setAlert({ 
        type: 'success', 
        message: `Payroll run created for ${employees.length} employees in ${createForm.period}` 
      });
      setShowCreateRun(false);
      setCreateForm({
        period: getMonthYear(),
        pay_date: new Date().toISOString().split('T')[0],
        pay_type: 'Monthly',
        run_type: 'Regular',
        department_id: 'all',
        notes: ''
      });
      await fetchData();
    } catch (error: unknown) {
      console.error('Error creating payroll run:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payroll run';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setProcessingAction(false);
    }
  };

  // 2. Submit for Approval
  const handleSubmitForApproval = async (recordId: string) => {
    if (!canManagePayroll) return;
    await handleUpdateStatus(recordId, 'PendingApproval');
  };

  // 3. Approve Single Record
  const handleApproveRecord = async (recordId: string) => {
    if (!canManagePayroll) return;
    setUpdatingId(recordId);
    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({
          status: 'Approved',
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) throw error;

      setPayrollRecords(prev =>
        prev.map(r => r.id === recordId ? { 
          ...r, 
          status: 'Approved', 
          approved_by: currentUserId, 
          approved_at: new Date().toISOString() 
        } : r)
      );

      setAlert({ type: 'success', message: 'Record approved successfully' });
    } catch (error: unknown) {
      console.error('Error approving record:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setUpdatingId(null);
    }
  };

  // 4. Approve Entire Period
  const handleApprovePeriod = async (period: string) => {
    if (!canManagePayroll) return;

    setUpdatingId(period);
    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({
          status: 'Approved',
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('period', period)
        .in('status', ['Draft', 'PendingApproval']);

      if (error) throw error;

      setPayrollRecords(prev =>
        prev.map(r => 
          r.period === period && (r.status === 'Draft' || r.status === 'PendingApproval')
            ? { ...r, status: 'Approved', approved_by: currentUserId, approved_at: new Date().toISOString() }
            : r
        )
      );

      setAlert({ type: 'success', message: `All records for ${period} approved` });
    } catch (error: unknown) {
      console.error('Error approving period:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setUpdatingId(null);
    }
  };

  // 5. Mark as Paid
  const handleMarkAsPaid = async (recordId: string) => {
    if (!canManagePayroll) return;
    setUpdatingId(recordId);
    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({
          status: 'Paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) throw error;

      setPayrollRecords(prev =>
        prev.map(r => r.id === recordId ? { ...r, status: 'Paid', paid_at: new Date().toISOString() } : r)
      );

      setAlert({ type: 'success', message: 'Record marked as paid' });
    } catch (error: unknown) {
      console.error('Error marking as paid:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setUpdatingId(null);
    }
  };

  // 6. Mark Period as Paid
  const handleMarkPeriodAsPaid = async (period: string) => {
    if (!canManagePayroll) return;

    setUpdatingId(period);
    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({
          status: 'Paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('period', period)
        .eq('status', 'Approved');

      if (error) throw error;

      setPayrollRecords(prev =>
        prev.map(r => 
          r.period === period && r.status === 'Approved'
            ? { ...r, status: 'Paid', paid_at: new Date().toISOString() }
            : r
        )
      );

      setAlert({ type: 'success', message: `All approved records for ${period} marked as paid` });
    } catch (error: unknown) {
      console.error('Error marking period as paid:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setUpdatingId(null);
    }
  };

  // 7. Put on Hold
  const handlePutOnHold = async (recordId: string) => {
    if (!canManagePayroll) return;
    await handleUpdateStatus(recordId, 'OnHold');
  };

  // 8. Edit Payroll Record
  const handleEditRecord = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setEditForm({
      basic_salary: record.basic_salary.toString(),
      allowances: record.allowances.toString(),
      overtime: record.overtime.toString(),
      deductions: record.deductions.toString(),
      notes: record.notes || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRecord || !canManagePayroll) return;

    setProcessingAction(true);
    try {
      const basicSalary = parseFloat(editForm.basic_salary) || 0;
      const allowances = parseFloat(editForm.allowances) || 0;
      const overtime = parseFloat(editForm.overtime) || 0;
      const deductions = parseFloat(editForm.deductions) || 0;
      const grossPay = basicSalary + allowances + overtime;
      const netPay = grossPay - deductions;

      const { error } = await supabase
        .from('payroll_records')
        .update({
          basic_salary: basicSalary,
          allowances: allowances,
          overtime: overtime,
          deductions: deductions,
          net_pay: netPay,
          gross_pay: grossPay,
          notes: editForm.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRecord.id);

      if (error) throw error;

      setPayrollRecords(prev =>
        prev.map(r => r.id === selectedRecord.id ? {
          ...r,
          basic_salary: basicSalary,
          allowances,
          overtime,
          deductions,
          net_pay: netPay,
          gross_pay: grossPay,
          notes: editForm.notes || null
        } : r)
      );

      setAlert({ type: 'success', message: 'Payroll record updated successfully' });
      setShowEditModal(false);
      setSelectedRecord(null);
    } catch (error: unknown) {
      console.error('Error updating record:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setProcessingAction(false);
    }
  };

  // 9. Delete Payroll Record
  const handleDeleteRecord = async (recordId: string) => {
    if (!canManagePayroll || !confirm('Are you sure you want to delete this payroll record?')) return;

    setUpdatingId(recordId);
    try {
      const { error } = await supabase
        .from('payroll_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      setPayrollRecords(prev => prev.filter(r => r.id !== recordId));
      setAlert({ type: 'success', message: 'Payroll record deleted' });
    } catch (error: unknown) {
      console.error('Error deleting record:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setUpdatingId(null);
    }
  };

  // 10. Delete Entire Run
  const handleDeleteRun = async (period: string) => {
    if (!canManagePayroll || !confirm(`Are you sure you want to delete ALL payroll records for ${period}?`)) return;

    setUpdatingId(period);
    try {
      const { error } = await supabase
        .from('payroll_records')
        .delete()
        .eq('period', period);

      if (error) throw error;

      setPayrollRecords(prev => prev.filter(r => r.period !== period));
      setAlert({ type: 'success', message: `All records for ${period} deleted` });
    } catch (error: unknown) {
      console.error('Error deleting run:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setUpdatingId(null);
    }
  };

  // Generic status update
  const handleUpdateStatus = async (recordId: string, newStatus: PayrollRecord['status']) => {
    if (!canManagePayroll) return;

    setUpdatingId(recordId);
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'Approved') {
        updateData.approved_by = currentUserId;
        updateData.approved_at = new Date().toISOString();
      }
      if (newStatus === 'Paid') {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('payroll_records')
        .update(updateData)
        .eq('id', recordId);

      if (error) throw error;

      setPayrollRecords(prev =>
        prev.map(r => r.id === recordId ? { ...r, ...updateData } as PayrollRecord : r)
      );

      setAlert({ type: 'success', message: `Status updated to ${newStatus}` });
    } catch (error: unknown) {
      console.error('Error updating status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setUpdatingId(null);
    }
  };

  // Export
  const handleExport = () => {
    const csvData = filteredRecords.map(record => ({
      'Employee Name': record.user?.full_name || 'N/A',
      'Employee Code': record.user?.enrollment_number || 'N/A',
      'Department': record.department?.name || 'N/A',
      'Role': record.user?.role || 'N/A',
      'Period': record.period,
      'Pay Type': record.pay_type,
      'Run Type': record.run_type,
      'Basic Salary': record.basic_salary.toString(),
      'Allowances': record.allowances.toString(),
      'Overtime': record.overtime.toString(),
      'Deductions': record.deductions.toString(),
      'Net Pay': record.net_pay.toString(),
      'Gross Pay': record.gross_pay.toString(),
      'Status': record.status,
      'Pay Date': formatDate(record.pay_date)
    }));

    if (csvData.length === 0) return;

    const headers = Object.keys(csvData[0]) as (keyof typeof csvData[0])[];
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Print Payslip
  const handlePrintPayslip = (record: PayrollRecord) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${record.user?.full_name} - ${record.period}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .details { margin-bottom: 20px; }
          .details table { width: 100%; border-collapse: collapse; }
          .details td { padding: 5px; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; font-size: 1.2em; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>University Payroll System</h2>
          <h3>Payslip - ${record.period}</h3>
        </div>
        <div class="details">
          <table>
            <tr><td><strong>Employee:</strong></td><td>${record.user?.full_name || 'N/A'}</td></tr>
            <tr><td><strong>Code:</strong></td><td>${record.user?.enrollment_number || 'N/A'}</td></tr>
            <tr><td><strong>Department:</strong></td><td>${record.department?.name || 'N/A'}</td></tr>
            <tr><td><strong>Role:</strong></td><td>${record.user?.role || 'N/A'}</td></tr>
            <tr><td><strong>Pay Date:</strong></td><td>${formatDate(record.pay_date)}</td></tr>
          </table>
        </div>
        <div class="details">
          <h4>Earnings</h4>
          <table>
            <tr><td>Basic Salary</td><td class="total">Rs ${record.basic_salary.toLocaleString()}</td></tr>
            <tr><td>Allowances</td><td>Rs ${record.allowances.toLocaleString()}</td></tr>
            <tr><td>Overtime</td><td>Rs ${record.overtime.toLocaleString()}</td></tr>
            <tr><td><strong>Gross Pay</strong></td><td class="total"><strong>Rs ${record.gross_pay.toLocaleString()}</strong></td></tr>
          </table>
        </div>
        <div class="details">
          <h4>Deductions</h4>
          <table>
            <tr><td>Deductions</td><td>Rs ${record.deductions.toLocaleString()}</td></tr>
          </table>
        </div>
        <div class="details" style="border-top: 2px solid #000; padding-top: 10px;">
          <table>
            <tr><td class="total">Net Pay</td><td class="total">Rs ${record.net_pay.toLocaleString()}</td></tr>
          </table>
        </div>
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">🖨️ Print Payslip</button>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  // Filter records
  const filteredRecords = payrollRecords.filter(record => {
    const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
    const matchesPeriod = selectedPeriod === 'all' || record.period === selectedPeriod;
    const matchesDepartment = selectedDepartment === 'all' || record.user?.department_id === selectedDepartment;

    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      (record.user?.full_name ?? '').toLowerCase().includes(q) ||
      (record.user?.enrollment_number ?? '').toLowerCase().includes(q) ||
      (record.user?.role ?? '').toLowerCase().includes(q) ||
      (record.department?.name ?? '').toLowerCase().includes(q) ||
      record.period.toLowerCase().includes(q);

    return matchesStatus && matchesPeriod && matchesDepartment && matchesSearch;
  });

  const filteredRuns = payrollRuns.filter(run => {
    const matchesStatus = selectedStatus === 'all' || run.status === selectedStatus;
    const matchesPeriod = selectedPeriod === 'all' || run.period === selectedPeriod;
    return matchesStatus && matchesPeriod;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6">
          <Skeleton className="h-8 w-48 bg-white/20" />
          <Skeleton className="h-4 w-72 mt-2 bg-white/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={`skeleton-${i}`} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 rounded-xl mb-3" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Payroll Management</h1>
            <p className="text-emerald-100">
              Create, manage, approve and process payroll for all employees
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canManagePayroll && (
              <Button 
                onClick={() => setShowCreateRun(true)}
                className="bg-white text-emerald-700 hover:bg-emerald-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Payroll Run
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchData}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button 
              onClick={handleExport}
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <Alert
          variant={alert.type === 'error' ? 'destructive' : 'default'}
          className={
            alert.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : alert.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }
        >
          {alert.type === 'success' ? <CheckCircle className="h-4 w-4" /> : 
           alert.type === 'error' ? <AlertCircle className="h-4 w-4" /> : 
           <FileText className="h-4 w-4" />}
          <AlertDescription>{alert.message}</AlertDescription>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAlert(null)}>
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Gross', value: `Rs ${totalGross.toLocaleString()}`, icon: DollarSign, color: 'blue', note: `${payrollRecords.length} records` },
          { label: 'Total Net Pay', value: `Rs ${totalNet.toLocaleString()}`, icon: CheckCircle, color: 'green', note: `Deductions: Rs ${totalDeductions.toLocaleString()}` },
          { label: 'Status Overview', value: `${approvedCount}A / ${pendingCount}P / ${paidCount}Paid`, icon: Clock, color: 'orange', note: 'Approved / Pending / Paid' },
          { label: 'Employees', value: uniqueEmployees, icon: Users, color: 'purple', note: `${periods.length} periods` }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            orange: 'bg-orange-100 text-orange-600',
            purple: 'bg-purple-100 text-purple-600'
          };
          return (
            <Card key={`stat-${idx}`} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-xl ${colorMap[stat.color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {stat.label.includes('Net') ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View Mode & Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-2">
              <Button variant={viewMode === 'runs' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('runs')}>
                <Building2 className="h-4 w-4 mr-2" />Payroll Runs
              </Button>
              <Button variant={viewMode === 'employees' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('employees')}>
                <Users className="h-4 w-4 mr-2" />Employee Details
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Filter records</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="all">All Periods</option>
              {periods.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as PayrollStatus)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="all">All Status</option>
              <option value="Draft">Draft</option>
              <option value="PendingApproval">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Paid">Paid</option>
              <option value="OnHold">On Hold</option>
            </select>
            <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="all">All Departments</option>
              {departments.map((dept) => (<option key={dept.id} value={dept.id}>{dept.name}</option>))}
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search by name, code, department, or period..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* Payroll Runs View */}
      {viewMode === 'runs' && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Payroll Runs ({filteredRuns.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRuns.map((run) => (
                <div key={run.period} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="flex gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-700" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{run.period} • {run.run_type}</p>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${getStatusBadge(run.status)}`}>{run.status}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{run.employees} employees • Pay: {formatDate(run.pay_date)}</p>
                        <p className="text-xs text-gray-500">Gross: Rs {run.gross.toLocaleString()} • Net: Rs {run.net.toLocaleString()}</p>
                      </div>
                    </div>
                    {canManagePayroll && (
                      <div className="flex flex-wrap gap-1">
                        {(run.status === 'Draft' || run.status === 'PendingApproval') && (
                          <Button size="sm" variant="outline" onClick={() => handleApprovePeriod(run.period)} disabled={updatingId === run.period} className="bg-emerald-50 text-emerald-700">
                            {updatingId === run.period ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}Approve
                          </Button>
                        )}
                        {run.status === 'Approved' && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkPeriodAsPaid(run.period)} disabled={updatingId === run.period} className="bg-blue-50 text-blue-700">
                            {updatingId === run.period ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CreditCard className="h-3 w-3 mr-1" />}Mark Paid
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDeleteRun(run.period)} disabled={updatingId === run.period}>
                          <Ban className="h-3 w-3 mr-1" />Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredRuns.length === 0 && (
                <div className="text-center py-8">
                  <DollarSign className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No payroll runs found.</p>
                  {canManagePayroll && (
                    <Button onClick={() => setShowCreateRun(true)} className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />Create First Run
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Details View */}
      {viewMode === 'employees' && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Employee Payroll Details ({filteredRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div key={record.id} className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${updatingId === record.id ? 'opacity-60' : ''}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="flex gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        {updatingId === record.id ? <Loader2 className="h-5 w-5 text-emerald-700 animate-spin" /> : <User className="h-5 w-5 text-emerald-700" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{record.user?.full_name || 'Unknown'}</p>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border">{record.user?.enrollment_number || 'N/A'}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${getStatusBadge(record.status)}`}>{record.status}</span>
                        </div>
                        <p className="text-xs text-gray-600">{record.department?.name || 'N/A'} • {record.user?.role || 'N/A'}</p>
                        <p className="text-xs text-gray-500">Period: {record.period} • {record.pay_type} • {record.run_type}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600 lg:text-right">
                      <div><p className="text-[11px] text-gray-500">Basic</p><p className="font-semibold">Rs {record.basic_salary.toLocaleString()}</p></div>
                      <div><p className="text-[11px] text-gray-500">Allowances</p><p className="font-semibold">Rs {record.allowances.toLocaleString()}</p></div>
                      <div><p className="text-[11px] text-gray-500">Overtime</p><p className="font-semibold text-emerald-700">Rs {record.overtime.toLocaleString()}</p></div>
                      <div><p className="text-[11px] text-gray-500">Deductions</p><p className="font-semibold text-red-600">Rs {record.deductions.toLocaleString()}</p></div>
                      <div className="md:col-span-2"><p className="text-[11px] text-gray-500">Net Pay</p><p className="font-semibold text-emerald-700 text-sm">Rs {record.net_pay.toLocaleString()}</p></div>
                      <div className="md:col-span-2 flex gap-1 lg:justify-end flex-wrap">
                        {canManagePayroll && record.status === 'Draft' && (
                          <Button size="sm" variant="outline" onClick={() => handleSubmitForApproval(record.id)} disabled={updatingId === record.id}>
                            <Send className="h-3 w-3 mr-1" />Submit
                          </Button>
                        )}
                        {canManagePayroll && (record.status === 'Draft' || record.status === 'PendingApproval') && (
                          <Button size="sm" variant="outline" onClick={() => handleApproveRecord(record.id)} disabled={updatingId === record.id} className="bg-emerald-50 text-emerald-700">
                            <Check className="h-3 w-3 mr-1" />Approve
                          </Button>
                        )}
                        {canManagePayroll && record.status === 'Approved' && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(record.id)} disabled={updatingId === record.id}>
                            <CreditCard className="h-3 w-3 mr-1" />Pay
                          </Button>
                        )}
                        {canManagePayroll && record.status !== 'Paid' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleEditRecord(record)}>
                              <Edit className="h-3 w-3 mr-1" />Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handlePutOnHold(record.id)} disabled={updatingId === record.id}>
                              <Ban className="h-3 w-3 mr-1" />Hold
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handlePrintPayslip(record)}>
                          <Printer className="h-3 w-3 mr-1" />Payslip
                        </Button>
                        {canManagePayroll && (
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDeleteRecord(record.id)}>
                            <X className="h-3 w-3 mr-1" />Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Payroll Run Modal */}
      {showCreateRun && canManagePayroll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Create New Payroll Run</h2>
              <p className="text-xs text-gray-600 mt-1">Generate payroll records for all employees</p>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period *</label>
                <Input value={createForm.period} onChange={(e) => setCreateForm({ ...createForm, period: e.target.value })} placeholder="e.g., Dec 2024" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pay Date *</label>
                <Input type="date" value={createForm.pay_date} onChange={(e) => setCreateForm({ ...createForm, pay_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pay Type</label>
                <select value={createForm.pay_type} onChange={(e) => setCreateForm({ ...createForm, pay_type: e.target.value as 'Monthly' | 'Hourly' | 'Stipend' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="Monthly">Monthly</option>
                  <option value="Hourly">Hourly</option>
                  <option value="Stipend">Stipend</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Run Type</label>
                <select value={createForm.run_type} onChange={(e) => setCreateForm({ ...createForm, run_type: e.target.value as 'Regular' | 'Overtime' | 'Adjustment' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="Regular">Regular</option>
                  <option value="Overtime">Overtime</option>
                  <option value="Adjustment">Adjustment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select value={createForm.department_id} onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (<option key={dept.id} value={dept.id}>{dept.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} placeholder="Optional notes..." />
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCreateRun(false)} disabled={processingAction}>Cancel</Button>
                <Button onClick={handleCreatePayrollRun} disabled={processingAction || !createForm.period} className="bg-emerald-600 hover:bg-emerald-700">
                  {processingAction ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><Plus className="h-4 w-4 mr-2" />Create Run</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payroll Modal */}
      {showEditModal && selectedRecord && canManagePayroll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold">Edit Payroll Record</h2>
              <p className="text-xs text-gray-600">{selectedRecord.user?.full_name} - {selectedRecord.period}</p>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary</label>
                <Input type="number" value={editForm.basic_salary} onChange={(e) => setEditForm({ ...editForm, basic_salary: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allowances</label>
                <Input type="number" value={editForm.allowances} onChange={(e) => setEditForm({ ...editForm, allowances: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overtime</label>
                <Input type="number" value={editForm.overtime} onChange={(e) => setEditForm({ ...editForm, overtime: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deductions</label>
                <Input type="number" value={editForm.deductions} onChange={(e) => setEditForm({ ...editForm, deductions: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} />
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => { setShowEditModal(false); setSelectedRecord(null); }}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={processingAction} className="bg-emerald-600 hover:bg-emerald-700">
                  {processingAction ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <>Save Changes</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}