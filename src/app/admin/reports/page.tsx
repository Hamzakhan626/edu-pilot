/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, TrendingUp, TrendingDown, Users, BarChart3, LineChart, Eye, Loader2, AlertCircle } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface KPI {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  iconColor: string;
}

interface Program {
  id: string;
  name: string;
  code: string;
}

interface EnrollmentData {
  month: string;
  enrolled: number;
  active: number;
  inactive: number;
}

interface AttendanceData {
  month: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface PerformanceData {
  range: string;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

interface FeeData {
  status: string;
  amount: number;
  count: number;
  color: string;
  [key: string]: string | number;
}

interface AtRiskStudent {
  id: string;
  name: string;
  issue: string;
  severity: string;
  attendance?: number;
  grade?: string;
}

export default function AdminReportsPage() {
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('current');
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [feeData, setFeeData] = useState<FeeData[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);

  useEffect(() => {
    fetchAllData();
  }, [selectedProgram, selectedSemester, dateRange]);

  const getDateRangeParams = () => {
    const now = new Date();
    const startDate = new Date();
    let monthsBack = 5;

    switch (dateRange) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        monthsBack = 5;
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        monthsBack = 12;
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        monthsBack = 12;
        break;
    }

    return { startDate, monthsBack, now };
  };

  const getSemesterDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (selectedSemester === 'current') {
      // Current semester: last 6 months
      startDate.setMonth(now.getMonth() - 6);
      endDate = now;
    } else if (selectedSemester === 'previous') {
      // Previous semester: 6-12 months ago
      startDate.setMonth(now.getMonth() - 12);
      endDate.setMonth(now.getMonth() - 6);
    } else {
      // All time
      startDate = new Date('2020-01-01');
      endDate = now;
    }

    return { startDate, endDate };
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchPrograms(),
        fetchKPIs(),
        fetchEnrollmentTrends(),
        fetchAttendanceAnalysis(),
        fetchPerformanceDistribution(),
        fetchFeeCollection(),
        fetchAtRiskStudents()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from('programs')
      .select('id, name, code')
      .order('name');

    if (error) throw error;
    setPrograms(data || []);
  };

