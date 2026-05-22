/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wallet,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  Search,
  RefreshCw,
  Loader2,
  X,
  Printer,
  Eye,
  Calendar,
  User,
} from "lucide-react";
import supabase from "@/lib/supabase/client";

type PayStatus = "Pending" | "Processing" | "Paid" | "OnHold";

interface PaymentRecord {
  id: string;
  period: string;
  payDate: string;
  type: "Salary" | "Overtime" | "Bonus" | "Adjustment";
  gross: number;
  deductions: number;
  net: number;
  status: PayStatus;
  method: "Bank Transfer" | "Cash" | "Cheque";
  reference?: string;
  employeeName?: string;
  department?: string;
  payType?: string;
  runType?: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return dateStr;
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function EmployeePaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");

  const [selectedStatus, setSelectedStatus] = useState<"all" | PayStatus>("all");
  const [selectedType, setSelectedType] = useState<"all" | PaymentRecord["type"]>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAlert({ type: "error", message: "Please log in to view payments." });
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      // Get user role
      const { data: userData } = await supabase
        .from("users")
        .select("role, full_name, department_id")
        .eq("id", user.id)
        .single();

      setUserRole(userData?.role || "");

      const allPayments: PaymentRecord[] = [];

      // Build query for payroll records - use simpler select first
      let payrollQuery = supabase
        .from("payroll_records")
        .select(`
          id,
          period,
          pay_date,
          net_pay,
          gross_pay,
          basic_salary,
          allowances,
          overtime,
          deductions,
          status,
          pay_type,
          run_type,
          paid_at,
          user_id
        `)
        .order("created_at", { ascending: false });

      // If not admin/finance, only show current user's records
      if (userData?.role !== "admin" && userData?.role !== "finance") {
        payrollQuery = payrollQuery.eq("user_id", user.id);
      }

      const { data: payrollData, error: payrollError } = await payrollQuery;

      if (payrollError) {
        console.error("Payroll fetch error:", payrollError);
        // Don't throw, just continue with empty data
        setPayments([]);
        setAlert({ type: "info", message: "No payroll data available. The payroll_records table may not exist yet." });
        setLoading(false);
        return;
      }

      // Get unique user IDs and fetch user details separately
      const userIds = [...new Set((payrollData || []).map((r: any) => r.user_id).filter(Boolean))];
      
      const userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name, email, department_id")
          .in("id", userIds);
        
