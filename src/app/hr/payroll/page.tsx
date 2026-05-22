'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  Users,
  User,
  CheckCircle,
  Clock,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  FileText,
  Building2,
  Download,
  Eye,
  AlertCircle,
  RefreshCw,
  X,
  CheckCircle2,
  XCircle,
  Info,
  Calendar,
  CreditCard,
  Hash,
  Briefcase,
  BadgeCheck
} from 'lucide-react';
import { supabase } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────
type PayrollStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Paid' | 'OnHold';
type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

interface EmployeeData {
  id: string;
  full_name: string;
  employee_id: string;
  role: string;
  department_id: string | null;
  effective_from: string | null;
  department: { name: string } | null;
}

interface PayrollRecord {
  id: string;
  user_id: string;
  period: string;
  gross_pay: number;
  deductions: number;
  net_pay: number;
  status: PayrollStatus;
  pay_type: string;
  run_date: string;
  bank_processed: boolean;
  created_by: string | null;
  approved_by: string | null;
  employee: EmployeeData | null;
}

interface SummaryStats {
  totalGross: number;
  totalNet: number;
  draftCount: number;
  pendingApprovalCount: number;
  approvedCount: number;
  paidCount: number;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function ToastContainer({
  toasts,
  onDismiss
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => {
        const Icon =
          t.type === 'success' ? CheckCircle2 : t.type === 'error' ? XCircle : Info;
        const accent = {
          success: 'border-l-emerald-500',
          error: 'border-l-red-500',
          info: 'border-l-blue-500'
        }[t.type];
        const iconColor = {
          success: 'text-emerald-500',
          error: 'text-red-500',
          info: 'text-blue-500'
        }[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl bg-white border border-gray-100 border-l-4 ${accent} min-w-[300px] max-w-sm`}
          >
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{t.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.message}</p>
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function PayrollDetailModal({
  record,
  onClose
}: {
  record: PayrollRecord;
  onClose: () => void;
}) {
  const emp = record.employee;

  const infoRows: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: 'Payroll ID',     value: record.id,                                                   icon: <Hash className="h-4 w-4" /> },
    { label: 'Employee',       value: emp?.full_name ?? '—',                                       icon: <User className="h-4 w-4" /> },
    { label: 'Employee ID',    value: emp?.employee_id ?? '—',                                     icon: <BadgeCheck className="h-4 w-4" /> },
    { label: 'Role',           value: emp?.role ?? '—',                                            icon: <Briefcase className="h-4 w-4" /> },
    { label: 'Department',     value: emp?.department?.name ?? 'No Department',                    icon: <Building2 className="h-4 w-4" /> },
    { label: 'Period',         value: record.period ?? '—',                                        icon: <Calendar className="h-4 w-4" /> },
    { label: 'Run Date',       value: record.run_date ? new Date(record.run_date).toLocaleDateString() : '—', icon: <Calendar className="h-4 w-4" /> },
    { label: 'Effective From', value: emp?.effective_from ? new Date(emp.effective_from).toLocaleDateString() : '—', icon: <Calendar className="h-4 w-4" /> },
    { label: 'Pay Type',       value: record.pay_type ?? '—',                                     icon: <CreditCard className="h-4 w-4" /> },
    { label: 'Status',         value: record.status,                                              icon: <CheckCircle className="h-4 w-4" /> },
    { label: 'Bank Processed', value: record.bank_processed ? 'Yes – Sent' : 'No – Pending',      icon: <Building2 className="h-4 w-4" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl p-5 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Payroll Details</h2>
            <p className="text-emerald-100 text-sm">
              {emp?.full_name ?? 'Employee'} — {record.period}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Rows */}
        <div className="p-5 space-y-1">
          {infoRows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                {r.icon}
                {r.label}
              </div>
              <span className="text-sm font-medium text-gray-800 text-right max-w-[55%] break-all">
                {r.value}
              </span>
            </div>
          ))}

          {/* Pay breakdown */}
          <div className="mt-4 rounded-xl bg-gray-50 p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Pay Breakdown
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Gross Pay</span>
              <span className="font-semibold">${(record.gross_pay ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Deductions</span>
              <span className="font-semibold text-red-600">
                −${(record.deductions ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-1">
              <span className="font-semibold text-gray-800">Net Pay</span>
              <span className="font-bold text-emerald-700 text-base">
                ${(record.net_pay ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Export Slip Modal ────────────────────────────────────────────────────────
function ExportSlipModal({
  record,
  onClose,
  onExport
}: {
  record: PayrollRecord;
  onClose: () => void;
  onExport: (format: 'pdf' | 'csv') => void;
}) {
  const emp = record.employee;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Export Pay Slip</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {emp?.full_name ?? '—'} · {record.period}
              </p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Summary preview */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Gross</span>
              <span className="font-semibold">${(record.gross_pay ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Deductions</span>
              <span className="font-semibold text-red-600">
                −${(record.deductions ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="font-semibold">Net Pay</span>
              <span className="font-bold text-emerald-700">
                ${(record.net_pay ?? 0).toLocaleString()}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-3">Choose export format:</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 border-2 hover:border-emerald-500 hover:text-emerald-700"
              onClick={() => onExport('pdf')}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm font-medium">PDF Slip</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 border-2 hover:border-emerald-500 hover:text-emerald-700"
              onClick={() => onExport('csv')}
            >
              <Download className="h-6 w-6" />
              <span className="text-sm font-medium">CSV Data</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generate Payroll Modal ───────────────────────────────────────────────────
function GeneratePayrollModal({
  records,
  selectedPeriod,
  onClose,
  onGenerate
}: {
  records: PayrollRecord[];
  selectedPeriod: string;
  onClose: () => void;
  onGenerate: (period: string, format: 'pdf' | 'csv') => void;
}) {
  const allPeriods = Array.from(
    new Set(records.map((r) => r.period).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  const [period, setPeriod] = useState(
    selectedPeriod !== 'all' ? selectedPeriod : allPeriods[0] ?? ''
  );

  const pr = records.filter((r) => r.period === period);
  const totalGross = pr.reduce((s, r) => s + (r.gross_pay ?? 0), 0);
  const totalNet = pr.reduce((s, r) => s + (r.net_pay ?? 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl p-5 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Generate Payroll File</h2>
            <p className="text-emerald-100 text-sm">Export full payroll run for a period</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Period picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {allPeriods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Period summary */}
          {period && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-semibold text-emerald-800 mb-2">Period Summary</p>
              <div className="flex justify-between text-gray-700">
                <span>Employees</span>
                <span className="font-semibold">{pr.length}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Total Gross</span>
                <span className="font-semibold">${totalGross.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Total Net</span>
                <span className="font-semibold text-emerald-700">
                  ${totalNet.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500">Choose export format:</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="flex flex-col items-center gap-2 h-auto py-4 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onGenerate(period, 'pdf')}
              disabled={!period}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm font-medium">PDF Report</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 border-2 hover:border-emerald-500 hover:text-emerald-700"
              onClick={() => onGenerate(period, 'csv')}
              disabled={!period}
            >
              <Download className="h-6 w-6" />
              <span className="text-sm font-medium">CSV Export</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Utility helpers ──────────────────────────────────────────────────────────
function getStatusBadge(status: PayrollStatus) {
  switch (status) {
    case 'Draft':           return 'bg-gray-50 text-gray-700 border border-gray-200';
    case 'PendingApproval': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    case 'Approved':        return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'Paid':            return 'bg-green-50 text-green-700 border border-green-200';
    case 'OnHold':          return 'bg-red-50 text-red-700 border border-red-200';
    default:                return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
}

function fmt(n: number) {
  return (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printPaySlip(record: PayrollRecord) {
  const emp = record.employee;
  const html = `
    <html><head><title>Pay Slip – ${emp?.full_name ?? ''}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:600px;margin:0 auto}
      h1{font-size:22px;margin-bottom:4px}
      .sub{color:#666;font-size:13px;margin-bottom:28px}
      table{width:100%;border-collapse:collapse}
      td{padding:9px 0;border-bottom:1px solid #eee;font-size:14px}
      td:last-child{text-align:right;font-weight:600}
      .section{background:#f9fafb;padding:12px 14px;margin:18px 0 8px;font-weight:700;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-radius:6px}
      .total td{font-weight:700;font-size:16px;border-top:2px solid #111;border-bottom:none;padding-top:14px}
      .red{color:#dc2626} .green{color:#059669}
    </style></head><body>
    <h1>Pay Slip</h1>
    <div class="sub">${emp?.full_name ?? '—'} &nbsp;·&nbsp; ${record.period}</div>
    <div class="section">Employee Info</div>
    <table>
      <tr><td>Employee ID</td><td>${emp?.employee_id ?? '—'}</td></tr>
      <tr><td>Role</td><td>${emp?.role ?? '—'}</td></tr>
      <tr><td>Department</td><td>${emp?.department?.name ?? '—'}</td></tr>
      <tr><td>Effective From</td><td>${emp?.effective_from ? new Date(emp.effective_from).toLocaleDateString() : '—'}</td></tr>
    </table>
    <div class="section">Payroll Info</div>
    <table>
      <tr><td>Pay Type</td><td>${record.pay_type ?? '—'}</td></tr>
      <tr><td>Run Date</td><td>${record.run_date ? new Date(record.run_date).toLocaleDateString() : '—'}</td></tr>
      <tr><td>Status</td><td>${record.status}</td></tr>
      <tr><td>Bank Processed</td><td>${record.bank_processed ? 'Yes' : 'No'}</td></tr>
    </table>
    <div class="section">Pay Breakdown</div>
    <table>
      <tr><td>Gross Pay</td><td>$${fmt(record.gross_pay)}</td></tr>
      <tr><td class="red">Deductions</td><td class="red">−$${fmt(record.deductions)}</td></tr>
      <tr class="total"><td>Net Pay</td><td class="green">$${fmt(record.net_pay)}</td></tr>
    </table>
    </body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}

function printPayrollReport(records: PayrollRecord[], period: string) {
  const rows = records.map((r) => `
    <tr>
      <td>${r.employee?.full_name ?? '—'}</td>
      <td>${r.employee?.employee_id ?? '—'}</td>
      <td>${r.employee?.department?.name ?? '—'}</td>
      <td>${r.pay_type}</td>
      <td>$${fmt(r.gross_pay)}</td>
      <td style="color:#dc2626">−$${fmt(r.deductions)}</td>
      <td style="color:#059669;font-weight:700">$${fmt(r.net_pay)}</td>
      <td>${r.status}</td>
    </tr>`).join('');
  const totalGross = records.reduce((s, r) => s + (r.gross_pay ?? 0), 0);
  const totalNet   = records.reduce((s, r) => s + (r.net_pay   ?? 0), 0);
  const html = `<html><head><title>Payroll – ${period}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#111}
      h1{font-size:20px} .sub{color:#666;font-size:13px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#f3f4f6;padding:10px 8px;text-align:left;border-bottom:2px solid #e5e7eb}
      td{padding:8px;border-bottom:1px solid #f3f4f6}
      .foot td{font-weight:700;border-top:2px solid #111;font-size:14px}
    </style></head><body>
    <h1>Payroll Report — ${period}</h1>
    <div class="sub">Generated ${new Date().toLocaleDateString()} · ${records.length} employees</div>
    <table>
      <thead><tr><th>Name</th><th>ID</th><th>Department</th><th>Pay Type</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="foot"><td colspan="4">TOTALS</td><td>$${fmt(totalGross)}</td><td></td><td style="color:#059669">$${fmt(totalNet)}</td><td></td></tr></tfoot>
    </table></body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.print(); }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HRPayrollProcessingPage() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | PayrollStatus>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Modal state
  const [detailRecord, setDetailRecord] = useState<PayrollRecord | null>(null);
  const [exportRecord, setExportRecord] = useState<PayrollRecord | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('You must be logged in to view payroll data.');
        return;
      }

      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .single();

      if (userError || !currentUser) {
        setError('Could not resolve user profile.');
        return;
      }

      const isHrAdmin = ['admin', 'hr', 'principal', 'superadmin'].includes(
        (currentUser.role ?? '').toLowerCase()
      );

      let query = supabase
        .from('payroll_records')
        .select(`
          id,
          user_id,
          period,
          gross_pay,
          deductions,
          net_pay,
          status,
          pay_type,
          run_date,
          bank_processed,
          created_by,
          approved_by,
          employee:users!payroll_records_user_id_fkey (
            id,
            full_name,
            employee_id,
            role,
            effective_from,
            department_id,
            department:departments!users_department_id_fkey (
              name
            )
          )
        `)
        .order('run_date', { ascending: false });

      if (!isHrAdmin) {
        query = query.eq('user_id', currentUser.id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const records = (data ?? []) as unknown as PayrollRecord[];
      setPayrollRecords(records);

      const uniquePeriods = Array.from(
        new Set(records.map((r) => r.period).filter((p): p is string => Boolean(p)))
      ).sort((a, b) => b.localeCompare(a));
      setPeriods(uniquePeriods);

      if (uniquePeriods.length > 0) {
        setSelectedPeriod((prev) => (prev === 'all' ? uniquePeriods[0] : prev));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load payroll data.';
      setError(msg);
      addToast('error', 'Load Failed', msg);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  // ── Export slip handler ─────────────────────────────────────────────────────
  const handleExportSlip = useCallback(
    (record: PayrollRecord, format: 'pdf' | 'csv') => {
      setExportRecord(null);
      const emp = record.employee;
      if (format === 'pdf') {
        printPaySlip(record);
        addToast('success', 'Pay Slip Exported', `PDF slip for ${emp?.full_name ?? 'employee'} sent to printer.`);
      } else {
        downloadCSV(
          `payslip_${emp?.employee_id ?? record.id}_${record.period ?? 'unknown'}.csv`,
          [[
            record.id,
            emp?.full_name ?? '',
            emp?.employee_id ?? '',
            emp?.role ?? '',
            emp?.department?.name ?? '',
            record.period ?? '',
            record.pay_type ?? '',
            record.run_date ?? '',
            String(record.gross_pay ?? 0),
            String(record.deductions ?? 0),
            String(record.net_pay ?? 0),
            record.status,
            record.bank_processed ? 'Yes' : 'No',
          ]],
          ['ID','Name','Employee ID','Role','Department','Period','Pay Type','Run Date','Gross','Deductions','Net Pay','Status','Bank Processed']
        );
        addToast('success', 'CSV Downloaded', `Pay slip CSV for ${emp?.full_name ?? 'employee'} downloaded.`);
      }
    },
    [addToast]
  );

  // ── Generate payroll file handler ───────────────────────────────────────────
  const handleGeneratePayroll = useCallback(
    (period: string, format: 'pdf' | 'csv') => {
      setShowGenerate(false);
      const pr = payrollRecords.filter((r) => r.period === period);
      if (pr.length === 0) {
        addToast('error', 'No Records', `No payroll records found for: ${period}.`);
        return;
      }
      if (format === 'csv') {
        downloadCSV(
          `payroll_${(period ?? 'unknown').replace(/\s+/g, '_')}.csv`,
          pr.map((r) => [
            r.id,
            r.employee?.full_name ?? '',
            r.employee?.employee_id ?? '',
            r.employee?.role ?? '',
            r.employee?.department?.name ?? '',
            r.period ?? '',
            r.pay_type ?? '',
            r.run_date ?? '',
            String(r.gross_pay ?? 0),
            String(r.deductions ?? 0),
            String(r.net_pay ?? 0),
            r.status,
            r.bank_processed ? 'Yes' : 'No',
          ]),
          ['ID','Name','Employee ID','Role','Department','Period','Pay Type','Run Date','Gross','Deductions','Net Pay','Status','Bank Processed']
        );
        addToast('success', 'CSV Exported', `Payroll CSV for ${period} (${pr.length} records) downloaded.`);
      } else {
        printPayrollReport(pr, period);
        addToast('success', 'PDF Generated', `Payroll PDF for ${period} (${pr.length} records) sent to printer.`);
      }
    },
    [payrollRecords, addToast]
  );

  // ── Derived data ────────────────────────────────────────────────────────────
  const filteredRecords = payrollRecords.filter((p) => {
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
    const matchesPeriod = selectedPeriod === 'all' || p.period === selectedPeriod;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (p.employee?.full_name ?? '').toLowerCase().includes(q) ||
      (p.employee?.employee_id ?? '').toLowerCase().includes(q) ||
      (p.employee?.role ?? '').toLowerCase().includes(q) ||
      (p.employee?.department?.name ?? '').toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q);
    return matchesStatus && matchesPeriod && matchesSearch;
  });

  const periodRecords =
    selectedPeriod === 'all'
      ? payrollRecords
      : payrollRecords.filter((p) => p.period === selectedPeriod);

  const stats: SummaryStats = {
    totalGross:           periodRecords.reduce((s, p) => s + (p.gross_pay ?? 0), 0),
    totalNet:             periodRecords.reduce((s, p) => s + (p.net_pay   ?? 0), 0),
    draftCount:           periodRecords.filter((p) => p.status === 'Draft').length,
    pendingApprovalCount: periodRecords.filter((p) => p.status === 'PendingApproval').length,
    approvedCount:        periodRecords.filter((p) => p.status === 'Approved').length,
    paidCount:            periodRecords.filter((p) => p.status === 'Paid').length,
  };

  const summaryCards = [
    { label: 'Total Gross for Period',   value: `$${fmt(stats.totalGross)}`, icon: DollarSign,  color: 'blue',   note: 'All employees in selected period',   trend: 'up'   },
    { label: 'Total Net for Period',     value: `$${fmt(stats.totalNet)}`,   icon: CheckCircle, color: 'green',  note: 'After deductions',                   trend: 'up'   },
    { label: 'Draft / Pending Approval', value: `${stats.draftCount} / ${stats.pendingApprovalCount}`, icon: Clock, color: 'orange', note: 'Awaiting processing', trend: 'down' },
    { label: 'Approved / Paid',          value: `${stats.approvedCount} / ${stats.paidCount}`,         icon: Users, color: 'purple', note: 'Ready or already processed', trend: 'up' },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600  transition-all duration-500 ease-out 
                   hover:scale-105 hover:shadow-2xl border-1  rounded-xl p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl text-white font-bold mb-1">Payroll Processing</h1>
              <p className="text-sky-100">
                Track payroll runs, statuses, and amounts by employee and period
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchPayroll}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition-colors disabled:opacity-50"

              >
                 <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
             
              </Button>
              <Button
                className="bg-white text-black hover:bg-gray-300"
                onClick={() => {
                  if (payrollRecords.length === 0) {
                    addToast('info', 'No Data', 'No payroll records loaded yet. Try refreshing first.');
                    return;
                  }
                  setShowGenerate(true);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Payroll File
              </Button>
            </div>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
              onClick={fetchPayroll}
            >
              Retry
            </Button>
          </div>
        )}

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="transition-all duration-500 ease-out 
          hover:scale-105 hover:shadow-2xl border-1  rounded-xl">
                <CardContent className="p-6">
                  {loading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-xl" />
                      <div className="h-6 w-24 bg-gray-200 rounded" />
                      <div className="h-4 w-32 bg-gray-100 rounded" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                          <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                        </div>
                        {stat.trend === 'down'
                          ? <TrendingDown className="h-4 w-4 text-red-500" />
                          : <TrendingUp className="h-4 w-4 text-green-500" />}
                      </div>
                      <p className="text-xl font-bold text-gray-900 mb-1">{stat.value}</p>
                      <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                      <p className="text-xs text-gray-600">{stat.note}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Filters ── */}
        <Card className="transition-all duration-500 ease-out 
            hover:scale-105 hover:shadow-2xl border-1  rounded-xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Filter className="h-4 w-4 text-gray-500" />
                <span>Filter payroll by period and status</span>
              </div>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  disabled={loading}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  <option value="all">All Periods</option>
                  {periods.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(
                      e.target.value === 'all' ? 'all' : (e.target.value as PayrollStatus)
                    )
                  }
                  disabled={loading}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  <option value="all">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="PendingApproval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                  <option value="OnHold">On Hold</option>
                </select>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by employee, ID, role, department, or payroll ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Payroll list ── */}
        <Card className="border-1 shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Payroll Items
              {!loading && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''})
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Each payroll record with gross, deductions, net, and processing status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Skeletons */}
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-48 bg-gray-200 rounded" />
                        <div className="h-4 w-64 bg-gray-100 rounded" />
                        <div className="h-3 w-80 bg-gray-100 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-gray-100 rounded ml-auto" />
                        <div className="h-4 w-24 bg-gray-100 rounded ml-auto" />
                        <div className="h-4 w-24 bg-gray-200 rounded ml-auto" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Records */}
            {!loading && (
              <div className="space-y-4">
                {filteredRecords.map((p) => (
                  <div
                    key={p.id}
                    className=" border-gray-200 transition-all duration-500 ease-out 
                               hover:scale-105 hover:shadow-2xl border-1   rounded-lg p-6 "
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      {/* Left: employee info */}
                      <div className="flex gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-6 w-6 text-emerald-700" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {p.employee?.full_name ?? '—'}
                            </h3>
                            {p.employee?.employee_id && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                                {p.employee.employee_id}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(p.status)}`}>
                              {p.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {p.employee?.role ?? '—'} · {p.employee?.department?.name ?? 'No Department'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Period: {p.period} · Run date:{' '}
                            {p.run_date ? new Date(p.run_date).toLocaleDateString() : '—'} · Effective from:{' '}
                            {p.employee?.effective_from
                              ? new Date(p.employee.effective_from).toLocaleDateString()
                              : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Right: financials + actions */}
                      <div className="flex flex-col items-start lg:items-end gap-1 text-xs text-gray-600 flex-shrink-0">
                        <p>Gross: <span className="font-semibold">${fmt(p.gross_pay)}</span></p>
                        <p>
                          Deductions:{' '}
                          <span className="font-semibold text-red-600">−${fmt(p.deductions)}</span>
                        </p>
                        <p>
                          Net Pay:{' '}
                          <span className="font-semibold text-emerald-700">${fmt(p.net_pay)}</span>
                        </p>
                        <p className="flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          Bank:{' '}
                          {p.bank_processed
                            ? <span className="text-green-600 font-semibold">Sent</span>
                            : <span className="text-yellow-700 font-semibold">Pending</span>}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetailRecord(p)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExportRecord(p)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export Slip
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredRecords.length === 0 && (
                  <div className="text-center py-10">
                    <DollarSign className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      No payroll items match the selected filters or search query.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Modals ── */}
      {detailRecord && (
        <PayrollDetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
        />
      )}

      {exportRecord && (
        <ExportSlipModal
          record={exportRecord}
          onClose={() => setExportRecord(null)}
          onExport={(format) => handleExportSlip(exportRecord, format)}
        />
      )}

      {showGenerate && (
        <GeneratePayrollModal
          records={payrollRecords}
          selectedPeriod={selectedPeriod}
          onClose={() => setShowGenerate(false)}
          onGenerate={handleGeneratePayroll}
        />
      )}

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}