  const fetchKPIs = async () => {
    const { startDate, endDate } = getSemesterDateRange();

    // Fetch enrollments with program filter
    let enrollmentQuery = supabase
      .from('enrollments')
      .select('id, status, created_at, class_id, attendance_percentage, grade')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (selectedProgram) {
      enrollmentQuery = enrollmentQuery.eq('class_id', selectedProgram);
    }

    const { data: enrollments } = await enrollmentQuery;
    
    const activeEnrollments = enrollments?.filter(e => e.status === 'active').length || 0;
    
    // Calculate previous period for comparison
    const previousStartDate = new Date(startDate);
    previousStartDate.setMonth(previousStartDate.getMonth() - 6);
    
    let previousEnrollmentQuery = supabase
      .from('enrollments')
      .select('id, status, attendance_percentage')
      .gte('created_at', previousStartDate.toISOString())
      .lte('created_at', startDate.toISOString());
    
    if (selectedProgram) {
      previousEnrollmentQuery = previousEnrollmentQuery.eq('class_id', selectedProgram);
    }
    
    const { data: previousEnrollments } = await previousEnrollmentQuery;
    const previousActiveEnrollments = previousEnrollments?.filter(e => e.status === 'active').length || 1;
    
    const enrollmentChange = activeEnrollments - previousActiveEnrollments;
    const enrollmentTrend = enrollmentChange >= 0 ? 'up' : 'down';

    // Fetch attendance records
    const attendanceQuery = supabase
      .from('attendance')
      .select('status, attendance_date')
      .gte('attendance_date', startDate.toISOString().split('T')[0])
      .lte('attendance_date', endDate.toISOString().split('T')[0]);

    const { data: attendanceRecords } = await attendanceQuery;

    const totalAttendance = attendanceRecords?.length || 1;
    const presentCount = attendanceRecords?.filter(a => a.status === 'present').length || 0;
    const attendanceRate = ((presentCount / totalAttendance) * 100);

    // Previous period attendance
    const previousAttendanceQuery = supabase
      .from('attendance')
      .select('status')
      .gte('attendance_date', previousStartDate.toISOString().split('T')[0])
      .lt('attendance_date', startDate.toISOString().split('T')[0]);

    const { data: previousAttendanceRecords } = await previousAttendanceQuery;
    const previousTotalAttendance = previousAttendanceRecords?.length || 1;
    const previousPresentCount = previousAttendanceRecords?.filter(a => a.status === 'present').length || 0;
    const previousAttendanceRate = ((previousPresentCount / previousTotalAttendance) * 100);
    const attendanceChange = attendanceRate - previousAttendanceRate;

    // Fetch payment records
    const paymentQuery = supabase
      .from('payment_records')
      .select('amount_paid, payment_date, status')
      .gte('payment_date', startDate.toISOString().split('T')[0])
      .lte('payment_date', endDate.toISOString().split('T')[0]);

    const { data: payments } = await paymentQuery;

    const totalCollected = payments?.reduce((sum, p) => sum + (parseFloat(String(p.amount_paid)) || 0), 0) || 0;

    // Previous period payments
    const previousPaymentQuery = supabase
      .from('payment_records')
      .select('amount_paid')
      .gte('payment_date', previousStartDate.toISOString().split('T')[0])
      .lt('payment_date', startDate.toISOString().split('T')[0]);

    const { data: previousPayments } = await previousPaymentQuery;
    const previousTotalCollected = previousPayments?.reduce((sum, p) => sum + (parseFloat(String(p.amount_paid)) || 0), 0) || 1;
    
    const paymentChange = ((totalCollected - previousTotalCollected) / previousTotalCollected) * 100;

    // Calculate fee collection percentage
    const { data: allFees } = await supabase
      .from('fee_structure')
      .select('amount');
    
    const totalExpected = (allFees?.reduce((sum, f) => sum + parseFloat(String(f.amount)), 0) || 1) * activeEnrollments;
    const collectionPercentage = ((totalCollected / totalExpected) * 100);

    // Average attendance from enrollments
    const enrollmentsWithAttendance = enrollments?.filter(e => e.attendance_percentage != null) || [];
    const avgAttendance = enrollmentsWithAttendance.length > 0
      ? enrollmentsWithAttendance.reduce((sum, e) => sum + (parseFloat(String(e.attendance_percentage)) || 0), 0) / enrollmentsWithAttendance.length
      : 0;

    const previousEnrollmentsWithAttendance = previousEnrollments?.filter(e => e.attendance_percentage != null) || [];
    const previousAvgAttendance = previousEnrollmentsWithAttendance.length > 0
      ? previousEnrollmentsWithAttendance.reduce((sum, e) => sum + (parseFloat(String(e.attendance_percentage)) || 0), 0) / previousEnrollmentsWithAttendance.length
      : 0;
    
    const avgAttendanceChange = avgAttendance - previousAvgAttendance;

    const kpiData: KPI[] = [
      {
        label: 'Total Enrollment',
        value: activeEnrollments.toString(),
        change: `${enrollmentChange >= 0 ? '+' : ''}${enrollmentChange} this period`,
        trend: enrollmentTrend,
        icon: Users,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        label: 'Attendance Rate',
        value: `${attendanceRate.toFixed(1)}%`,
        change: `${attendanceChange >= 0 ? '+' : ''}${attendanceChange.toFixed(1)}% from last period`,
        trend: attendanceChange >= 0 ? 'up' : 'down',
        icon: BarChart3,
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600',
      },
      {
        label: 'Fee Collection',
        value: `Rs ${(totalCollected / 1000000).toFixed(2)}`,
        change: `${collectionPercentage.toFixed(1)}% collected`,
        trend: paymentChange >= 0 ? 'up' : 'down',
        icon: TrendingUp,
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
      },
      {
        label: 'Avg Attendance',
        value: `${avgAttendance.toFixed(1)}%`,
        change: `${avgAttendanceChange >= 0 ? '+' : ''}${avgAttendanceChange.toFixed(1)}% from last period`,
        trend: avgAttendanceChange >= 0 ? 'up' : 'down',
        icon: LineChart,
        bgColor: 'bg-orange-100',
        iconColor: 'text-orange-600',
      },
    ];

    setKpis(kpiData);
  };