        (users || []).forEach((u: any) => userMap.set(u.id, u));
      }

      // Get department names
      const deptIds = [...new Set(
        Array.from(userMap.values())
          .map((u: any) => u.department_id)
          .filter(Boolean)
      )];
      
      const deptMap = new Map<string, string>();
      if (deptIds.length > 0) {
        const { data: departments } = await supabase
          .from("departments")
          .select("id, name")
          .in("id", deptIds);
        
        (departments || []).forEach((d: any) => deptMap.set(d.id, d.name));
      }

      // Map payroll records to payment records
      if (payrollData) {
        payrollData.forEach((record: any) => {
          const userInfo = userMap.get(record.user_id);
          const empName = userInfo?.full_name || "Unknown Employee";
          const deptName = userInfo?.department_id 
            ? (deptMap.get(userInfo.department_id) || "Unknown Dept") 
            : "N/A";

          const statusMap: Record<string, PayStatus> = {
            "Draft": "Pending",
            "PendingApproval": "Pending",
            "Approved": "Processing",
            "Paid": "Paid",
            "OnHold": "OnHold",
          };

          const typeMap: Record<string, PaymentRecord["type"]> = {
            "Regular": "Salary",
            "Overtime": "Overtime",
            "Adjustment": "Adjustment",
          };

          allPayments.push({
            id: record.id?.slice(0, 8) || `PAY-${Date.now()}`,
            period: record.period || "N/A",
            payDate: record.pay_date || record.paid_at || new Date().toISOString(),
            type: typeMap[record.run_type] || "Salary",
            gross: record.gross_pay || (record.basic_salary + record.allowances + record.overtime) || 0,
            deductions: record.deductions || 0,
            net: record.net_pay || 0,
            status: statusMap[record.status] || "Pending",
            method: "Bank Transfer",
            reference: `PAYROLL-${record.period?.replace(/\s+/g, "-")}`,
            employeeName: empName,
            department: deptName,
            payType: record.pay_type,
            runType: record.run_type,
          });
        });
      }

      // Sort by date descending
      allPayments.sort((a, b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime());

      setPayments(allPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setAlert({ type: "error", message: "Failed to load payment data." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const totalNet = payments
    .filter((p) => p.status === "Paid")
    .reduce((s, p) => s + p.net, 0);
  const totalGross = payments.reduce((s, p) => s + p.gross, 0);
  const totalDeductions = payments.reduce((s, p) => s + p.deductions, 0);
  const paidCount = payments.filter((p) => p.status === "Paid").length;
  const pendingCount = payments.filter((p) => p.status === "Pending" || p.status === "Processing").length;
  const onHoldCount = payments.filter((p) => p.status === "OnHold").length;

  const summaryCards = [
    {
      label: "Total Net Received",
      value: `Rs ${totalNet.toLocaleString()}`,
      icon: DollarSign,
      color: "green",
      note: `From ${paidCount} paid payments`,
    },
    {
      label: "Total Gross Earnings",
      value: `Rs ${totalGross.toLocaleString()}`,
      icon: TrendingUp,
      color: "blue",
      note: `Deductions: Rs ${totalDeductions.toLocaleString()}`,
    },
    {
      label: "Pending / Processing",
      value: pendingCount,
      icon: AlertCircle,
      color: "orange",
      note: onHoldCount > 0 ? `${onHoldCount} on hold` : "Awaiting completion",
    },
    {
      label: "Total Payments",
      value: payments.length,
      icon: Wallet,
      color: "purple",
      note: `${payments.filter((p) => p.runType === "Overtime").length} overtime`,
    },
  ];

  const getStatusBadge = (status: PayStatus): string => {
    switch (status) {
      case "Paid":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "Processing":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "Pending":
        return "bg-gray-50 text-gray-700 border border-gray-200";
      case "OnHold":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = selectedStatus === "all" || p.status === selectedStatus;
    const matchesType = selectedType === "all" || p.type === selectedType;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.period.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.reference && p.reference.toLowerCase().includes(q)) ||
      p.type.toLowerCase().includes(q) ||
      (p.employeeName && p.employeeName.toLowerCase().includes(q)) ||
      (p.department && p.department.toLowerCase().includes(q));

    return matchesStatus && matchesType && matchesSearch;
  });

  const handlePrintPayslip = (payment: PaymentRecord) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${payment.period}</title>
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
          <h2>Payment Slip</h2>
          <h3>${payment.period}</h3>
        </div>
        <div class="details">
          <table>
            <tr><td><strong>Employee:</strong></td><td>${payment.employeeName || "N/A"}</td></tr>
            <tr><td><strong>Department:</strong></td><td>${payment.department || "N/A"}</td></tr>
            <tr><td><strong>Type:</strong></td><td>${payment.type}${payment.runType ? ` (${payment.runType})` : ""}</td></tr>
            <tr><td><strong>Status:</strong></td><td>${payment.status}</td></tr>
            <tr><td><strong>Pay Date:</strong></td><td>${formatDate(payment.payDate)}</td></tr>
            <tr><td><strong>Method:</strong></td><td>${payment.method}</td></tr>
            ${payment.reference ? `<tr><td><strong>Reference:</strong></td><td>${payment.reference}</td></tr>` : ""}
          </table>
        </div>
        <div class="details">
          <table>
            <tr><td>Gross Pay</td><td>Rs ${payment.gross.toLocaleString()}</td></tr>
            <tr><td>Deductions</td><td>Rs ${payment.deductions.toLocaleString()}</td></tr>
            <tr><td class="total">Net Pay</td><td class="total">Rs ${payment.net.toLocaleString()}</td></tr>
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

  const exportCSV = () => {
    const csvData = filteredPayments.map((p) => ({
      "ID": p.id,
      "Employee": p.employeeName || "N/A",
      "Department": p.department || "N/A",
      "Period": p.period,
      "Pay Date": formatDate(p.payDate),
      "Type": p.type,
      "Gross": p.gross.toString(),
      "Deductions": p.deductions.toString(),
      "Net": p.net.toString(),
      "Status": p.status,
      "Method": p.method,
      "Reference": p.reference || "",
    }));

    if (csvData.length === 0) return;

    const headers = Object.keys(csvData[0]) as (keyof typeof csvData[0])[];
    const csv = [headers.join(","), ...csvData.map((row) => headers.map((h) => row[h]).join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6">
          <Skeleton className="h-8 w-48 bg-white/20" />
          <Skeleton className="h-4 w-72 mt-2 bg-white/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={`sk-${i}`} className="border-0 shadow-lg">
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
            <h1 className="text-2xl font-bold mb-1">
              {userRole === "admin" || userRole === "finance" ? "All Employee Payments" : "My Payments"}
            </h1>
            <p className="text-emerald-100">
              View salary, overtime, bonuses, and adjustments by period
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPayments}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <RefreshCw className="mr-2 h-4 w-4" />Refresh
            </Button>
            <Button onClick={exportCSV} className="bg-white text-emerald-700 hover:bg-emerald-50">
              <Download className="mr-2 h-4 w-4" />Download History
            </Button>
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <Alert
          variant={alert.type === "error" ? "destructive" : "default"}
          className={
            alert.type === "success"
              ? "bg-green-50 border-green-200"
              : alert.type === "error"
              ? "bg-red-50 border-red-200"
              : "bg-blue-50 border-blue-200"
          }
        >
          {alert.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{alert.message}</AlertDescription>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAlert(null)}>
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((s, i) => {
          const Icon = s.icon;
          const isAlert = s.label.includes("Pending");
          const colorMap: Record<string, string> = {
            green: "bg-green-100 text-green-600",
            blue: "bg-blue-100 text-blue-600",
            orange: "bg-orange-100 text-orange-600",
            purple: "bg-purple-100 text-purple-600",
          };
          return (
            <Card key={`kpi-${i}`} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <div className={`p-3 rounded-xl ${colorMap[s.color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {isAlert ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-lg font-bold text-gray-900 mb-1">{s.value}</p>
                <p className="text-xs text-gray-600">{s.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Filter payments by status and type</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value === "all" ? "all" : (e.target.value as PayStatus))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Processing">Processing</option>
                <option value="Pending">Pending</option>
                <option value="OnHold">On Hold</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(e.target.value === "all" ? "all" : (e.target.value as PaymentRecord["type"]))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">All Types</option>
                <option value="Salary">Salary</option>
                <option value="Overtime">Overtime</option>
                <option value="Bonus">Bonus</option>
                <option value="Adjustment">Adjustment</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by period, employee, department, reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payments list */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            Payment History ({filteredPayments.length})
          </CardTitle>
          <CardDescription>
            One row per payment with gross, deductions, net, and method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayments.map((p) => (
              <div
                key={p.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-xs md:text-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="flex gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-gray-900">
                          {p.period} • {p.type}
                          {p.runType && p.runType !== "Regular" && ` (${p.runType})`}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] ${getStatusBadge(p.status)}`}>
                          {p.status}
                        </span>
                      </div>
                      {p.employeeName && (
                        <p className="text-gray-600 mb-1">
                          <User className="inline h-3 w-3 mr-1" />
                          {p.employeeName}
                          {p.department && ` • ${p.department}`}
                        </p>
                      )}
                      <p className="text-gray-600 mb-1">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        Pay date: {formatDate(p.payDate)} • Method: {p.method}
                      </p>
                      <p className="text-gray-500 text-[11px]">
                        ID: {p.id}
                        {p.reference && ` • Ref: ${p.reference}`}
                        {p.payType && ` • ${p.payType}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-1 text-gray-600">
                    <p>
                      Gross:{" "}
                      <span className="font-semibold text-gray-900">
                        Rs {p.gross.toLocaleString()}
                      </span>
                    </p>
                    <p>
                      Deductions:{" "}
                      <span className="font-semibold text-red-600">
                        Rs {p.deductions.toLocaleString()}
                      </span>
                    </p>
                    <p>
                      Net:{" "}
                      <span className="font-semibold text-emerald-700 text-sm">
                        Rs {p.net.toLocaleString()}
                      </span>
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1"
                      onClick={() => handlePrintPayslip(p)}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print Payslip
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredPayments.length === 0 && (
              <div className="text-center py-8">
                <Wallet className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  No payments match the selected filters or search query.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedStatus("all");
                    setSelectedType("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}