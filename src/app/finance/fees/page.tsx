/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Wallet,
  DollarSign,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Calendar,
  Users,
  Search,
  Filter,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  Edit,
  Send,
  Ban,
  Check,
  X,
  FileText,
  Printer,
  Mail,
  AlertTriangle,
  Percent,
  Receipt,
  Banknote,
  Coins,
  CalendarDays,
  Hash,
  Building2,
  BookOpen
} from 'lucide-react';
import supabase from '@/lib/supabase/client';

// Types
interface Student {
  id: string;
  full_name: string;
  enrollment_number: string;
  email: string;
  semester: number;
  department_id: string;
}

interface FeeStructure {
  id: string;
  name: string;
  program_id: string;
  base_tuition: number;
  hostel_fee: number;
  transport_fee: number;
  misc_fee: number;
}

interface FeePayment {
  id: string;
  student_fee_id: string;
  installment_id: string | null;
  amount: number;
  payment_method: string | null;
  payment_date: string;
  reference_no: string | null;
  received_by: string | null;
  status: 'success' | 'failed' | 'pending' | 'refunded';
  remarks: string | null;
}

interface FeeInstallment {
  id: string;
  student_fee_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  payment_reference: string | null;
}

interface FeeChallan {
  created_at: any;
  id: string;
  student_fee_id: string;
  installment_id: string | null;
  challan_number: string;
  total_amount: number;
  due_date: string;
  status: 'generated' | 'issued' | 'paid' | 'cancelled' | 'overdue';
  payment_method: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  bank_details: Record<string, unknown> | null;
  billing_address: string | null;
  issued_by: string | null;
  issued_at: string | null;
  notes: string | null;
}

interface StudentFee {
  id: string;
  student_id: string;
  fee_structure_id: string | null;
  actual_tuition: number;
  actual_hostel: number;
  actual_transport: number;
  actual_misc: number;
  actual_total: number;
  discount_type: string;
  discount_value: number;
  discount_reason: string | null;
  payable_total: number;
  already_paid: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  fee_structure?: FeeStructure;
  payments?: FeePayment[];
  installments?: FeeInstallment[];
  challans?: FeeChallan[];
}