  const fetchEnrollmentTrends = async () => {
    const { monthsBack } = getDateRangeParams();
    const { startDate, endDate } = getSemesterDateRange();
    
    const data: EnrollmentData[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthStart = new Date(endDate);
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);

      let enrollmentQuery = supabase
        .from('enrollments')
        .select('status, created_at')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (selectedProgram) {
        enrollmentQuery = enrollmentQuery.eq('class_id', selectedProgram);
      }

      const { data: enrollments } = await enrollmentQuery;

      const active = enrollments?.filter(e => e.status === 'active').length || 0;
      const inactive = enrollments?.filter(e => e.status !== 'active').length || 0;

      data.push({
        month: monthNames[monthStart.getMonth()],
        enrolled: active + inactive,
        active,
        inactive
      });
    }

    setEnrollmentData(data);
  };

  const fetchAttendanceAnalysis = async () => {
    const { monthsBack } = getDateRangeParams();
    const { startDate, endDate } = getSemesterDateRange();
    
    const data: AttendanceData[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthStart = new Date(endDate);
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .gte('attendance_date', monthStart.toISOString().split('T')[0])
        .lte('attendance_date', monthEnd.toISOString().split('T')[0]);

      data.push({
        month: monthNames[monthStart.getMonth()],
        present: attendance?.filter(a => a.status === 'present').length || 0,
        absent: attendance?.filter(a => a.status === 'absent').length || 0,
        late: attendance?.filter(a => a.status === 'late').length || 0,
        excused: attendance?.filter(a => a.status === 'excused').length || 0
      });
    }

    setAttendanceData(data);
  };

  const fetchPerformanceDistribution = async () => {
    const { startDate, endDate } = getSemesterDateRange();

    let enrollmentQuery = supabase
      .from('enrollments')
      .select('grade')
      .not('grade', 'is', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (selectedProgram) {
      enrollmentQuery = enrollmentQuery.eq('class_id', selectedProgram);
    }

    const { data: enrollments } = await enrollmentQuery;

    const gradeRanges = [
      { range: 'A (90-100)', min: 90, max: 100 },
      { range: 'B (80-89)', min: 80, max: 89 },
      { range: 'C (70-79)', min: 70, max: 79 },
      { range: 'D (60-69)', min: 60, max: 69 },
      { range: 'F (<60)', min: 0, max: 59 }
    ];

    const total = enrollments?.length || 1;
    const distribution = gradeRanges.map(({ range, min, max }) => {
      const count = enrollments?.filter(e => {
        const grade = parseFloat(String(e.grade));
        return grade >= min && grade <= max;
      }).length || 0;

      return {
        range,
        count,
        percentage: Math.round((count / total) * 100)
      };
    });

    setPerformanceData(distribution);
  };

  const fetchFeeCollection = async () => {
    const { startDate, endDate } = getSemesterDateRange();

    // Get all enrollments for the period
    let enrollmentQuery = supabase
      .from('enrollments')
      .select('id, student_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (selectedProgram) {
      enrollmentQuery = enrollmentQuery.eq('class_id', selectedProgram);
    }

    const { data: enrollments } = await enrollmentQuery;
    const enrollmentIds = enrollments?.map(e => e.id) || [];

    if (enrollmentIds.length === 0) {
      setFeeData([
        { status: 'Paid', amount: 0, count: 0, color: '#22c55e' },
        { status: 'Partial', amount: 0, count: 0, color: '#3b82f6' },
        { status: 'Unpaid', amount: 0, count: 0, color: '#f97316' },
        { status: 'Overdue', amount: 0, count: 0, color: '#ef4444' }
      ]);
      return;
    }

    // Fetch payments for these enrollments
    const { data: payments } = await supabase
      .from('payment_records')
      .select('amount_paid, status, enrollment_id')
      .in('enrollment_id', enrollmentIds);

    // Group payments by status
    const statusGroups = {
      paid: { amount: 0, count: 0 },
      partial: { amount: 0, count: 0 },
      unpaid: { amount: 0, count: 0 },
      overdue: { amount: 0, count: 0 }
    };

    // Create a map of enrollment payment status
    const enrollmentPayments = new Map();
    
    payments?.forEach(payment => {
      const enrollmentId = payment.enrollment_id;
      const amount = parseFloat(String(payment.amount_paid)) || 0;
      
      if (!enrollmentPayments.has(enrollmentId)) {
        enrollmentPayments.set(enrollmentId, { total: 0, status: payment.status });
      }
      
      enrollmentPayments.get(enrollmentId).total += amount;
    });

    // Calculate totals for each status
    enrollmentPayments.forEach((data, enrollmentId) => {
      const status = data.status?.toLowerCase() || 'unpaid';
      
      if (status === 'paid' || status === 'completed') {
        statusGroups.paid.amount += data.total;
        statusGroups.paid.count++;
      } else if (status === 'partial') {
        statusGroups.partial.amount += data.total;
        statusGroups.partial.count++;
      } else if (status === 'overdue') {
        statusGroups.overdue.amount += data.total;
        statusGroups.overdue.count++;
      } else {
        statusGroups.unpaid.amount += data.total;
        statusGroups.unpaid.count++;
      }
    });

    // Students with no payment records are unpaid
    const studentsWithPayments = enrollmentPayments.size;
    const studentsWithoutPayments = enrollmentIds.length - studentsWithPayments;
    statusGroups.unpaid.count += studentsWithoutPayments;

    const feeCollectionData: FeeData[] = [
      { status: 'Paid', amount: statusGroups.paid.amount, count: statusGroups.paid.count, color: '#22c55e' },
      { status: 'Partial', amount: statusGroups.partial.amount, count: statusGroups.partial.count, color: '#3b82f6' },
      { status: 'Unpaid', amount: statusGroups.unpaid.amount, count: statusGroups.unpaid.count, color: '#f97316' },
      { status: 'Overdue', amount: statusGroups.overdue.amount, count: statusGroups.overdue.count, color: '#ef4444' }
    ];

    setFeeData(feeCollectionData);
  };

  const fetchAtRiskStudents = async () => {
    const { startDate, endDate } = getSemesterDateRange();

    let enrollmentQuery = supabase
      .from('enrollments')
      .select(`
        id,
        attendance_percentage,
        grade,
        student_id,
        users!enrollments_student_id_fkey (
          full_name
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (selectedProgram) {
      enrollmentQuery = enrollmentQuery.eq('class_id', selectedProgram);
    }

    const { data: enrollments } = await enrollmentQuery;

    const atRisk: AtRiskStudent[] = [];

    enrollments?.forEach((enrollment: any) => {
      const attendance = parseFloat(String(enrollment.attendance_percentage || '0'));
      const grade = parseFloat(String(enrollment.grade || '0'));
      
      // Students are at risk if attendance < 75% OR grade < 60
      if ((attendance > 0 && attendance < 75) || (grade > 0 && grade < 60)) {
        let issue = '';
        let severity = 'medium';

        if (attendance < 50) {
          issue = `Critical attendance (${attendance.toFixed(0)}%)`;
          severity = 'high';
        } else if (attendance < 75) {
          issue = `Low attendance (${attendance.toFixed(0)}%)`;
          severity = 'medium';
        } else if (grade < 60) {
          issue = `Failing grade (${grade.toFixed(0)}%)`;
          severity = grade < 50 ? 'high' : 'medium';
        }

        if (enrollment.users && issue) {
          atRisk.push({
            id: enrollment.student_id,
            name: enrollment.users.full_name || 'Unknown',
            issue,
            severity,
            attendance,
            grade: grade > 0 ? grade.toFixed(0) : undefined
          });
        }
      }
    });

    // Sort by severity (high first) and then by attendance/grade
    atRisk.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'high' ? -1 : 1;
      }
      return (a.attendance || 0) - (b.attendance || 0);
    });

    setAtRiskStudents(atRisk.slice(0, 10));
  };

  const exportReport = () => {
    const reportData = {
      filters: {
        program: selectedProgram || 'All Programs',
        semester: selectedSemester,
        dateRange,
      },
      kpis,
      enrollmentData,
      attendanceData,
      performanceData,
      feeData,
      atRiskStudents,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="flex flex-col items-center p-8">
            <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
            <p className="text-gray-600 text-center mb-4">{error}</p>
            <Button onClick={fetchAllData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const colors = {
    blue: '#3b82f6',
    green: '#22c55e',
    purple: '#a855f7',
    orange: '#f97316',
    red: '#ef4444',
  };

  return (
    <div className="space-y-6 pb-8 p-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive institutional analytics and performance metrics</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-white"
            >
              <option value="">All Programs</option>
              {programs.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.code} - {prog.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-white"
            >
              <option value="current">Current Semester</option>
              <option value="previous">Previous Semester</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="flex gap-2">
              {(['month', 'quarter', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={exportReport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <Card key={index} className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{kpi.value}</p>
                    <div className="flex items-center mt-2 text-sm">
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                      )}
                      <span className={kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 ${kpi.bgColor} rounded-lg`}>
                    <IconComponent className={`h-6 w-6 ${kpi.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Enrollment Trend</CardTitle>
            <CardDescription>Active vs Inactive students over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="active" stroke={colors.green} strokeWidth={2} />
                <Line type="monotone" dataKey="inactive" stroke={colors.red} strokeWidth={2} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Attendance Analysis</CardTitle>
            <CardDescription>Monthly attendance patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill={colors.green} />
                <Bar dataKey="absent" fill={colors.red} />
                <Bar dataKey="late" fill={colors.orange} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Performance Distribution</CardTitle>
            <CardDescription>Student grades breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={performanceData}
                  dataKey="percentage"
                  nameKey="range"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {performanceData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={[colors.green, colors.blue, colors.orange, colors.orange, colors.red][index]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Fee Collection Status</CardTitle>
            <CardDescription>Payment status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={feeData}
                  dataKey="amount"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {feeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData.map((grade) => (
                <div key={grade.range} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{grade.range}</span>
                    <span className="text-gray-600">{grade.count} students</span>
                  </div>
                  <Progress value={grade.percentage} className="h-2" />
                  <div className="text-xs text-gray-500">{grade.percentage}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Fee Collection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feeData.map((fee) => (
                <div key={fee.status} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fee.color }}></div>
                    <div>
                      <p className="font-medium text-sm">{fee.status}</p>
                      <p className="text-xs text-gray-600">{fee.count} students</p>
                    </div>
                  </div>
                  <p className="font-semibold">Rs {(fee.amount / 1000000).toFixed(2)}</p>
                </div>
              ))}
              <div className="border-t pt-4 flex justify-between font-bold">
                <span>Total</span>
                <span>Rs {(feeData.reduce((sum, f) => sum + f.amount, 0) / 1000000).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {atRiskStudents.length > 0 && (
        <Card className="border-0 shadow-md border-l-4 border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              At-Risk Students ({atRiskStudents.length})
            </CardTitle>
            <CardDescription>Students requiring immediate intervention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {atRiskStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{student.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        student.severity === 'high' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {student.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{student.issue}</p>
                    {student.grade && (
                      <p className="text-xs text-gray-500 mt-1">Grade: {student.grade}%</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}