/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Wallet,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Download,
  Eye,
  Building2,
  Users,
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
} from "recharts";

type DepartmentId = "cs" | "se" | "ms";

interface DepartmentFinance {
  id: DepartmentId;
  name: string;
  revenue: number;
  expenses: number;
  budget: number;
  actual: number;
  students: number;
}

interface LinePoint {
  month: string;
  revenue: number;
  expenses: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
}

function FinanceDashboardPage() {
  const [selectedDept, setSelectedDept] = useState<"all" | DepartmentId>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<"fy" | "semester">("fy");
  const [searchQuery, setSearchQuery] = useState("");

  const departments: DepartmentFinance[] = [
    {
      id: "cs",
      name: "Computer Science",
      revenue: 38_50_000,
      expenses: 26_20_000,
      budget: 28_00_000,
      actual: 26_20_000,
      students: 320,
    },
    {
      id: "se",
      name: "Software Engineering",
      revenue: 25_40_000,
      expenses: 17_60_000,
      budget: 18_50_000,
      actual: 17_60_000,
      students: 210,
    },
    {
      id: "ms",
      name: "MS Computer Science",
      revenue: 9_20_000,
      expenses: 6_80_000,
      budget: 7_00_000,
      actual: 6_80_000,
      students: 60,
    },
  ];

  const revenueTrend: LinePoint[] = [
    { month: "Jul", revenue: 9.2, expenses: 6.8 },
    { month: "Aug", revenue: 10.1, expenses: 7.0 },
    { month: "Sep", revenue: 11.3, expenses: 7.6 },
    { month: "Oct", revenue: 12.0, expenses: 8.0 },
    { month: "Nov", revenue: 12.4, expenses: 8.3 },
    { month: "Dec", revenue: 12.9, expenses: 8.6 },
  ];

  const expenseBreakdown: ExpenseCategory[] = [
    { category: "Faculty Salaries", amount: 22_00_000 },
    { category: "Staff & Admin", amount: 5_40_000 },
    { category: "Labs & Equipment", amount: 3_10_000 },
    { category: "Events & Outreach", amount: 1_20_000 },
    { category: "Miscellaneous", amount: 90_000 },
  ];

  const totalRevenue = departments.reduce((s, d) => s + d.revenue, 0);
  const totalExpenses = departments.reduce((s, d) => s + d.expenses, 0);
  const totalBudget = departments.reduce((s, d) => s + d.budget, 0);
  const netIncome = totalRevenue - totalExpenses;
  const marginPct =
    totalRevenue === 0 ? 0 : Math.round((netIncome / totalRevenue) * 100);

  const overBudgetDepts = departments.filter((d) => d.actual > d.budget).length;

  const summaryCards = [
    {
      label: "Total Revenue (FY)",
      value: `Rs ${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "green",
      note: "Tuition, fees, and other income",
    },
    {
      label: "Total Expenses (FY)",
      value: `Rs ${totalExpenses.toLocaleString()}`,
      icon: CreditCard,
      color: "red",
      note: "Salaries, labs, operations",
    },
    {
      label: "Net Income / Margin",
      value: `Rs ${netIncome.toLocaleString()} (${marginPct}%)`,
      icon: Wallet,
      color: "blue",
      note: "After all direct expenses",
    },
    {
      label: "Over-Budget Departments",
      value: overBudgetDepts,
      icon: AlertCircle,
      color: "orange",
      note: "Actual > budget year-to-date",
    },
  ];

  const filteredDepts =
    selectedDept === "all"
      ? departments
      : departments.filter((d) => d.id === selectedDept);

  const q = searchQuery.toLowerCase();
  const visibleDepts = filteredDepts.filter(
    (d) =>
      !q ||
      d.name.toLowerCase().includes(q) ||
      String(d.students).includes(q) ||
      String(d.revenue).includes(q)
  );

  const totalExpenseBase = expenseBreakdown.reduce((s, e) => s + e.amount, 0);
  const expenseChartData = expenseBreakdown.map((e) => ({
    category: e.category.replace(" & ", " / "),
    amount: e.amount,
    share:
      totalExpenseBase === 0
        ? 0
        : Math.round((e.amount / totalExpenseBase) * 100),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1">Finance Dashboard</h1>
            <p className="text-emerald-100">
              High-level overview of revenue, expenses, and budget utilisation
            </p>
          </div>
          <Button className="bg-white text-emerald-700 hover:bg-emerald-50">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Export Finance Report
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((stat, idx) => {
          const Icon = stat.icon;
          const isNegative = stat.label === "Total Expenses (FY)";
          return (
            <Card key={idx} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                  {isNegative ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900 mb-1">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-600">{stat.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Filter financials by department and period</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <select
                value={selectedDept}
                onChange={(e) =>
                  setSelectedDept(e.target.value as "all" | DepartmentId)
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Departments</option>
                <option value="cs">Computer Science</option>
                <option value="se">Software Engineering</option>
                <option value="ms">MS Computer Science</option>
              </select>

              <select
                value={selectedPeriod}
                onChange={(e) =>
                  setSelectedPeriod(e.target.value as "fy" | "semester")
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="fy">Current Financial Year</option>
                <option value="semester">Current Semester</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by department name, students, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs expenses trend */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Revenue vs Expenses (Monthly)
            </CardTitle>
            <CardDescription>
              Department-wide trend in lakhs (Rs) for the current year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue (Lakh Rs)"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses (Lakh Rs)"
                  stroke="#EF4444"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense breakdown */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>
              Major cost heads and their share in total expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={expenseChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="amount"
                  name="Amount (Rs)"
                  fill="#3B82F6"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
              {expenseChartData.map((e) => (
                <div key={e.category} className="flex justify-between">
                  <span>{e.category}</span>
                  <span>{e.share}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per‑department cards */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="mr-2 h-5 w-5" />
            Department Financials
          </CardTitle>
          <CardDescription>
            Revenue, expenses, and budget utilisation for each department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visibleDepts.map((d) => {
              const utilPct =
                d.budget === 0 ? 0 : Math.round((d.actual / d.budget) * 100);
              const perStudent =
                d.students === 0 ? 0 : Math.round(d.revenue / d.students);
              const overBudget = d.actual > d.budget;

              return (
                <div
                  key={d.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {d.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {d.students} students enrolled
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mt-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Revenue</p>
                      <p className="text-sm font-semibold text-emerald-700">
                        Rs {d.revenue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Expenses</p>
                      <p className="text-sm font-semibold text-red-600">
                        Rs {d.expenses.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Budget vs Actual
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        Rs {d.actual.toLocaleString()} / Rs{" "}
                        {d.budget.toLocaleString()}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            overBudget ? "bg-red-500" : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(utilPct, 130)}%`,
                          }}
                        />
                      </div>
                      <p
                        className={`text-[11px] mt-1 ${
                          overBudget ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {utilPct}% of budget used
                        {overBudget && " • Over budget"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Revenue per Student
                      </p>
                      <p className="text-sm font-semibold text-indigo-700 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Rs {perStudent.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleDepts.length === 0 && (
              <div className="text-center py-10">
                <Building2 className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No departments match the current filters or search query.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FinanceDashboardPage;