interface FeeCategory {
  id: string;
  name: string;
  code: string;
  default_amount: number;
  is_mandatory: boolean;
  description: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Program {
  id: string;
  name: string;
  department_id: string;
}

interface AddPaymentForm {
  amount: string;
  payment_method: string;
  reference_no: string;
  remarks: string;
  payment_date: string;
}

interface GenerateChallanForm {
  amount: string;
  due_date: string;
  bank_details: string;
  billing_address: string;
  notes: string;
  payment_method: string;
}

interface AddFineForm {
  amount: string;
  fine_type: string;
  reason: string;
  due_date: string;
}

interface CreateInstallmentForm {
  total_amount: string;
  number_of_installments: string;
  start_date: string;
  interval_days: string;
}

type FeeStatus = 'all' | 'pending' | 'partial' | 'paid' | 'overdue';
type AlertType = 'success' | 'error' | 'info';
type ActiveTab = 'fees' | 'challans' | 'fines' | 'installments';

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

function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = now.getTime() - due.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getAgingBucket(days: number): string {
  if (days <= 0) return 'Current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

function getStatusBadge(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'partial':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'pending':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'overdue':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'generated':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'issued':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'cancelled':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'success':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'refunded':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export default function FinanceFeeCollectionPage() {
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('fees');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<FeeStatus>('all');
  const [selectedAge, setSelectedAge] = useState<string>('all');

  // Selected fee for details
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [showAddPayment, setShowAddPayment] = useState<boolean>(false);
  const [showGenerateChallan, setShowGenerateChallan] = useState<boolean>(false);
  const [showAddFine, setShowAddFine] = useState<boolean>(false);
  const [showCreateInstallments, setShowCreateInstallments] = useState<boolean>(false);
  
  // Form states
  const [addPaymentForm, setAddPaymentForm] = useState<AddPaymentForm>({
    amount: '',
    payment_method: 'cash',
    reference_no: '',
    remarks: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  const [challanForm, setChallanForm] = useState<GenerateChallanForm>({
    amount: '',
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    bank_details: '',
    billing_address: '',
    notes: '',
    payment_method: 'bank_transfer'
  });

  const [fineForm, setFineForm] = useState<AddFineForm>({
    amount: '',
    fine_type: 'late_fee',
    reason: '',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [installmentForm, setInstallmentForm] = useState<CreateInstallmentForm>({
    total_amount: '',
    number_of_installments: '2',
    start_date: new Date().toISOString().split('T')[0],
    interval_days: '30'
  });

  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [updatingFeeId, setUpdatingFeeId] = useState<string | null>(null);
  
  // Alert
  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  // Check if user has finance powers
  const isFinanceRole = userRole === 'finance' || userRole === 'admin';
  const canManageFees = isFinanceRole;

  // Initial data fetch
  const fetchInitialData = useCallback(async () => {
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
        { data: progs },
        { data: categories },
        { data: fees, error }
      ] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('programs').select('*').order('name'),
        supabase.from('fee_categories').select('*').order('display_order'),
        supabase
          .from('student_fees')
          .select(`
            *,
            student:student_id (
              id,
              full_name,
              enrollment_number,
              email,
              semester,
              department_id
            ),
            fee_structure:fee_structure_id (
              id,
              name,
              program_id,
              base_tuition,
              hostel_fee,
              transport_fee,
              misc_fee
            ),
            payments:fee_payments (*),
            installments:fee_installments (*),
            challans:fee_challans (*)
          `)
          .order('created_at', { ascending: false })
      ]);

      if (error) throw error;

      setDepartments(depts || []);
      setPrograms(progs || []);
      setFeeCategories(categories || []);
      setStudentFees(fees || []);
    } catch (error) {
      console.error('Error fetching fee data:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load fee data. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const updateFeeInState = useCallback((updatedFee: StudentFee) => {
    setStudentFees(prev => 
      prev.map(fee => fee.id === updatedFee.id ? updatedFee : fee)
    );
    setSelectedFee(updatedFee);
  }, []);

  const fetchFeeDetails = useCallback(async (feeId: string) => {
    const { data, error } = await supabase
      .from('student_fees')
      .select(`
        *,
        student:student_id (
          id,
          full_name,
          enrollment_number,
          email,
          semester,
          department_id
        ),
        fee_structure:fee_structure_id (
          id,
          name,
          program_id,
          base_tuition,
          hostel_fee,
          transport_fee,
          misc_fee
        ),
        payments:fee_payments (*),
        installments:fee_installments (*),
        challans:fee_challans (*)
      `)
      .eq('id', feeId)
      .single();

    if (!error && data) {
      setSelectedFee(data);
      updateFeeInState(data);
    }
    return data;
  }, [updateFeeInState]);

  const getStudentProgram = (fee: StudentFee): string => {
    if (fee.fee_structure?.program_id) {
      const program = programs.find(p => p.id === fee.fee_structure?.program_id);
      if (program) return program.name;
    }
    if (fee.student?.department_id) {
      const dept = departments.find(d => d.id === fee.student?.department_id);
      if (dept) return dept.name;
    }
    return 'N/A';
  };

  const getStudentDepartment = (fee: StudentFee): string => {
    if (fee.student?.department_id) {
      const dept = departments.find(d => d.id === fee.student?.department_id);
      if (dept) return dept.name;
    }
    return 'N/A';
  };

  const getStudentName = (fee: StudentFee): string => {
    return fee.student?.full_name || 'Unknown Student';
  };

  const getEnrollmentNumber = (fee: StudentFee): string => {
    return fee.student?.enrollment_number || 'N/A';
  };

  const getSemester = (fee: StudentFee): number | null => {
    return fee.student?.semester ?? null;
  };

  // Statistics
  const totalBilled = studentFees.reduce((s, f) => s + f.payable_total, 0);
  const totalCollected = studentFees.reduce((s, f) => s + f.already_paid, 0);
  const totalOutstanding = totalBilled - totalCollected;
  const overdueCount = studentFees.filter(f => f.status === 'overdue').length;
  const partialCount = studentFees.filter(f => f.status === 'partial').length;
  const pendingCount = studentFees.filter(f => f.status === 'pending').length;
  const paidCount = studentFees.filter(f => f.status === 'paid').length;
  const totalChallansGenerated = studentFees.reduce((s, f) => s + (f.challans?.length || 0), 0);

  // Finance Operations

  // 1. Add Payment
  const handleAddPayment = async () => {
    if (!selectedFee || !canManageFees) return;
    
    const amount = parseFloat(addPaymentForm.amount);
    if (!amount || amount <= 0) {
      setAlert({ type: 'error', message: 'Please enter a valid amount' });
      return;
    }

    const balance = selectedFee.payable_total - selectedFee.already_paid;
    if (amount > balance) {
      setAlert({ type: 'error', message: `Amount exceeds balance of Rs ${balance.toLocaleString()}` });
      return;
    }

    setProcessingAction(true);
    setUpdatingFeeId(selectedFee.id);
    try {
      const { error: paymentError } = await supabase
        .from('fee_payments')
        .insert({
          student_fee_id: selectedFee.id,
          amount: amount,
          payment_method: addPaymentForm.payment_method,
          reference_no: addPaymentForm.reference_no || null,
          remarks: addPaymentForm.remarks || null,
          payment_date: new Date(addPaymentForm.payment_date).toISOString(),
          received_by: currentUserId,
          status: 'success'
        });

      if (paymentError) throw paymentError;

      const newPaidAmount = selectedFee.already_paid + amount;
      const newStatus: StudentFee['status'] = 
        newPaidAmount >= selectedFee.payable_total ? 'paid' :
        newPaidAmount > 0 ? 'partial' : 'pending';

      const { error: updateError } = await supabase
        .from('student_fees')
        .update({
          already_paid: newPaidAmount,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFee.id);

      if (updateError) throw updateError;

      updateFeeInState({
        ...selectedFee,
        already_paid: newPaidAmount,
        status: newStatus,
        updated_at: new Date().toISOString()
      });

      await fetchFeeDetails(selectedFee.id);

      setAlert({ type: 'success', message: `Payment of Rs ${amount.toLocaleString()} recorded successfully` });
      setShowAddPayment(false);
      setAddPaymentForm({
        amount: '',
        payment_method: 'cash',
        reference_no: '',
        remarks: '',
        payment_date: new Date().toISOString().split('T')[0]
      });
    } catch (error: unknown) {
      console.error('Error adding payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to record payment';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setProcessingAction(false);
      setUpdatingFeeId(null);
    }
  };

  // 2. Generate Challan
  const handleGenerateChallan = async () => {
    if (!selectedFee || !canManageFees) return;

    const amount = parseFloat(challanForm.amount) || (selectedFee.payable_total - selectedFee.already_paid);

    setProcessingAction(true);
    setUpdatingFeeId(selectedFee.id);
    try {
      const bankDetailsObj = challanForm.bank_details ? 
        JSON.parse(challanForm.bank_details) : 
        { bank_name: 'University Bank', account_no: 'N/A', branch: 'Main Campus' };

      const { data: newChallan, error } = await supabase
        .from('fee_challans')
        .insert({
          student_fee_id: selectedFee.id,
          total_amount: amount,
          due_date: challanForm.due_date,
          status: 'generated',
          payment_method: challanForm.payment_method || null,
          bank_details: bankDetailsObj,
          billing_address: challanForm.billing_address || null,
          issued_by: currentUserId,
          issued_at: new Date().toISOString(),
          notes: challanForm.notes || null
        })
        .select()
        .single();

      if (error) throw error;

      const updatedFee = {
        ...selectedFee,
        challans: [...(selectedFee.challans || []), newChallan as FeeChallan]
      };
      updateFeeInState(updatedFee);

      setAlert({ type: 'success', message: `Challan #${newChallan.challan_number} generated successfully` });
      setShowGenerateChallan(false);
      setChallanForm({
        amount: '',
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        bank_details: '',
        billing_address: '',
        notes: '',
        payment_method: 'bank_transfer'
      });
    } catch (error: unknown) {
      console.error('Error generating challan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate challan';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setProcessingAction(false);
      setUpdatingFeeId(null);
    }
  };

  // 3. Add Fine
  const handleAddFine = async () => {
    if (!selectedFee || !canManageFees) return;

    const fineAmount = parseFloat(fineForm.amount);
    if (!fineAmount || fineAmount <= 0) {
      setAlert({ type: 'error', message: 'Please enter a valid fine amount' });
      return;
    }

    setProcessingAction(true);
    setUpdatingFeeId(selectedFee.id);
    try {
      // Add fine as a separate fee category in student_fees
      const newPayableTotal = selectedFee.payable_total + fineAmount;

      const { error: updateError } = await supabase
        .from('student_fees')
        .update({
          actual_misc: selectedFee.actual_misc + fineAmount,
          payable_total: newPayableTotal,
          updated_at: new Date().toISOString(),
          status: newPayableTotal > selectedFee.already_paid ? 'partial' : selectedFee.status
        })
        .eq('id', selectedFee.id);

      if (updateError) throw updateError;

      // Generate a challan for the fine
      const { data: fineChallan, error: challanError } = await supabase
        .from('fee_challans')
        .insert({
          student_fee_id: selectedFee.id,
          total_amount: fineAmount,
          due_date: fineForm.due_date,
          status: 'generated',
          payment_method: 'bank_transfer',
          bank_details: { purpose: `Fine: ${fineForm.fine_type}` },
          issued_by: currentUserId,
          issued_at: new Date().toISOString(),
          notes: `${fineForm.fine_type}: ${fineForm.reason}`
        })
        .select()
        .single();

      if (challanError) throw challanError;

      await fetchFeeDetails(selectedFee.id);

      setAlert({ 
        type: 'success', 
        message: `Fine of Rs ${fineAmount.toLocaleString()} added. Challan #${fineChallan?.challan_number} generated.` 
      });
      setShowAddFine(false);
      setFineForm({
        amount: '',
        fine_type: 'late_fee',
        reason: '',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } catch (error: unknown) {
      console.error('Error adding fine:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add fine';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setProcessingAction(false);
      setUpdatingFeeId(null);
    }
  };

  // 4. Create Installments
  const handleCreateInstallments = async () => {
    if (!selectedFee || !canManageFees) return;

    const totalAmount = parseFloat(installmentForm.total_amount) || (selectedFee.payable_total - selectedFee.already_paid);
    const numInstallments = parseInt(installmentForm.number_of_installments);
    const startDate = new Date(installmentForm.start_date);
    const intervalDays = parseInt(installmentForm.interval_days);

    if (numInstallments < 2 || numInstallments > 12) {
      setAlert({ type: 'error', message: 'Number of installments must be between 2 and 12' });
      return;
    }

    setProcessingAction(true);
    setUpdatingFeeId(selectedFee.id);
    try {
      const installmentAmount = Math.round(totalAmount / numInstallments);
      const installments = [];

      for (let i = 0; i < numInstallments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (i * intervalDays));
        
        installments.push({
          student_fee_id: selectedFee.id,
          installment_number: i + 1,
          amount: i === numInstallments - 1 ? 
            totalAmount - (installmentAmount * (numInstallments - 1)) : 
            installmentAmount,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending'
        });
      }

      const { error } = await supabase
        .from('fee_installments')
        .insert(installments);

      if (error) throw error;

      // Generate challans for each installment
      for (const inst of installments) {
        await supabase
          .from('fee_challans')
          .insert({
            student_fee_id: selectedFee.id,
            total_amount: inst.amount,
            due_date: inst.due_date,
            status: 'generated',
            payment_method: 'bank_transfer',
            issued_by: currentUserId,
            issued_at: new Date().toISOString(),
            notes: `Installment ${inst.installment_number} of ${numInstallments}`
          });
      }

      await fetchFeeDetails(selectedFee.id);

      setAlert({ type: 'success', message: `${numInstallments} installments created with challans` });
      setShowCreateInstallments(false);
      setInstallmentForm({
        total_amount: '',
        number_of_installments: '2',
        start_date: new Date().toISOString().split('T')[0],
        interval_days: '30'
      });
    } catch (error: unknown) {
      console.error('Error creating installments:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create installments';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setProcessingAction(false);
      setUpdatingFeeId(null);
    }
  };

  // 5. Cancel Challan
  const handleCancelChallan = async (challanId: string) => {
    if (!canManageFees || !selectedFee) return;

    try {
      const { error } = await supabase
        .from('fee_challans')
        .update({ status: 'cancelled' })
        .eq('id', challanId);

      if (error) throw error;

      const updatedChallans = selectedFee.challans?.map(c =>
        c.id === challanId ? { ...c, status: 'cancelled' as const } : c
      );
      updateFeeInState({ ...selectedFee, challans: updatedChallans });

      setAlert({ type: 'success', message: 'Challan cancelled successfully' });
    } catch (error: unknown) {
      console.error('Error cancelling challan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel challan';
      setAlert({ type: 'error', message: errorMessage });
    }
  };

  // 6. Mark Challan as Issued
  const handleIssueChallan = async (challanId: string) => {
    if (!canManageFees || !selectedFee) return;

    try {
      const { error } = await supabase
        .from('fee_challans')
        .update({ 
          status: 'issued',
          issued_at: new Date().toISOString()
        })
        .eq('id', challanId);

      if (error) throw error;

      setAlert({ type: 'success', message: 'Challan issued successfully' });
      await fetchFeeDetails(selectedFee.id);
    } catch (error: unknown) {
      console.error('Error issuing challan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to issue challan';
      setAlert({ type: 'error', message: errorMessage });
    }
  };

  // Print Challan
  const handlePrintChallan = (challan: FeeChallan, fee: StudentFee) => {
    const bankDetails = challan.bank_details as Record<string, string> || {};
    const studentName = getStudentName(fee);
    const enrollmentNo = getEnrollmentNumber(fee);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fee Challan - ${challan.challan_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .details { margin-bottom: 20px; }
          .details table { width: 100%; border-collapse: collapse; }
          .details td { padding: 5px; }
          .bank-copy { margin-top: 50px; border-top: 2px dashed #000; padding-top: 20px; }
          .stamp { text-align: right; margin-top: 50px; }
          @media print { .no-print { display: none; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>University Fee Challan</h2>
          <h3>Challan #: ${challan.challan_number}</h3>
          <p>Date: ${formatDate(challan.issued_at || challan.created_at?.toString() || null)}</p>
        </div>
        <div class="details">
          <table>
            <tr><td><strong>Student Name:</strong></td><td>${studentName}</td></tr>
            <tr><td><strong>Enrollment No:</strong></td><td>${enrollmentNo}</td></tr>
            <tr><td><strong>Program:</strong></td><td>${getStudentProgram(fee)}</td></tr>
            <tr><td><strong>Due Date:</strong></td><td>${formatDate(challan.due_date)}</td></tr>
            <tr><td><strong>Amount:</strong></td><td><strong>Rs ${challan.total_amount.toLocaleString()}</strong></td></tr>
            ${challan.notes ? `<tr><td><strong>Notes:</strong></td><td>${challan.notes}</td></tr>` : ''}
          </table>
        </div>
        ${bankDetails.bank_name ? `
        <div class="details" style="margin-top: 20px;">
          <h4>Bank Details</h4>
          <table>
            <tr><td><strong>Bank:</strong></td><td>${bankDetails.bank_name || 'N/A'}</td></tr>
            <tr><td><strong>Account No:</strong></td><td>${bankDetails.account_no || 'N/A'}</td></tr>
            <tr><td><strong>Branch:</strong></td><td>${bankDetails.branch || 'N/A'}</td></tr>
          </table>
        </div>
        ` : ''}
        <div class="bank-copy">
          <h3>Bank Copy</h3>
          <div class="details">
            <table>
              <tr><td><strong>Challan No:</strong></td><td>${challan.challan_number}</td></tr>
              <tr><td><strong>Student:</strong></td><td>${studentName} (${enrollmentNo})</td></tr>
              <tr><td><strong>Amount:</strong></td><td><strong>Rs ${challan.total_amount.toLocaleString()}</strong></td></tr>
              <tr><td><strong>Due Date:</strong></td><td>${formatDate(challan.due_date)}</td></tr>
            </table>
          </div>
          <div class="stamp">
            <p>_________________________</p>
            <p>Bank Stamp & Signature</p>
          </div>
        </div>
        <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
          🖨️ Print Challan
        </button>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  // Export
  const handleExport = () => {
    const csvData = filteredFees.map(fee => ({
      'Student Name': getStudentName(fee),
      'Enrollment No': getEnrollmentNumber(fee),
      'Program': getStudentProgram(fee),
      'Department': getStudentDepartment(fee),
      'Semester': fee.student?.semester?.toString() || 'N/A',
      'Total Amount': fee.payable_total.toString(),
      'Paid Amount': fee.already_paid.toString(),
      'Balance': (fee.payable_total - fee.already_paid).toString(),
      'Status': fee.status,
      'Due Date': formatDate(fee.due_date),
      'Aging': fee.due_date ? getAgingBucket(getDaysOverdue(fee.due_date)) : 'N/A',
      'Challans': fee.challans?.length?.toString() || '0',
      'Payments': fee.payments?.length?.toString() || '0'
    }));

    if (csvData.length === 0) return;

    const headers: (keyof typeof csvData[0])[] = [
      'Student Name', 'Enrollment No', 'Program', 'Department', 'Semester',
      'Total Amount', 'Paid Amount', 'Balance', 'Status', 'Due Date', 
      'Aging', 'Challans', 'Payments'
    ];
    
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee-collection-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Filter logic
  const filteredFees = studentFees.filter(fee => {
    const dept = getStudentDepartment(fee);
    const program = getStudentProgram(fee);
    
    const matchesDepartment = selectedDepartment === 'all' || fee.student?.department_id === selectedDepartment;
    const matchesProgram = selectedProgram === 'all' || fee.fee_structure?.program_id === selectedProgram;
    const matchesStatus = selectedStatus === 'all' || fee.status === selectedStatus;
    
    const daysOverdue = fee.due_date ? getDaysOverdue(fee.due_date) : 0;
    const agingBucket = getAgingBucket(daysOverdue);
    const matchesAge = selectedAge === 'all' || agingBucket === selectedAge;

    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      (fee.student?.full_name ?? '').toLowerCase().includes(q) ||
      (fee.student?.enrollment_number ?? '').toLowerCase().includes(q) ||
      (fee.student?.email ?? '').toLowerCase().includes(q) ||
      program.toLowerCase().includes(q) ||
      dept.toLowerCase().includes(q);

    return matchesDepartment && matchesProgram && matchesStatus && matchesAge && matchesSearch;
  });

  // Get all challans across all students
  const getAllChallans = (): (FeeChallan & { studentFee: StudentFee })[] => {
    const allChallans: (FeeChallan & { studentFee: StudentFee })[] = [];
    studentFees.forEach(fee => {
      fee.challans?.forEach(challan => {
        allChallans.push({ ...challan, studentFee: fee });
      });
    });
    return allChallans.sort((a, b) => 
      new Date(b.created_at?.toString() || '').getTime() - new Date(a.created_at?.toString() || '').getTime()
    );
  };

  const handleViewDetails = async (fee: StudentFee) => {
    setSelectedFee(fee);
    setShowDetails(true);
    fetchFeeDetails(fee.id);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6">
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

  const challans = getAllChallans();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Fee Collection & Challan Management</h1>
            <p className="text-sky-100">
              Manage fees, generate challans, add fines, and create installment plans
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchInitialData}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button 
              onClick={handleExport}
              className="bg-white text-sky-700 hover:bg-sky-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
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
          {alert.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : alert.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <AlertDescription>{alert.message}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setAlert(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Billed', value: `Rs ${totalBilled.toLocaleString()}`, icon: DollarSign, color: 'blue', note: `${studentFees.length} student fee records` },
          { label: 'Total Collected', value: `Rs ${totalCollected.toLocaleString()}`, icon: TrendingUp, color: 'green', note: `${paidCount} fully paid` },
          { label: 'Outstanding', value: `Rs ${totalOutstanding.toLocaleString()}`, icon: AlertCircle, color: 'orange', note: `${partialCount + pendingCount + overdueCount} pending/overdue` },
          { label: 'Challans Generated', value: totalChallansGenerated.toString(), icon: Receipt, color: 'purple', note: 'Total challans issued' }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            orange: 'bg-orange-100 text-orange-600',
            red: 'bg-red-100 text-red-600',
            purple: 'bg-purple-100 text-purple-600'
          };
          return (
            <Card key={`stat-${idx}`} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-xl ${colorMap[stat.color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as ActiveTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Fee Records
          </TabsTrigger>
          <TabsTrigger value="challans" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            All Challans
          </TabsTrigger>
          <TabsTrigger value="fines" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Fines Management
          </TabsTrigger>
          <TabsTrigger value="installments" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Installments
          </TabsTrigger>
        </TabsList>

        {/* Fee Records Tab */}
        <TabsContent value="fees" className="space-y-4">
          {/* Filters */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Filter className="h-4 w-4 text-gray-500" />
                <span>Filter by department, program, status, and aging bucket</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <select value={selectedDepartment} onChange={(e) => { setSelectedDepartment(e.target.value); setSelectedProgram('all'); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="all">All Programs</option>
                  {programs.filter(p => selectedDepartment === 'all' || p.department_id === selectedDepartment).map((prog) => (
                    <option key={prog.id} value={prog.id}>{prog.name}</option>
                  ))}
                </select>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as FeeStatus)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
                <select value={selectedAge} onChange={(e) => setSelectedAge(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="all">All Aging</option>
                  <option value="Current">Current</option>
                  <option value="1-30">1–30 days</option>
                  <option value="31-60">31–60 days</option>
                  <option value="61-90">61–90 days</option>
                  <option value="90+">90+ days</option>
                </select>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search by student name, enrollment number, email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </CardContent>
          </Card>

          {/* Fee List */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="mr-2 h-5 w-5" />
                Fee Records ({filteredFees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredFees.map((fee) => {
                  const balance = fee.payable_total - fee.already_paid;
                  const paidPct = fee.payable_total === 0 ? 0 : Math.round((fee.already_paid / fee.payable_total) * 100);
                  const daysOverdue = fee.due_date ? getDaysOverdue(fee.due_date) : 0;
                  const agingBucket = getAgingBucket(daysOverdue);
                  const isUpdating = updatingFeeId === fee.id;

                  return (
                    <div
                      key={fee.id}
                      className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
                      onClick={() => !isUpdating && handleViewDetails(fee)}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div className="flex gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                            {isUpdating ? <Loader2 className="h-5 w-5 text-sky-600 animate-spin" /> : <Users className="h-5 w-5 text-sky-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-semibold text-gray-900">{getStudentName(fee)}</p>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border">{getEnrollmentNumber(fee)}</span>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full ${getStatusBadge(fee.status)}`}>{fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}</span>
                              {fee.status !== 'paid' && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border">{agingBucket} days</span>}
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{getStudentProgram(fee)}</p>
                            <p className="text-xs text-gray-500">
                              <Calendar className="inline h-3 w-3 mr-1" />
                              Due: {formatDate(fee.due_date)}
                              {getSemester(fee) && ` • Sem ${getSemester(fee)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-start lg:items-end gap-1 text-xs text-gray-600">
                          <p>Total: <span className="font-semibold text-gray-900">Rs {fee.payable_total.toLocaleString()}</span></p>
                          <p>Paid: <span className="font-semibold text-emerald-700">Rs {fee.already_paid.toLocaleString()}</span></p>
                          <p>Balance: <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-gray-700'}`}>Rs {balance.toLocaleString()}</span></p>
                          <div className="w-40 bg-gray-200 rounded-full h-2 mt-1">
                            <div className={`h-2 rounded-full transition-all duration-500 ${paidPct === 100 ? 'bg-emerald-500' : paidPct >= 50 ? 'bg-sky-500' : paidPct > 0 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Math.min(paidPct, 100)}%` }} />
                          </div>
                          <p className="text-[11px] text-gray-500">{paidPct}% paid</p>
                          {canManageFees && !isUpdating && (
                            <div className="flex gap-1 mt-1">
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedFee(fee); setShowAddPayment(true); }}>
                                <Plus className="h-3 w-3 mr-1" />Payment
                              </Button>
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedFee(fee); setShowGenerateChallan(true); }}>
                                <Receipt className="h-3 w-3 mr-1" />Challan
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredFees.length === 0 && (
                  <div className="text-center py-10">
                    <Wallet className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No fee records found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Challans Tab */}
        <TabsContent value="challans" className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="mr-2 h-5 w-5" />
                All Generated Challans ({challans.length})
              </CardTitle>
              <CardDescription>Manage all challans across all students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {challans.map(challan => (
                  <div key={challan.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="flex gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">Challan #{challan.challan_number}</p>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full ${getStatusBadge(challan.status)}`}>{challan.status}</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {getStudentName(challan.studentFee)} ({getEnrollmentNumber(challan.studentFee)})
                          </p>
                          <p className="text-xs text-gray-500">
                            Rs {challan.total_amount.toLocaleString()} • Due: {formatDate(challan.due_date)}
                            {challan.payment_method && ` • ${challan.payment_method}`}
                          </p>
                          {challan.notes && <p className="text-xs text-gray-500 mt-1">{challan.notes}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handlePrintChallan(challan, challan.studentFee)}>
                          <Printer className="h-3 w-3 mr-1" />Print
                        </Button>
                        {challan.status === 'generated' && canManageFees && (
                          <Button size="sm" variant="outline" onClick={() => handleIssueChallan(challan.id)}>
                            <Send className="h-3 w-3 mr-1" />Issue
                          </Button>
                        )}
                        {challan.status !== 'cancelled' && challan.status !== 'paid' && canManageFees && (
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleCancelChallan(challan.id)}>
                            <Ban className="h-3 w-3 mr-1" />Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {challans.length === 0 && (
                  <div className="text-center py-10">
                    <Receipt className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No challans generated yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fines Tab */}
        <TabsContent value="fines" className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Fine Management
              </CardTitle>
              <CardDescription>Add fines to student accounts and generate challans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <AlertCircle className="inline h-4 w-4 mr-1" />
                    Select a student fee record first, then add a fine from the details modal.
                  </p>
                </div>
                
                {/* Fine Types Reference */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Fine Types</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { type: 'late_fee', label: 'Late Payment Fee', icon: Clock, color: 'red' },
                      { type: 'library_fine', label: 'Library Fine', icon: BookOpen, color: 'blue' },
                      { type: 'damage_fee', label: 'Damage Fee', icon: AlertTriangle, color: 'orange' },
                      { type: 'readmission_fee', label: 'Readmission Fee', icon: Users, color: 'purple' },
                      { type: 'exam_fee', label: 'Exam Fee', icon: FileText, color: 'green' },
                      { type: 'other', label: 'Other Fine', icon: Coins, color: 'gray' }
                    ].map(fine => {
                      const Icon = fine.icon;
                      const colorMap: Record<string, string> = {
                        red: 'bg-red-100 text-red-600',
                        blue: 'bg-blue-100 text-blue-600',
                        orange: 'bg-orange-100 text-orange-600',
                        purple: 'bg-purple-100 text-purple-600',
                        green: 'bg-green-100 text-green-600',
                        gray: 'bg-gray-100 text-gray-600'
                      };
                      return (
                        <div key={fine.type} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-2 rounded-lg ${colorMap[fine.color]}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <p className="font-medium text-sm text-gray-900">{fine.label}</p>
                          </div>
                          <p className="text-xs text-gray-600">Add this fine to student fee records</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Installments Tab */}
        <TabsContent value="installments" className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="mr-2 h-5 w-5" />
                Installment Plans
              </CardTitle>
              <CardDescription>Create installment plans for students with automatic challan generation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <CheckCircle className="inline h-4 w-4 mr-1" />
                    Select a student fee record, then create installments from the details modal.
                  </p>
                </div>

                {/* Student Fees with Installments */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Students with Active Installments</h3>
                  <div className="space-y-4">
                    {studentFees.filter(f => f.installments && f.installments.length > 0).map(fee => (
                      <div key={fee.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">{getStudentName(fee)}</p>
                            <p className="text-xs text-gray-600">{getEnrollmentNumber(fee)}</p>
                          </div>
                          <Badge>{(fee.installments || []).length} Installments</Badge>
                        </div>
                        <div className="space-y-2">
                          {(fee.installments || []).map(inst => (
                            <div key={inst.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <div>
                                <p className="text-sm font-medium">#{inst.installment_number}: Rs {inst.amount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">Due: {formatDate(inst.due_date)}</p>
                              </div>
                              <Badge className={getStatusBadge(inst.status)}>{inst.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {studentFees.filter(f => f.installments && f.installments.length > 0).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">No installment plans created yet</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fee Details Modal */}
      {showDetails && selectedFee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Fee Details - {getStudentName(selectedFee)}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {getEnrollmentNumber(selectedFee)} • {getStudentProgram(selectedFee)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canManageFees && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setShowDetails(false); setShowAddPayment(true); }}>
                        <Plus className="h-4 w-4 mr-1" />Add Payment
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowDetails(false); setShowGenerateChallan(true); }}>
                        <Receipt className="h-4 w-4 mr-1" />Generate Challan
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowDetails(false); setShowAddFine(true); }}>
                        <AlertTriangle className="h-4 w-4 mr-1" />Add Fine
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowDetails(false); setShowCreateInstallments(true); }}>
                        <CalendarDays className="h-4 w-4 mr-1" />Installments
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setShowDetails(false); setSelectedFee(null); }}>
                    <X className="h-4 w-4 mr-1" />Close
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Fee Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Total Fee', value: `Rs ${selectedFee.payable_total.toLocaleString()}`, color: 'bg-gray-50' },
                  { label: 'Paid', value: `Rs ${selectedFee.already_paid.toLocaleString()}`, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Balance', value: `Rs ${(selectedFee.payable_total - selectedFee.already_paid).toLocaleString()}`, color: 'bg-red-50 text-red-700' },
                  { label: 'Status', value: selectedFee.status.toUpperCase(), color: 'bg-blue-50' },
                  { label: 'Due Date', value: formatDate(selectedFee.due_date), color: 'bg-gray-50' }
                ].map((item, idx) => (
                  <div key={idx} className={`p-4 rounded-lg ${item.color}`}>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-lg font-bold">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Payments History */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Payment History</h3>
                {selectedFee.payments && selectedFee.payments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedFee.payments.map(payment => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Rs {payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{payment.payment_method} • {formatDateTime(payment.payment_date)}</p>
                        </div>
                        <Badge className={getStatusBadge(payment.status)}>{payment.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No payments recorded yet</p>
                )}
              </div>

              {/* Challans */}
              {selectedFee.challans && selectedFee.challans.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Challans</h3>
                  <div className="space-y-2">
                    {selectedFee.challans.map(challan => (
                      <div key={challan.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{challan.challan_number}</p>
                          <p className="text-xs text-gray-500">Rs {challan.total_amount.toLocaleString()} • Due: {formatDate(challan.due_date)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getStatusBadge(challan.status)}>{challan.status}</Badge>
                          <Button size="sm" variant="ghost" onClick={() => handlePrintChallan(challan, selectedFee)}>
                            <Printer className="h-3 w-3" />
                          </Button>
                          {challan.status !== 'cancelled' && canManageFees && (
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleCancelChallan(challan.id)}>
                              <Ban className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPayment && selectedFee && canManageFees && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
              <p className="text-sm text-gray-600">{getStudentName(selectedFee)} • Balance: Rs {(selectedFee.payable_total - selectedFee.already_paid).toLocaleString()}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <Input type="number" value={addPaymentForm.amount} onChange={(e) => setAddPaymentForm({ ...addPaymentForm, amount: e.target.value })} placeholder="Enter amount" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select value={addPaymentForm.payment_method} onChange={(e) => setAddPaymentForm({ ...addPaymentForm, payment_method: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference No</label>
                <Input value={addPaymentForm.reference_no} onChange={(e) => setAddPaymentForm({ ...addPaymentForm, reference_no: e.target.value })} placeholder="Transaction reference" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <Input type="date" value={addPaymentForm.payment_date} onChange={(e) => setAddPaymentForm({ ...addPaymentForm, payment_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea value={addPaymentForm.remarks} onChange={(e) => setAddPaymentForm({ ...addPaymentForm, remarks: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} placeholder="Any notes..." />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => { setShowAddPayment(false); setShowDetails(true); }} disabled={processingAction}>Cancel</Button>
                <Button onClick={handleAddPayment} disabled={processingAction || !addPaymentForm.amount}>
                  {processingAction ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><Check className="h-4 w-4 mr-2" />Record Payment</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Challan Modal */}
      {showGenerateChallan && selectedFee && canManageFees && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
      <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">Generate Challan</h2>
        <p className="text-xs md:text-sm text-gray-600 mt-1">{getStudentName(selectedFee)}</p>
      </div>
      <div className="p-4 md:p-6 space-y-3 md:space-y-4">
        <div className="p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs md:text-sm text-blue-800">
            Outstanding Balance: <span className="font-bold">Rs {(selectedFee.payable_total - selectedFee.already_paid).toLocaleString()}</span>
          </p>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
            Amount <span className="text-red-500">*</span>
          </label>
          <Input 
            type="number" 
            value={challanForm.amount} 
            onChange={(e) => setChallanForm({ ...challanForm, amount: e.target.value })} 
            placeholder={`Enter amount (default: ${(selectedFee.payable_total - selectedFee.already_paid).toLocaleString()})`}
            className="text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use the full outstanding balance
          </p>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
            Due Date <span className="text-red-500">*</span>
          </label>
          <Input 
            type="date" 
            value={challanForm.due_date} 
            onChange={(e) => setChallanForm({ ...challanForm, due_date: e.target.value })} 
            className="text-sm"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <select 
            value={challanForm.payment_method} 
            onChange={(e) => setChallanForm({ ...challanForm, payment_method: e.target.value })} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="online">Online</option>
            <option value="card">Card</option>
          </select>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
            Bank Details
          </label>
          <Input 
            value={challanForm.bank_details} 
            onChange={(e) => setChallanForm({ ...challanForm, bank_details: e.target.value })} 
            placeholder='{"bank_name":"HBL","account_no":"123456","branch":"Main Campus"}'
            className="text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter bank details in JSON format or leave empty for default
          </p>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
            Billing Address
          </label>
          <textarea
            value={challanForm.billing_address}
            onChange={(e) => setChallanForm({ ...challanForm, billing_address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            rows={2}
            placeholder="Enter billing address (optional)"
          />
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
            Notes / Remarks
          </label>
          <textarea 
            value={challanForm.notes} 
            onChange={(e) => setChallanForm({ ...challanForm, notes: e.target.value })} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" 
            rows={2} 
            placeholder="Any additional notes for this challan..."
          />
        </div>

        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Preview:</span> A challan will be generated for{' '}
            <span className="font-semibold text-gray-900">{getStudentName(selectedFee)}</span>
            {' '}({getEnrollmentNumber(selectedFee)})
            {challanForm.amount && (
              <> for <span className="font-semibold text-gray-900">Rs {parseFloat(challanForm.amount).toLocaleString()}</span></>
            )}
            {' '}due by <span className="font-semibold text-gray-900">{formatDate(challanForm.due_date)}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={() => { 
              setShowGenerateChallan(false); 
              setShowDetails(true); 
            }} 
            disabled={processingAction}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleGenerateChallan} 
            disabled={processingAction}
            className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700"
          >
            {processingAction ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Receipt className="h-4 w-4 mr-2" />Generate Challan</>
            )}
          </Button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Add Fine Modal */}
      {showAddFine && selectedFee && canManageFees && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Fine</h2>
              <p className="text-sm text-gray-600">{getStudentName(selectedFee)}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fine Type</label>
                <select value={fineForm.fine_type} onChange={(e) => setFineForm({ ...fineForm, fine_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="late_fee">Late Payment Fee</option>
                  <option value="library_fine">Library Fine</option>
                  <option value="damage_fee">Damage Fee</option>
                  <option value="readmission_fee">Readmission Fee</option>
                  <option value="exam_fee">Exam Fee</option>
                  <option value="other">Other Fine</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fine Amount *</label>
                <Input type="number" value={fineForm.amount} onChange={(e) => setFineForm({ ...fineForm, amount: e.target.value })} placeholder="Enter fine amount" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <Input value={fineForm.reason} onChange={(e) => setFineForm({ ...fineForm, reason: e.target.value })} placeholder="Reason for fine" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <Input type="date" value={fineForm.due_date} onChange={(e) => setFineForm({ ...fineForm, due_date: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => { setShowAddFine(false); setShowDetails(true); }} disabled={processingAction}>Cancel</Button>
                <Button onClick={handleAddFine} disabled={processingAction || !fineForm.amount} className="bg-yellow-600 hover:bg-yellow-700">
                  {processingAction ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : <><AlertTriangle className="h-4 w-4 mr-2" />Add Fine</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Installments Modal */}
      {showCreateInstallments && selectedFee && canManageFees && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Installment Plan</h2>
              <p className="text-sm text-gray-600">{getStudentName(selectedFee)}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Balance: <span className="font-bold">Rs {(selectedFee.payable_total - selectedFee.already_paid).toLocaleString()}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <Input type="number" value={installmentForm.total_amount} onChange={(e) => setInstallmentForm({ ...installmentForm, total_amount: e.target.value })} placeholder={`Default: ${(selectedFee.payable_total - selectedFee.already_paid).toLocaleString()}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Installments</label>
                <select value={installmentForm.number_of_installments} onChange={(e) => setInstallmentForm({ ...installmentForm, number_of_installments: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {[2, 3, 4, 6, 8, 12].map(num => (
                    <option key={num} value={num}>{num} Installments</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <Input type="date" value={installmentForm.start_date} onChange={(e) => setInstallmentForm({ ...installmentForm, start_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interval (Days)</label>
                <select value={installmentForm.interval_days} onChange={(e) => setInstallmentForm({ ...installmentForm, interval_days: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="15">15 Days</option>
                  <option value="30">30 Days (Monthly)</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => { setShowCreateInstallments(false); setShowDetails(true); }} disabled={processingAction}>Cancel</Button>
                <Button onClick={handleCreateInstallments} disabled={processingAction} className="bg-purple-600 hover:bg-purple-700">
                  {processingAction ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><CalendarDays className="h-4 w-4 mr-2" />Create Installments</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}