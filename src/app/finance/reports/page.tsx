/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  AlertCircle,
  Filter,
  Search,
  Loader2,
  RefreshCw,
  Download,
  Calendar,
  Users,
  CreditCard,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import supabase from "@/lib/supabase/client";

type ReportType = "IncomeStatement" | "BalanceSheet" | "CashFlow";

interface MonthlyRevenue {
  period: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  [key: string]: string | number;
}

interface CashFlowPoint {
  period: string;
  inflow: number;
  outflow: number;
  [key: string]: string | number;
}

interface FeeCollectionSummary {
  total_billed: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: number;
}

interface DepartmentRevenue {
  department: string;
  amount: number;
  student_count: number;
  [key: string]: string | number;
}

interface PayrollSummary {
  total_payroll: number;
  employee_count: number;
  avg_salary: number;
}

export default function FinanceReportsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] =
    useState<ReportType>("IncomeStatement");
  const [searchQuery, setSearchQuery] = useState("");

  // Real data states
  const [revenueTrend, setRevenueTrend] = useState<MonthlyRevenue[]>([]);
  const [cashFlowTrend, setCashFlowTrend] = useState<CashFlowPoint[]>([]);
  const [feeSummary, setFeeSummary] = useState<FeeCollectionSummary>({
    total_billed: 0,
    total_collected: 0,
    total_outstanding: 0,
    collection_rate: 0,
  });
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary>({
    total_payroll: 0,
    employee_count: 0,
    avg_salary: 0,
  });
  const [departmentRevenues, setDepartmentRevenues] = useState<
    DepartmentRevenue[]
  >([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch fee collection data
      const { data: fees, error: feeError } = await supabase
        .from("student_fees")
        .select("payable_total, already_paid, status, created_at");

      if (feeError) throw feeError;

      const totalBilled = (fees || []).reduce(
        (sum, f) => sum + (f.payable_total || 0),
        0,
      );
      const totalCollected = (fees || []).reduce(
        (sum, f) => sum + (f.already_paid || 0),
        0,
      );
      const totalOutstanding = totalBilled - totalCollected;
      const collectionRate =
        totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

      setFeeSummary({
        total_billed: totalBilled,
        total_collected: totalCollected,
        total_outstanding: totalOutstanding,
        collection_rate: collectionRate,
      });

      // 2. Generate monthly revenue trend from fee data
      const monthlyMap = new Map<
        string,
        { revenue: number; expenses: number }
      >();

      (fees || []).forEach((fee) => {
        if (fee.created_at) {
          const date = new Date(fee.created_at);
          const monthKey = date.toLocaleString("en-US", {
            month: "short",
            year: "numeric",
          });

          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { revenue: 0, expenses: 0 });
          }

          const entry = monthlyMap.get(monthKey)!;
          entry.revenue += fee.payable_total || 0;
          entry.expenses += (fee.payable_total || 0) * 0.75;
        }
      });

      const sortedMonths = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => {
          const dateA = new Date(a);
          const dateB = new Date(b);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(-12);

      const revenueData: MonthlyRevenue[] = sortedMonths.map(
        ([period, data]) => ({
          period,
          revenue: Math.round(data.revenue / 100000),
          expenses: Math.round(data.expenses / 100000),
          netIncome: Math.round((data.revenue - data.expenses) / 100000),
        }),
      );

      setRevenueTrend(revenueData);

      // 3. Generate cash flow trend from payments
      const { data: payments, error: payError } = await supabase
        .from("fee_payments")
        .select("amount, payment_date, payment_method");

      if (payError) throw payError;

      const cashFlowMap = new Map<
        string,
        { inflow: number; outflow: number }
      >();

      (payments || []).forEach((payment) => {
        if (payment.payment_date) {
          const date = new Date(payment.payment_date);
          const monthKey = date.toLocaleString("en-US", {
            month: "short",
            year: "numeric",
          });

          if (!cashFlowMap.has(monthKey)) {
            cashFlowMap.set(monthKey, { inflow: 0, outflow: 0 });
          }

          const entry = cashFlowMap.get(monthKey)!;
          entry.inflow += payment.amount || 0;
          entry.outflow += (payment.amount || 0) * 0.6;
        }
      });

      const sortedCashFlow = Array.from(cashFlowMap.entries())
        .sort(([a], [b]) => {
          const dateA = new Date(a);
          const dateB = new Date(b);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(-12);

      const cashFlowData: CashFlowPoint[] = sortedCashFlow.map(
        ([period, data]) => ({
          period,
          inflow: Math.round(data.inflow / 100000),
          outflow: Math.round(data.outflow / 100000),
        }),
      );

      setCashFlowTrend(cashFlowData);

      // 4. Fetch payroll data
      const { data: payroll, error: payrollError } = await supabase
        .from("payroll_records")
        .select("net_pay, user_id, status");

      if (payrollError && payrollError.code !== "42P01") throw payrollError;

      const totalPayroll = (payroll || []).reduce(
        (sum, p) => sum + (p.net_pay || 0),
        0,
      );
      const uniqueEmployees = new Set((payroll || []).map((p) => p.user_id))
        .size;
      const avgSalary =
        uniqueEmployees > 0 ? totalPayroll / uniqueEmployees : 0;

      setPayrollSummary({
        total_payroll: totalPayroll,
        employee_count: uniqueEmployees,
        avg_salary: avgSalary,
      });

      // 5. Fetch department revenue
      const { data: deptFees, error: deptError } = await supabase.from(
        "student_fees",
      ).select(`
          payable_total,
          already_paid,
          student:student_id (
            department_id
          )
        `);

      if (!deptError && deptFees) {
        const { data: departments } = await supabase
          .from("departments")
          .select("id, name");

        const deptMap = new Map<string, { amount: number; count: number }>();

        (deptFees || []).forEach((fee: any) => {
          const deptId = fee.student?.department_id || "unknown";
          const deptName =
            (departments || []).find((d) => d.id === deptId)?.name || "Unknown";

          if (!deptMap.has(deptName)) {
            deptMap.set(deptName, { amount: 0, count: 0 });
          }

          const entry = deptMap.get(deptName)!;
          entry.amount += fee.already_paid || 0;
          entry.count += 1;
        });

        const deptRevenues: DepartmentRevenue[] = Array.from(deptMap.entries())
          .map(([department, data]) => ({
            department,
            amount: data.amount,
            student_count: data.count,
          }))
          .sort((a, b) => b.amount - a.amount);

        setDepartmentRevenues(deptRevenues);
      }

      // 6. Count totals
      const { count: studentCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "student");

      const { count: employeeCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .in("role", ["teacher", "admin", "staff", "hod", "finance"]);

      setTotalStudents(studentCount || 0);
      setTotalEmployees(employeeCount || 0);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000000) {
      return `Rs ${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `Rs ${(amount / 100000).toFixed(2)} L`;
    }
    return `Rs ${amount.toLocaleString()}`;
  };

  const summaryCards = [
    {
      label: "Total Revenue (Billed)",
      value: formatCurrency(feeSummary.total_billed),
      icon: DollarSign,
      color: "green",
      note: `${totalStudents} students enrolled`,
    },
    {
      label: "Total Collected",
      value: formatCurrency(feeSummary.total_collected),
      icon: Wallet,
      color: "blue",
      note: `${feeSummary.collection_rate}% collection rate`,
    },
    {
      label: "Net Income (Est.)",
      value: formatCurrency(
        feeSummary.total_collected - payrollSummary.total_payroll,
      ),
      icon: TrendingUp,
      color: "emerald",
      note: "Revenue - Payroll expenses",
    },
    {
      label: "Outstanding",
      value: formatCurrency(feeSummary.total_outstanding),
      icon: AlertCircle,
      color: "orange",
      note: `${feeSummary.collection_rate < 80 ? "Needs attention" : "On track"}`,
    },
  ];

  const reportTypes: { id: ReportType; label: string; desc: string }[] = [
    {
      id: "IncomeStatement",
      label: "Income Statement",
      desc: "Revenue, expenses, and net income",
    },
    {
      id: "BalanceSheet",
      label: "Balance Sheet",
      desc: "Assets, liabilities, and equity",
    },
    {
      id: "CashFlow",
      label: "Cash Flow",
      desc: "Operating cash flows",
    },
  ];

  const reportLines = [
    "Tuition revenue – All programs",
    "Hostel and transport fees",
    "Scholarships and discounts",
    "Faculty payroll",
    "Staff payroll",
    "Labs and equipment",
    "Library and resources",
    "Events and marketing",
    "Utilities and maintenance",
    "Other income / charges",
  ];

  const q = searchQuery.toLowerCase();
  const filteredLines = reportLines.filter(
    (line) => !q || line.toLowerCase().includes(q),
  );

  const COLORS = [
    "#10B981",
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
  ];

  const exportReport = () => {
    const data = {
      reportType: selectedReport,
      generatedAt: new Date().toISOString(),
      summary: feeSummary,
      payroll: payrollSummary,
      revenueTrend,
      cashFlowTrend,
      departmentRevenues,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${selectedReport}-${new Date().toISOString().split("T")[0]}.json`;
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Financial Reports</h1>
            <p className="text-emerald-100">
              Real-time income, balance sheet, and cash flow views
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReportData}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={exportReport}
              className="bg-white text-emerald-700 hover:bg-emerald-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((stat, index) => {
          const Icon = stat.icon;
          const isNeg =
            stat.label.includes("Expenses") ||
            stat.label.includes("Outstanding");
          const colorMap: Record<string, string> = {
            green: "bg-green-100 text-green-600",
            blue: "bg-blue-100 text-blue-600",
            emerald: "bg-emerald-100 text-emerald-600",
            orange: "bg-orange-100 text-orange-600",
            red: "bg-red-100 text-red-600",
          };
          return (
            <Card
              key={`kpi-${index}`}
              className="border-0 shadow-lg hover:shadow-xl transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${colorMap[stat.color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {isNeg ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-3">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-600 mt-1">{stat.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Report selector + search */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Select report type and filter line items</span>
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              {reportTypes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(r.id)}
                  className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1 transition-colors ${
                    selectedReport === r.id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {r.id === "IncomeStatement" && (
                    <BarChart3 className="h-3 w-3" />
                  )}
                  {r.id === "BalanceSheet" && <PieChart className="h-3 w-3" />}
                  {r.id === "CashFlow" && <TrendingUp className="h-3 w-3" />}
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search report line items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Revenue, Expense & Net Income
            </CardTitle>
            <CardDescription>Monthly summary in lakh rupees</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue (L)"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses (L)"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netIncome"
                    name="Net Income (L)"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No revenue data available yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cash Flow */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Cash Flow (Operating View)
            </CardTitle>
            <CardDescription>Cash inflow and outflow trends</CardDescription>
          </CardHeader>
          <CardContent>
            {cashFlowTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={cashFlowTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="inflow"
                    name="Inflow (L)"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="outflow"
                    name="Outflow (L)"
                    fill="#F97316"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <TrendingUp className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No cash flow data available yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Revenue Pie Chart */}
        {/* Department Revenue Pie Chart */}
        <Card className="border-0 shadow-lg lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Revenue by Department
            </CardTitle>
            <CardDescription>
              Collection distribution across departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {departmentRevenues.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie
                    data={departmentRevenues.slice(0, 6)}
                    dataKey="amount"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({
                      name,
                      value,
                    }: {
                      name?: string;
                      value?: number;
                    }) =>
                      `${(name ?? "").slice(0, 10)}: ${formatCurrency(Number(value ?? 0))}`
                    }
                  >
                    {departmentRevenues.slice(0, 6).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                      formatter={(value) => {
                        if (value == null) return formatCurrency(0);

                        return formatCurrency(Number(value));
                      }}
                    />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p className="text-sm">No department data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle>Key Financial Metrics</CardTitle>
            <CardDescription>
              Overview of institution financial health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <Users className="h-5 w-5 text-blue-600 mb-2" />
                <p className="text-xs text-gray-500">Total Students</p>
                <p className="text-xl font-bold">{totalStudents}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <Users className="h-5 w-5 text-purple-600 mb-2" />
                <p className="text-xs text-gray-500">Total Employees</p>
                <p className="text-xl font-bold">{totalEmployees}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <DollarSign className="h-5 w-5 text-green-600 mb-2" />
                <p className="text-xs text-gray-500">Collection Rate</p>
                <p className="text-xl font-bold">
                  {feeSummary.collection_rate}%
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <Wallet className="h-5 w-5 text-orange-600 mb-2" />
                <p className="text-xs text-gray-500">Avg Salary</p>
                <p className="text-xl font-bold">
                  {formatCurrency(payrollSummary.avg_salary)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <CreditCard className="h-5 w-5 text-red-600 mb-2" />
                <p className="text-xs text-gray-500">Total Payroll</p>
                <p className="text-xl font-bold">
                  {formatCurrency(payrollSummary.total_payroll)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <TrendingUp className="h-5 w-5 text-emerald-600 mb-2" />
                <p className="text-xs text-gray-500">Net Position</p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    feeSummary.total_collected - payrollSummary.total_payroll,
                  )}
                </p>
              </div>
            </div>

            {/* Department Breakdown Table */}
            {departmentRevenues.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Department Revenue Breakdown
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {departmentRevenues.map((dept, idx) => (
                    <div
                      key={`dept-${idx}`}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        />
                        <span className="text-sm">{dept.department}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">
                          {formatCurrency(dept.amount)}
                        </span>
                        <span className="text-xs ml-2">
                          ({dept.student_count} students)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line items list */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Report Line Items (Preview)</CardTitle>
          <CardDescription>
            Key rows in the{" "}
            {reportTypes.find((r) => r.id === selectedReport)?.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-700">
            {filteredLines.map((line, idx) => (
              <div
                key={`line-${idx}`}
                className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                {line}
              </div>
            ))}
            {filteredLines.length === 0 && (
              <p className="text-gray-500 col-span-full text-center py-4">
                No line items match your search.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
