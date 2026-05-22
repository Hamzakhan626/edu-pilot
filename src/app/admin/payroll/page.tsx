/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Filter,
  Download,
  Search,
  Wallet,
  Users as UsersIcon,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Plus,
  X,
  Edit,
  Trash2,
  Send,
  Ban,
  Check,
  CreditCard,
  RefreshCw,
  Loader2,
  Printer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import supabase from "@/lib/supabase/client";

type PayrollStatus = "Draft" | "PendingApproval" | "Approved" | "Paid" | "OnHold";
type PayType = "Monthly" | "Hourly" | "Stipend";
type RunType = "Regular" | "Overtime" | "Adjustment";

interface Department {
  id: string;
  name: string;
  code?: string;
}

interface PayrollRecord {
  id: string;
  user_id: string;
  period: string;
  pay_date: string | null;  
  basic_salary: number;
  allowances: number;
  overtime: number;
  deductions: number;
  net_pay: number;
  gross_pay: number;
  status: PayrollStatus;
  pay_type: PayType;
  run_type: RunType;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_full_name?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  department_name?: string | null;
}

interface EmployeeOption {
  id: string;
  full_name: string;
  email: string | null;
  role?: string | null;
  department_id?: string | null;
}

interface EditFormData {
  basic_salary: string;
  allowances: string;
  overtime: string;
  deductions: string;
  status: PayrollStatus;
  pay_date: string;
  notes: string;
}

type DepartmentSummary = {
  department_id: string | null;
  department_name: string;
  totalNet: number;
  headcount: number;
};

// Extract unique periods from records
function extractPeriods(records: PayrollRecord[]): string[] {
  return Array.from(new Set(records.map((r) => r.period))).sort().reverse();
}

export default function PayrollOverview() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | PayrollStatus>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<"all" | string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<"all" | string>("all");
  const [selectedPayType, setSelectedPayType] = useState<"all" | PayType>("all");

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  // Alert
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Create form
  const [creating, setCreating] = useState(false);
  const [formUserId, setFormUserId] = useState("");
  const [formPeriod, setFormPeriod] = useState("");
  const [formPayDate, setFormPayDate] = useState("");
  const [formBasic, setFormBasic] = useState<string>("");
  const [formAllowances, setFormAllowances] = useState<string>("0");
  const [formOvertime, setFormOvertime] = useState<string>("0");
  const [formDeductions, setFormDeductions] = useState<string>("0");
  const [formStatus, setFormStatus] = useState<PayrollStatus>("Draft");
  const [formPayType, setFormPayType] = useState<PayType>("Monthly");
  const [formRunType, setFormRunType] = useState<RunType>("Regular");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    basic_salary: "",
    allowances: "",
    overtime: "",
    deductions: "",
    status: "Draft",
    pay_date: "",
    notes: "",
  });
  const [editError, setEditError] = useState<string | null>(null);

  const isAdminOrFinance = userRole === "admin" || userRole === "finance";

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        setUserRole(userData?.role || "");
      }

      // Fetch departments and employees
      const [{ data: depData, error: depError }, { data: empData, error: empError }] = await Promise.all([
        supabase.from("departments").select("id, name, code").order("name", { ascending: true }),
        supabase.from("users").select("id, full_name, email, role, department_id").order("full_name", { ascending: true }),
      ]);

      if (depError) throw depError;
      if (empError) throw empError;

      // Fetch payroll records
      const { data: payrollData, error: payrollError } = await supabase
        .from("payroll_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (payrollError) {
        if (payrollError.code === "42P01") {
          // Table doesn't exist
          setAlert({ type: "info", message: "Payroll records table not found. Please create it first." });
          setRecords([]);
          setDepartments(depData || []);
          setEmployees((empData || []).map(mapEmployee));
          setLoading(false);
          return;
        }
        throw payrollError;
      }

      // Get unique user IDs and fetch user details
      const userIds = [...new Set((payrollData || []).map((r: any) => r.user_id).filter(Boolean))];
      
      const userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name, email, role, department_id")
          .in("id", userIds);
        
        (users || []).forEach((u: any) => userMap.set(u.id, u));
      }

      // Build department map
      const deptMap = new Map<string, Department>();
      (depData || []).forEach((d) => deptMap.set(d.id, d));

      // Map payroll records
      const mapped: PayrollRecord[] = (payrollData || []).map((row: any) => {
        const userInfo = userMap.get(row.user_id);
        const dept = userInfo?.department_id ? deptMap.get(userInfo.department_id) : null;
        
        return {
          id: row.id,
          user_id: row.user_id,
          period: row.period || "",
          pay_date: row.pay_date || "",
          basic_salary: Number(row.basic_salary || 0),
          allowances: Number(row.allowances || 0),
          overtime: Number(row.overtime || 0),
          deductions: Number(row.deductions || 0),
          net_pay: Number(row.net_pay || 0),
          gross_pay: Number(row.gross_pay || 0),
          status: row.status as PayrollStatus,
          pay_type: row.pay_type as PayType,
          run_type: row.run_type as RunType,
          created_by: row.created_by,
          approved_by: row.approved_by,
          approved_at: row.approved_at,
          paid_at: row.paid_at,
          notes: row.notes,
          created_at: row.created_at,
          updated_at: row.updated_at,
          user_full_name: userInfo?.full_name || null,
          user_email: userInfo?.email || null,
          user_role: userInfo?.role || null,
          department_name: dept?.name || null,
        };
      });

      setRecords(mapped);
      setDepartments(depData || []);
      setEmployees((empData || []).map(mapEmployee));
    } catch (err) {
      console.error("Error loading payroll overview:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setAlert({ type: "error", message: `Failed to load payroll: ${errorMessage}` });
      setRecords([]);
      setDepartments([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const mapEmployee = (u: any): EmployeeOption => ({
    id: u.id,
    full_name: u.full_name || u.email || "Unnamed user",
    email: u.email ?? null,
    role: u.role ?? null,
    department_id: u.department_id ?? null,
  });

  useEffect(() => {
    loadPayroll();
  }, []);

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const periods = useMemo(() => extractPeriods(records), [records]);
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredRecords = useMemo(
    () =>
      records.filter((r) => {
        if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
        if (selectedPeriod !== "all" && r.period !== selectedPeriod) return false;
        if (selectedPayType !== "all" && r.pay_type !== selectedPayType) return false;
        
        if (selectedDepartment !== "all") {
          const emp = employeeById.get(r.user_id);
          if (emp?.department_id !== selectedDepartment) return false;
        }
        
        if (!normalizedSearch) return true;

        const emp = employeeById.get(r.user_id);
        const haystack = ((emp?.full_name || "") + " " + (emp?.email || "") + " " + (r.department_name || "") + " " + r.period).toLowerCase().trim();
        return haystack.includes(normalizedSearch);
      }),
    [records, selectedStatus, selectedDepartment, selectedPeriod, selectedPayType, normalizedSearch, employeeById],
  );

  // Statistics
  const totalNet = filteredRecords.reduce((sum, r) => sum + r.net_pay, 0);
  const totalGross = filteredRecords.reduce((sum, r) => sum + r.gross_pay, 0);
  const totalBasic = filteredRecords.reduce((sum, r) => sum + r.basic_salary, 0);
  const totalAllowances = filteredRecords.reduce((sum, r) => sum + r.allowances, 0);
  const totalOvertime = filteredRecords.reduce((sum, r) => sum + r.overtime, 0);
  const totalDeductions = filteredRecords.reduce((sum, r) => sum + r.deductions, 0);
  const totalEmployees = new Set(filteredRecords.map((r) => r.user_id)).size;
  const avgNetPerEmployee = totalEmployees ? totalNet / totalEmployees : 0;

  const statusCounts: Record<PayrollStatus, number> = {
    Draft: records.filter((r) => r.status === "Draft").length,
    PendingApproval: records.filter((r) => r.status === "PendingApproval").length,
    Approved: records.filter((r) => r.status === "Approved").length,
    Paid: records.filter((r) => r.status === "Paid").length,
    OnHold: records.filter((r) => r.status === "OnHold").length,
  };

  const totalPaidNet = records.filter((r) => r.status === "Paid").reduce((sum, r) => sum + r.net_pay, 0);
  const totalApprovedNet = records.filter((r) => r.status === "Approved").reduce((sum, r) => sum + r.net_pay, 0);

  const latestRecord = useMemo(() => records[0], [records]);
  const currentPeriodLabel = latestRecord?.period || "No payroll data";

  const departmentSummaries: DepartmentSummary[] = useMemo(() => {
    const map = new Map<string, DepartmentSummary>();
    filteredRecords.forEach((r) => {
      const key = r.department_name || "No department";
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { department_id: null, department_name: key, totalNet: r.net_pay, headcount: 1 });
      } else {
        existing.totalNet += r.net_pay;
        existing.headcount += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalNet - a.totalNet);
  }, [filteredRecords]);

  // ============ FINANCE/ADMIN POWERS ============

const handleUpdateStatus = async (recordId: string, newStatus: PayrollStatus) => {
    if (!isAdminOrFinance) return;
    setProcessingId(recordId);
    try {
      const updateData: Record<string, any> = { 
        status: newStatus, 
        updated_at: new Date().toISOString() 
      };
      
      if (newStatus === "Approved") {
        updateData.approved_by = currentUserId;
        updateData.approved_at = new Date().toISOString();
      }
      if (newStatus === "Paid") {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase.from("payroll_records").update(updateData).eq("id", recordId);
      if (error) throw error;

      setRecords((prev): PayrollRecord[] =>
        prev.map((r): PayrollRecord =>
          r.id === recordId
            ? { ...r, ...updateData }
            : r
        )
      );
      setAlert({ type: "success", message: `Status updated to ${newStatus}` });
    } catch (err: any) {
      setAlert({ type: "error", message: err.message || "Failed to update status" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (!isAdminOrFinance) return;
    const pendingIds = filteredRecords.filter((r) => r.status === "PendingApproval" || r.status === "Draft").map((r) => r.id);
    if (pendingIds.length === 0) {
      setAlert({ type: "info", message: "No pending records to approve" });
      return;
    }
    if (!confirm(`Approve ${pendingIds.length} records?`)) return;

    setBulkProcessing(true);
    try {
      const { error } = await supabase
        .from("payroll_records")
        .update({ 
          status: "Approved", 
          approved_by: currentUserId, 
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .in("id", pendingIds);

      if (error) throw error;

      setRecords((prev) =>
        prev.map((r) => (pendingIds.includes(r.id) ? { ...r, status: "Approved", approved_by: currentUserId, approved_at: new Date().toISOString() } : r))
      );
      setAlert({ type: "success", message: `${pendingIds.length} records approved` });
    } catch (err: any) {
      setAlert({ type: "error", message: err.message || "Failed to approve" });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkPay = async () => {
    if (!isAdminOrFinance) return;
    const approvedIds = filteredRecords.filter((r) => r.status === "Approved").map((r) => r.id);
    if (approvedIds.length === 0) {
      setAlert({ type: "info", message: "No approved records to mark as paid" });
      return;
    }
    if (!confirm(`Mark ${approvedIds.length} records as paid?`)) return;

    setBulkProcessing(true);
    try {
      const { error } = await supabase
        .from("payroll_records")
        .update({ status: "Paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .in("id", approvedIds);

      if (error) throw error;

      setRecords((prev) =>
        prev.map((r) => (approvedIds.includes(r.id) ? { ...r, status: "Paid", paid_at: new Date().toISOString() } : r))
      );
      setAlert({ type: "success", message: `${approvedIds.length} records marked as paid` });
    } catch (err: any) {
      setAlert({ type: "error", message: err.message || "Failed to mark as paid" });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!isAdminOrFinance) return;
    if (!confirm("Are you sure you want to delete this payroll record?")) return;

    setProcessingId(recordId);
    try {
      const { error } = await supabase.from("payroll_records").delete().eq("id", recordId);
      if (error) throw error;

      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      setAlert({ type: "success", message: "Record deleted" });
    } catch (err: any) {
      setAlert({ type: "error", message: err.message || "Failed to delete record" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleEditClick = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setEditForm({
      basic_salary: record.basic_salary.toString(),
      allowances: record.allowances.toString(),
      overtime: record.overtime.toString(),
      deductions: record.deductions.toString(),
      status: record.status,
      pay_date: record.pay_date || "",
      notes: record.notes || "",
    });
    setEditError(null);
    setShowEdit(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !isAdminOrFinance) return;
    setEditError(null);

    const basic = Number(editForm.basic_salary) || 0;
    const allowances = Number(editForm.allowances) || 0;
    const overtime = Number(editForm.overtime) || 0;
    const deductions = Number(editForm.deductions) || 0;
    const grossPay = basic + allowances + overtime;
    const netPay = grossPay - deductions;

    setEditing(true);
    try {
      const updatePayload = {
        basic_salary: basic,
        allowances,
        overtime,
        deductions,
        net_pay: netPay,
        gross_pay: grossPay,
        status: editForm.status,
        pay_date: editForm.pay_date || null,
        notes: editForm.notes || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("payroll_records")
        .update(updatePayload)
        .eq("id", selectedRecord.id);

      if (error) throw error;

      setRecords((prev) =>
        prev.map((r): PayrollRecord =>
          r.id === selectedRecord.id
            ? {
                ...r,
                basic_salary: basic,
                allowances,
                overtime,
                deductions,
                net_pay: netPay,
                gross_pay: grossPay,
                status: editForm.status,
                pay_date: editForm.pay_date || null,
                notes: editForm.notes || null,
                updated_at: new Date().toISOString(),
              }
            : r
        )
      );
      setAlert({ type: "success", message: "Record updated successfully" });
      setShowEdit(false);
      setSelectedRecord(null);
    } catch (err: any) {
      setEditError(err.message || "Failed to update record");
    } finally {
      setEditing(false);
    }
  };

  const handlePrintPayslip = (record: PayrollRecord) => {
    const emp = employeeById.get(record.user_id);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${emp?.full_name || "Employee"} - ${record.period}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
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
            <tr><td><strong>Employee:</strong></td><td>${emp?.full_name || "N/A"}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${emp?.email || "N/A"}</td></tr>
            <tr><td><strong>Department:</strong></td><td>${record.department_name || "N/A"}</td></tr>
            <tr><td><strong>Status:</strong></td><td>${record.status}</td></tr>
            <tr><td><strong>Pay Date:</strong></td><td>${record.pay_date ? new Date(record.pay_date).toLocaleDateString() : "N/A"}</td></tr>
            <tr><td><strong>Pay Type:</strong></td><td>${record.pay_type}</td></tr>
            <tr><td><strong>Run Type:</strong></td><td>${record.run_type}</td></tr>
          </table>
        </div>
        <div class="details">
          <h4>Earnings</h4>
          <table>
            <tr><td>Basic Salary</td><td>Rs ${record.basic_salary.toLocaleString()}</td></tr>
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
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const toggleExpand = (recordId: string) => {
    setExpandedRecords((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  };

  const resetForm = () => {
    setFormUserId("");
    setFormPeriod("");
    setFormPayDate("");
    setFormBasic("");
    setFormAllowances("0");
    setFormOvertime("0");
    setFormDeductions("0");
    setFormStatus("Draft");
    setFormPayType("Monthly");
    setFormRunType("Regular");
    setFormNotes("");
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formUserId) { setFormError("Please select an employee."); return; }
    if (!formPeriod) { setFormError("Please enter period (e.g., Dec 2024)."); return; }
    if (!formPayDate) { setFormError("Please select pay date."); return; }
    if (!formBasic) { setFormError("Please enter basic salary."); return; }

    const basic = Number(formBasic) || 0;
    const allowances = Number(formAllowances) || 0;
    const overtime = Number(formOvertime) || 0;
    const deductions = Number(formDeductions) || 0;
    const grossPay = basic + allowances + overtime;
    const netPay = grossPay - deductions;

    setCreating(true);
    try {
      const { error } = await supabase
        .from("payroll_records")
        .insert([{
          user_id: formUserId,
          period: formPeriod,
          pay_date: formPayDate,
          basic_salary: basic,
          allowances,
          overtime,
          deductions,
          net_pay: netPay,
          gross_pay: grossPay,
          status: formStatus,
          pay_type: formPayType,
          run_type: formRunType,
          created_by: currentUserId,
          notes: formNotes || null,
        }]);

      if (error) { setFormError(error.message || "Failed to create payroll record."); return; }

      setAlert({ type: "success", message: "Payroll record created. Refreshing..." });
      resetForm();
      setShowCreate(false);
      await loadPayroll(); // Refresh data
    } catch (err: any) {
      setFormError(err.message || "Unexpected error while creating payroll.");
    } finally {
      setCreating(false);
    }
  };

  const exportCsv = () => {
    if (!filteredRecords.length) return;

    const header = ["Employee", "Email", "Department", "Period", "Pay Date", "Basic", "Allowances", "Overtime", "Deductions", "Net Pay", "Gross Pay", "Status", "Pay Type", "Run Type", "Notes"].join(",");
    const rows = filteredRecords.map((r) => {
      const emp = employeeById.get(r.user_id);
      return [
        (emp?.full_name || "").replace(/,/g, " "),
        (emp?.email || "").replace(/,/g, " "),
        (r.department_name || "").replace(/,/g, " "),
        r.period,
        r.pay_date,
        r.basic_salary,
        r.allowances,
        r.overtime,
        r.deductions,
        r.net_pay,
        r.gross_pay,
        r.status,
        r.pay_type,
        r.run_type,
        (r.notes || "").replace(/,/g, " "),
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-overview-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: PayrollStatus): string => {
    switch (status) {
      case "Paid": return "border-green-500";
      case "Approved": return "border-blue-500";
      case "PendingApproval": return "border-yellow-500";
      case "OnHold": return "border-red-500";
      default: return "border-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading payroll overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payroll Overview</h1>
              <p className="text-gray-600">Monitor salary payouts, manage payroll records, and process payments.</p>
              <p className="text-xs text-gray-500 mt-1">
                Latest period: <span className="font-medium text-gray-900">{currentPeriodLabel}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isAdminOrFinance && (
                <>
                  <Button variant="default" size="sm" onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4 mr-2" />New Payroll
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkApprove} disabled={bulkProcessing}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />Approve All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkPay} disabled={bulkProcessing}>
                    <CreditCard className="w-4 h-4 mr-2" />Pay All Approved
                  </Button>
                </>
              )}
              <Button onClick={exportCsv} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
              <Button onClick={loadPayroll} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <Alert
            variant={alert.type === "error" ? "destructive" : "default"}
            className={`mb-6 ${alert.type === "success" ? "bg-green-50 border-green-200 text-green-800" : alert.type === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}
          >
            {alert.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertDescription>{alert.message}</AlertDescription>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAlert(null)}>
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {/* Filters row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Search className="w-4 h-4" />Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm" placeholder="Search employee, dept, period..." />
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as "all" | PayrollStatus)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm">
                <option value="all">All status</option>
                <option value="Draft">Draft</option>
                <option value="PendingApproval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
                <option value="OnHold">On Hold</option>
              </select>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm">
                <option value="all">All periods</option>
                {periods.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />Department / Pay Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm">
                <option value="all">All departments</option>
                {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
              <select value={selectedPayType} onChange={(e) => setSelectedPayType(e.target.value as "all" | PayType)} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm">
                <option value="all">All pay types</option>
                <option value="Monthly">Monthly</option>
                <option value="Hourly">Hourly</option>
                <option value="Stipend">Stipend</option>
              </select>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Records list */}
          <Card className="lg:col-span-2 bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Wallet className="w-5 h-5" />Payroll Records
                <Badge variant="secondary" className="ml-2">{filteredRecords.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredRecords.length === 0 ? (
                <p className="text-gray-600 text-sm">No payroll records found for current filters.</p>
              ) : (
                filteredRecords.map((r) => {
                  const emp = employeeById.get(r.user_id);
                  const isExpanded = expandedRecords.has(r.id);

                  return (
                    <div key={r.id} className={`border-l-4 ${getStatusColor(r.status)} pl-4 py-3 group hover:bg-gray-50 rounded-lg transition-colors`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 cursor-pointer" onClick={() => toggleExpand(r.id)}>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-gray-900">{emp?.full_name || "Unknown"}</div>
                            <Badge variant="outline" className="text-xs">{r.department_name || "No dept"}</Badge>
                            <Badge variant="secondary" className="text-xs">{r.period}</Badge>
                            <Badge variant={r.status === "Paid" ? "secondary" : r.status === "OnHold" ? "destructive" : "outline"} className="capitalize text-xs">
                              {r.status.replace(/([A-Z])/g, ' $1').trim()}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Net: </span>Rs {r.net_pay.toLocaleString()}
                            <span className="text-gray-400 mx-2">•</span>
                            <span>Gross: Rs {r.gross_pay.toLocaleString()}</span>
                            <span className="text-gray-400 mx-2">•</span>
                            <span>{r.pay_type} / {r.run_type}</span>
                          </div>
                          {isExpanded && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600 space-y-1">
                              <div>Basic: {r.basic_salary.toLocaleString()} | Allow: {r.allowances.toLocaleString()} | OT: {r.overtime.toLocaleString()} | Ded: {r.deductions.toLocaleString()}</div>
                              <div>Pay Date: {r.pay_date ? new Date(r.pay_date).toLocaleDateString() : "N/A"}</div>
                              {r.notes && <p className="text-gray-500 italic">{r.notes}</p>}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => toggleExpand(r.id)} className="text-gray-400 hover:text-gray-600">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {isAdminOrFinance && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                              {(r.status === "Draft" || r.status === "PendingApproval") && (
                                <button onClick={() => handleUpdateStatus(r.id, "Approved")} disabled={processingId === r.id} className="p-1 hover:bg-green-100 rounded" title="Approve">
                                  {processingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-green-600" />}
                                </button>
                              )}
                              {r.status === "Approved" && (
                                <button onClick={() => handleUpdateStatus(r.id, "Paid")} disabled={processingId === r.id} className="p-1 hover:bg-blue-100 rounded" title="Mark Paid">
                                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                </button>
                              )}
                              {r.status !== "Paid" && (
                                <button onClick={() => handleUpdateStatus(r.id, "OnHold")} disabled={processingId === r.id} className="p-1 hover:bg-red-100 rounded" title="Hold">
                                  <Ban className="w-3.5 h-3.5 text-red-600" />
                                </button>
                              )}
                              <button onClick={() => handleEditClick(r)} className="p-1 hover:bg-gray-100 rounded" title="Edit">
                                <Edit className="w-3.5 h-3.5 text-gray-600" />
                              </button>
                              <button onClick={() => handlePrintPayslip(r)} className="p-1 hover:bg-gray-100 rounded" title="Print Payslip">
                                <Printer className="w-3.5 h-3.5 text-gray-600" />
                              </button>
                              <button onClick={() => handleDelete(r.id)} className="p-1 hover:bg-red-100 rounded" title="Delete">
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Stats Dashboard */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <UsersIcon className="w-5 h-5" />Payroll Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm font-medium">Total Net (filtered)</p>
                <p className="text-2xl font-bold">Rs {totalNet.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border"><p className="text-xs">Gross</p><p className="text-lg font-bold">Rs {totalGross.toLocaleString()}</p></div>
                <div className="p-3 bg-gray-50 rounded-lg border"><p className="text-xs">Employees</p><p className="text-lg font-bold">{totalEmployees}</p></div>
                <div className="p-3 bg-gray-50 rounded-lg border"><p className="text-xs">Avg Net/Emp</p><p className="text-lg font-bold">Rs {avgNetPerEmployee.toLocaleString()}</p></div>
                <div className="p-3 bg-gray-50 rounded-lg border"><p className="text-xs">Paid Total</p><p className="text-lg font-bold">Rs {totalPaidNet.toLocaleString()}</p></div>
              </div>
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span>Paid: {statusCounts.Paid}</span></div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-500" /><span>Approved: {statusCounts.Approved}</span></div>
                <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" /><span>Pending: {statusCounts.PendingApproval}</span></div>
                <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-gray-500" /><span>Draft: {statusCounts.Draft}</span></div>
                <div className="flex items-center gap-2"><Ban className="w-4 h-4 text-red-500" /><span>On Hold: {statusCounts.OnHold}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && isAdminOrFinance && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">New Payroll Record</h2>
              <button onClick={() => { resetForm(); setShowCreate(false); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="px-4 py-3 space-y-3">
                {formError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{formError}</div>}
                
                <div>
                  <label className="text-xs font-medium">Employee</label>
                  <select value={formUserId} onChange={(e) => setFormUserId(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1">
                    <option value="">Select employee</option>
                    {employees.map((emp) => (<option key={emp.id} value={emp.id}>{emp.full_name}</option>))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Period *</label>
                    <input type="text" value={formPeriod} onChange={(e) => setFormPeriod(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1" placeholder="e.g., Dec 2024" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Pay Date *</label>
                    <input type="date" value={formPayDate} onChange={(e) => setFormPayDate(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Pay Type</label>
                    <select value={formPayType} onChange={(e) => setFormPayType(e.target.value as PayType)} className="w-full px-3 py-2 border rounded-md text-sm mt-1">
                      <option value="Monthly">Monthly</option>
                      <option value="Hourly">Hourly</option>
                      <option value="Stipend">Stipend</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Run Type</label>
                    <select value={formRunType} onChange={(e) => setFormRunType(e.target.value as RunType)} className="w-full px-3 py-2 border rounded-md text-sm mt-1">
                      <option value="Regular">Regular</option>
                      <option value="Overtime">Overtime</option>
                      <option value="Adjustment">Adjustment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium">Basic Salary *</label><input type="number" value={formBasic} onChange={(e) => setFormBasic(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium">Allowances</label><input type="number" value={formAllowances} onChange={(e) => setFormAllowances(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium">Overtime</label><input type="number" value={formOvertime} onChange={(e) => setFormOvertime(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium">Deductions</label><input type="number" value={formDeductions} onChange={(e) => setFormDeductions(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm mt-1" /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Status</label>
                    <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as PayrollStatus)} className="w-full px-3 py-2 border rounded-md text-sm mt-1">
                      <option value="Draft">Draft</option>
                      <option value="PendingApproval">Pending Approval</option>
                      <option value="Approved">Approved</option>
                      <option value="Paid">Paid</option>
                      <option value="OnHold">On Hold</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-md text-sm mt-1" />
                </div>
              </div>
              <div className="px-4 py-3 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { resetForm(); setShowCreate(false); }}>Cancel</Button>
                <Button type="submit" size="sm" disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && selectedRecord && isAdminOrFinance && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">Edit Payroll</h2>
              <button onClick={() => { setShowEdit(false); setSelectedRecord(null); }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="px-4 py-3 space-y-3">
                {editError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{editError}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium">Basic</label><input type="number" value={editForm.basic_salary} onChange={(e) => setEditForm({ ...editForm, basic_salary: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium">Allowances</label><input type="number" value={editForm.allowances} onChange={(e) => setEditForm({ ...editForm, allowances: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium">Overtime</label><input type="number" value={editForm.overtime} onChange={(e) => setEditForm({ ...editForm, overtime: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm mt-1" /></div>
                  <div><label className="text-xs font-medium">Deductions</label><input type="number" value={editForm.deductions} onChange={(e) => setEditForm({ ...editForm, deductions: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Status</label>
                    <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as PayrollStatus })} className="w-full px-3 py-2 border rounded-md text-sm mt-1">
                      <option value="Draft">Draft</option>
                      <option value="PendingApproval">Pending Approval</option>
                      <option value="Approved">Approved</option>
                      <option value="Paid">Paid</option>
                      <option value="OnHold">On Hold</option>
                    </select>
                  </div>
                  <div><label className="text-xs font-medium">Pay Date</label><input type="date" value={editForm.pay_date} onChange={(e) => setEditForm({ ...editForm, pay_date: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm mt-1" /></div>
                </div>
                <div><label className="text-xs font-medium">Notes</label><textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-md text-sm mt-1" /></div>
              </div>
              <div className="px-4 py-3 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowEdit(false); setSelectedRecord(null); }}>Cancel</Button>
                <Button type="submit" size="sm" disabled={editing}>{editing ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}