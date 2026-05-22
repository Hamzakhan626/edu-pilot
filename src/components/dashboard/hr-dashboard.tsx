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
import {
  UserPlus,
  Briefcase,
  CheckCircle,
  Clock,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Mail,
  Building2,
  DollarSign,
  Eye,
  FileText,
  Loader2,
  X,
  RefreshCw,
  Send,
  CheckSquare,
  XCircle,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/auth';


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RoleType = 'Faculty' | 'Staff';
type HiringStatus = 'Pending' | 'Approved' | 'Rejected' | 'Hired';
type HiringStage = 'Requested' | 'Screening' | 'Interview' | 'Offer' | 'Onboarding';
type PayrollStatus = 'NotStarted' | 'InProgress' | 'Completed';
type Priority = 'High' | 'Normal';
type PayrollRecordStatus =
  | 'Draft'
  | 'PendingApproval'
  | 'Approved'
  | 'Paid'
  | 'OnHold';

interface HiringRequest {
  id: string;
  position_title: string | null;
  title: string;
  role_type: RoleType;
  department_id: string | null;
  requested_by: string | null;
  requested_date: string;
  needed_by: string | null;
  status: HiringStatus;
  stage: HiringStage | null;
  fte: number | null;
  priority: Priority;
  notes: string | null;
  payroll_status: PayrollStatus;
  related_hod_id: string | null;
  approved_by: string | null;
  departments?: { name: string } | null;
  requester?: { full_name: string | null; email: string } | null;
  approver?: { full_name: string | null; email: string } | null;
}

interface PayrollRecord {
  id: string;
  user_id: string;
  pay_type: string | null;
  effective_from?: string | null;
  notes?: string | null;
  status: PayrollRecordStatus;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  employee?: { full_name: string | null; email: string; department_id: string | null } | null;
  creator?: { full_name: string | null; email: string } | null;
  employee_department?: { name: string } | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  department_id: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface HiringFormData {
  position_title: string;
  role_type: RoleType;
  employment_type: string;
  department_id: string;
  needed_by: string;
  fte: number;
  priority: Priority;
  notes: string;
}

const EMPTY_FORM: HiringFormData = {
  position_title: '',
  role_type: 'Faculty',
  employment_type: 'Full-time',
  department_id: '',
  needed_by: '',
  fte: 1,
  priority: 'Normal',
  notes: ''
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Normalise a raw DB string (lowercase/mixed) to a capitalised UI type */
function capitalise<T extends string>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  return (val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()) as T;
}

function normaliseRequest(raw: Record<string, unknown>): HiringRequest {
  return {
    ...(raw as unknown as HiringRequest),
    // DB stores lowercase status / priority; normalise for UI badge helpers
    status: capitalise(raw.status as string, 'Pending') as HiringStatus,
    priority: capitalise(raw.priority as string, 'Normal') as Priority,
    // stage stays as-is (already title-case in DB constraint)
    stage: (raw.stage as HiringStage) ?? null,
    requested_date: (raw.created_at as string) ?? '',
  };
}

function getStatusBadge(status: HiringStatus) {
  switch (status) {
    case 'Pending':  return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    case 'Approved': return 'bg-green-50 text-green-700 border border-green-200';
    case 'Hired':    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'Rejected': return 'bg-red-50 text-red-700 border border-red-200';
    default:         return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
}

function getRoleBadge(role: RoleType) {
  return role === 'Faculty'
    ? 'bg-blue-50 text-blue-700 border border-blue-200'
    : 'bg-purple-50 text-purple-700 border border-purple-200';
}

function getPriorityBadge(p: Priority) {
  return p === 'High'
    ? 'bg-red-50 text-red-700 border border-red-200'
    : 'bg-gray-50 text-gray-700 border border-gray-200';
}

function getPayrollBadge(p: PayrollStatus) {
  switch (p) {
    case 'NotStarted': return 'bg-gray-50 text-gray-500 border border-gray-200';
    case 'InProgress': return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'Completed':  return 'bg-green-50 text-green-700 border border-green-200';
  }
}

function getPayrollLabel(p: PayrollStatus) {
  switch (p) {
    case 'NotStarted': return 'Not started';
    case 'InProgress': return 'In progress';
    case 'Completed':  return 'Completed';
  }
}

// ---------------------------------------------------------------------------
// NewHiringModal
// ---------------------------------------------------------------------------
function NewHiringModal({
  open,
  onClose,
  onSaved,
  departments,
  currentUser
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  departments: Department[];
  currentUser: UserProfile | null;
}) {
  const [form, setForm] = useState<HiringFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...EMPTY_FORM, department_id: currentUser?.department_id ?? '' });
  }, [open, currentUser]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.position_title.trim()) {
      toast.error('Position title is required.');
      return;
    }
    if (!currentUser) {
      toast.error('Not authenticated.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('hiring_requests').insert({
        // Both NOT NULL columns satisfied
        title: form.position_title.trim(),
        position_title: form.position_title.trim(),
        role_type: form.role_type,
        employment_type: form.employment_type,   // ✅ NOT NULL required
        department_id: form.department_id || null,
        requested_by: currentUser.id,
        needed_by: form.needed_by || null,
        fte: form.fte,
        priority: form.priority.toLowerCase(),   // ✅ DB stores lowercase
        notes: form.notes || null,
        status: 'pending',                       // ✅ DB stores lowercase
        stage: 'Requested',                      // ✅ valid check constraint value
        payroll_status: 'NotStarted'
      });

      if (error) throw error;

      await supabase.from('activity_log').insert({
        user_id: currentUser.id,
        entity_type: 'hiring_requests',
        action: 'create_hiring_request',
        details: { position_title: form.position_title }
      });

      toast.success('Hiring request created successfully!');
      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = (err as { message?: string })?.message ?? 'Failed to create hiring request.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-emerald-100 rounded-full p-2">
            <UserPlus className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">New Hiring Request</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Position Title *</label>
            <Input
              placeholder="e.g. Assistant Professor – Machine Learning"
              value={form.position_title}
              onChange={(e) => setForm((f) => ({ ...f, position_title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Role Type</label>
              <select
                value={form.role_type}
                onChange={(e) => setForm((f) => ({ ...f, role_type: e.target.value as RoleType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Faculty">Faculty</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Employment Type</label>
            <select
              value={form.employment_type}
              onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Visiting">Visiting</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
              <select
                value={form.department_id}
                onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">FTE</label>
              <Input
                type="number"
                min={0.1}
                max={2}
                step={0.1}
                value={form.fte}
                onChange={(e) => setForm((f) => ({ ...f, fte: parseFloat(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Needed By</label>
            <Input
              type="date"
              value={form.needed_by}
              onChange={(e) => setForm((f) => ({ ...f, needed_by: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Any additional context..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {saving ? 'Creating…' : 'Create Request'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ViewDetailsModal
// ---------------------------------------------------------------------------
function ViewDetailsModal({
  request,
  onClose,
  onStatusChange,
  currentUser
}: {
  request: HiringRequest | null;
  onClose: () => void;
  onStatusChange: (id: string, status: HiringStatus, stage?: HiringStage) => Promise<void>;
  currentUser: UserProfile | null;
}) {
  const [updating, setUpdating] = useState(false);

  if (!request) return null;

  const canApprove  = request.status === 'Pending';
  const canReject   = request.status === 'Pending' || request.status === 'Approved';
  const canMarkHired = request.status === 'Approved';

  const handleAction = async (status: HiringStatus, stage?: HiringStage) => {
    setUpdating(true);
    await onStatusChange(request.id, status, stage);
    setUpdating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {request.position_title ?? request.title}
            </h2>
            <p className="text-xs text-gray-500">{request.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-xs text-gray-500">Department</p>
            <p className="font-semibold">{request.departments?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Role Type</p>
            <p className="font-semibold">{request.role_type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Requested By</p>
            <p className="font-semibold">{request.requester?.full_name ?? request.requester?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Needed By</p>
            <p className="font-semibold">{formatDate(request.needed_by)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">FTE</p>
            <p className="font-semibold">{request.fte ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Priority</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(request.priority)}`}>
              {request.priority}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(request.status)}`}>
              {request.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Stage</p>
            <p className="font-semibold">{request.stage ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Payroll Status</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getPayrollBadge(request.payroll_status)}`}>
              {getPayrollLabel(request.payroll_status)}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Requested Date</p>
            <p className="font-semibold">{formatDate(request.requested_date)}</p>
          </div>
        </div>

        {request.notes && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">Notes</p>
            <p className="text-sm text-gray-700">{request.notes}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t pt-4">
          {canApprove && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAction('Approved', 'Screening')}
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckSquare className="h-4 w-4 mr-1" />}
              Approve
            </Button>
          )}
          {canMarkHired && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleAction('Hired', 'Onboarding')}
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Mark as Hired
            </Button>
          )}
          {canReject && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => handleAction('Rejected', 'Requested')}  // ✅ valid stage
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
              Reject
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClose} disabled={updating}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotifyFinanceModal
// ---------------------------------------------------------------------------
function NotifyFinanceModal({
  record,
  onClose,
  currentUser
}: {
  record: PayrollRecord | null;
  onClose: () => void;
  currentUser: UserProfile | null;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (record) {
      setMessage(
        `Hi Finance team,\n\nPlease process the payroll ${record.pay_type?.toLowerCase() ?? 'payroll'} for ${record.employee?.full_name ?? 'the employee'} (${record.employee?.email ?? ''}).\n\nEffective from: ${formatDate(record.effective_from)}\nDepartment: ${record.employee_department?.name ?? '—'}\n\nKind regards,\n${currentUser?.full_name ?? currentUser?.email ?? 'HR'}`
      );
    }
  }, [record, currentUser]);

  if (!record) return null;

  const handleSend = async () => {
    if (!message.trim() || !currentUser) return;
    setSending(true);
    try {
      await supabase.from('notifications').insert({
        user_id: currentUser.id,
        title: `Payroll ${record.pay_type ?? ''} – Finance Notification`,
        message: message,
        type: 'payroll_finance_notify',
        is_read: false
      });

      toast.success('Finance team notified successfully!');
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = (err as { message?: string })?.message ?? 'Failed to send notification.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-blue-100 rounded-full p-2">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Notify Finance Team</h2>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <p className="font-semibold text-gray-800">{record.employee?.full_name ?? '—'}</p>
          <p className="text-xs text-gray-500">{record.pay_type} • Effective {formatDate(record.effective_from)}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Message</label>
          <textarea
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {sending ? 'Sending…' : 'Send Notification'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ViewPayrollRecordModal
// ---------------------------------------------------------------------------
function ViewPayrollRecordModal({
  record,
  onClose,
  onMarkComplete
}: {
  record: PayrollRecord | null;
  onClose: () => void;
  onMarkComplete: (id: string) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);

  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-purple-100 rounded-full p-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Payroll Record</h2>
            <p className="text-xs text-gray-500">{record.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-xs text-gray-500">Employee</p>
            <p className="font-semibold">{record.employee?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Department</p>
            <p className="font-semibold">{record.employee_department?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Type</p>
            <p className="font-semibold">{record.pay_type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Effective From</p>
            <p className="font-semibold">{formatDate(record.effective_from ?? null)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              record.status === 'PendingApproval' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
              record.status === 'Approved'        ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-green-50 text-green-700 border-green-200'
            }`}>
              {record.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Requested By</p>
            <p className="font-semibold">{record.creator?.full_name ?? record.creator?.email ?? '—'}</p>
          </div>
        </div>

        {record.notes && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">Notes</p>
            <p className="text-sm text-gray-700">{record.notes}</p>
          </div>
        )}

        <div className="flex gap-3 border-t pt-4">
          {record.status === 'Paid' && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={updating}
              onClick={async () => {
                setUpdating(true);
                await onMarkComplete(record.id);
                setUpdating(false);
                onClose();
              }}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Mark Complete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function HRDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [hiringRequests, setHiringRequests] = useState<HiringRequest[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | HiringStatus>('all');
  const [selectedRoleType, setSelectedRoleType] = useState<'all' | RoleType>('all');

  const [newHiringOpen, setNewHiringOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HiringRequest | null>(null);
  const [notifyRecord, setNotifyRecord] = useState<PayrollRecord | null>(null);
  const [viewPayrollRecord, setViewPayrollRecord] = useState<PayrollRecord | null>(null);

  // ---------------------------------------------------------------------------
  // Load current user
  // ---------------------------------------------------------------------------
  const loadUser = useCallback(async () => {
    setAuthLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { setAuthLoading(false); return; }
      const authId = session.session.user.id;
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, department_id')
        .eq('id', authId)
        .single();
      if (error) throw error;
      setCurrentUser(data as UserProfile);
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as { message?: string })?.message ?? 'Failed to load user profile.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Load hiring requests
  // ---------------------------------------------------------------------------
  const loadHiringRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('hiring_requests')
        .select(`
          id, title, position_title, role_type, department_id,
          requested_by, created_at, needed_by, status, stage,
          fte, priority, notes, payroll_status, related_hod_id, approved_by,
          departments:department_id ( name ),
          requester:requested_by ( full_name, email ),
          approver:approved_by ( full_name, email )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Normalise DB lowercase values → capitalised UI types
      const normalised = ((data ?? []) as unknown as Record<string, unknown>[]).map(normaliseRequest);
      setHiringRequests(normalised);
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as { message?: string })?.message ?? 'Failed to load hiring requests.');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Load payroll records
  // ---------------------------------------------------------------------------
  const loadPayrollRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_records')
        .select(`
          id, user_id, pay_type, effective_from, status,
          created_by, approved_by, notes, created_at,
          employee:user_id ( full_name, email, department_id ),
          creator:created_by ( full_name, email )
        `)
        .neq('status', 'Paid')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const records = (data as unknown as PayrollRecord[]) ?? [];
      const deptIds = [...new Set(records.map((r) => r.employee?.department_id).filter(Boolean))] as string[];

      let deptMap: Record<string, string> = {};
      if (deptIds.length > 0) {
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', deptIds);
        deptMap = Object.fromEntries((depts ?? []).map((d) => [d.id, d.name]));
      }

      const enriched = records.map((r) => ({
        ...r,
        employee_department: r.employee?.department_id
          ? { name: deptMap[r.employee.department_id] ?? '—' }
          : null
      }));

      setPayrollRecords(enriched);
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as { message?: string })?.message ?? 'Failed to load payroll records.');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Load departments
  // ---------------------------------------------------------------------------
  const loadDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setDepartments((data as Department[]) ?? []);
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setDataLoading(true);
    await Promise.all([loadHiringRequests(), loadPayrollRecords(), loadDepartments()]);
    setDataLoading(false);
  }, [loadHiringRequests, loadPayrollRecords, loadDepartments]);

  useEffect(() => { loadUser(); }, [loadUser]);
  useEffect(() => { loadAll(); }, [loadAll]);

  // ---------------------------------------------------------------------------
  // Update hiring request status
  // ---------------------------------------------------------------------------
  const handleStatusChange = useCallback(
    async (id: string, status: HiringStatus, stage?: HiringStage) => {
      try {
        const update: Record<string, unknown> = {
          status: status.toLowerCase()   // ✅ DB stores lowercase
        };
        if (stage) update.stage = stage;
        if (status === 'Approved' && currentUser) update.approved_by = currentUser.id;

        const { error } = await supabase
          .from('hiring_requests')
          .update(update)
          .eq('id', id);

        if (error) throw error;

        if (currentUser) {
          await supabase.from('activity_log').insert({
            user_id: currentUser.id,
            entity_type: 'hiring_requests',
            entity_id: id,
            action: `hiring_status_${status.toLowerCase()}`,
            details: { status, stage }
          });
        }

        toast.success(`Request ${status.toLowerCase()} successfully.`);
        await loadHiringRequests();
      } catch (err: unknown) {
        console.error(err);
        toast.error((err as { message?: string })?.message ?? 'Failed to update status.');
      }
    },
    [currentUser, loadHiringRequests]
  );

  // ---------------------------------------------------------------------------
  // Mark payroll complete
  // ---------------------------------------------------------------------------
  const handleMarkPayrollComplete = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({ status: 'Paid', approved_by: currentUser?.id ?? null })
        .eq('id', id);
      if (error) throw error;
      toast.success('Payroll record marked as complete.');
      await loadPayrollRecords();
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as { message?: string })?.message ?? 'Failed to update payroll record.');
    }
  }, [currentUser, loadPayrollRecords]);

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------
  const pendingCount   = hiringRequests.filter((r) => r.status === 'Pending').length;
  const approvedCount  = hiringRequests.filter((r) => r.status === 'Approved').length;
  const hiredCount     = hiringRequests.filter((r) => r.status === 'Hired').length;
  const facultyCount   = hiringRequests.filter((r) => r.role_type === 'Faculty').length;
  const staffCount     = hiringRequests.filter((r) => r.role_type === 'Staff').length;
  const payrollPending = payrollRecords.filter((p) => p.status !== 'Paid').length;
  const screeningCount = hiringRequests.filter((r) => r.stage === 'Screening' || r.stage === 'Interview').length;
  const offerCount     = hiringRequests.filter((r) => r.stage === 'Offer' || r.stage === 'Onboarding').length;

  const summaryCards = [
    { label: 'Total Hiring Requests', value: hiringRequests.length,          icon: UserPlus,    color: 'blue',   negative: false },
    { label: 'Pending Approval',       value: pendingCount,                   icon: Clock,       color: 'orange', negative: true  },
    { label: 'Approved / Hired',       value: `${approvedCount} / ${hiredCount}`, icon: CheckCircle, color: 'green',  negative: false },
    { label: 'Open Payroll Items',     value: payrollPending,                 icon: DollarSign,  color: 'purple', negative: payrollPending > 0 }
  ];

  // ---------------------------------------------------------------------------
  // Filtered requests
  // ---------------------------------------------------------------------------
  const filteredRequests = hiringRequests.filter((r) => {
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    if (selectedRoleType !== 'all' && r.role_type !== selectedRoleType) return false;
    const q = searchQuery.toLowerCase();
    if (q && !(
      r.id.toLowerCase().includes(q) ||
      (r.position_title ?? r.title).toLowerCase().includes(q) ||
      (r.departments?.name ?? '').toLowerCase().includes(q) ||
      (r.requester?.full_name ?? '').toLowerCase().includes(q) ||
      (r.requester?.email ?? '').toLowerCase().includes(q)
    )) return false;
    return true;
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <>
      <NewHiringModal
        open={newHiringOpen}
        onClose={() => setNewHiringOpen(false)}
        onSaved={loadHiringRequests}
        departments={departments}
        currentUser={currentUser}
      />
      <ViewDetailsModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onStatusChange={handleStatusChange}
        currentUser={currentUser}
      />
      <NotifyFinanceModal
        record={notifyRecord}
        onClose={async () => { setNotifyRecord(null); await loadPayrollRecords(); }}
        currentUser={currentUser}
      />
      <ViewPayrollRecordModal
        record={viewPayrollRecord}
        onClose={() => setViewPayrollRecord(null)}
        onMarkComplete={async (id) => { await handleMarkPayrollComplete(id); await loadPayrollRecords(); }}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 transition-all duration-500 ease-out 
               hover:scale-105 hover:shadow-2xl rounded-xl p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl text-sky-100 font-bold mb-1">HR Dashboard</h1>
              <p className="text-sky-100">
                Monitor hiring requests, recruitment stages, and payroll handoffs
              </p>
            </div>
            <div className="flex gap-2">
              <Button
              
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                onClick={loadAll}
                disabled={dataLoading}
              >
                {dataLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCw className="h-4 w-4" />
                }
              </Button>
              <Button
                className="bg-white  text-black hover:bg-gray-300"
                onClick={() => setNewHiringOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                New Hiring Request
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="border-1  transition-all duration-500 ease-out 
                hover:scale-105 hover:shadow-2xl  rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                      <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                    </div>
                    {stat.negative
                      ? <TrendingDown className="h-4 w-4 text-red-500" />
                      : <TrendingUp className="h-4 w-4 text-green-500" />
                    }
                  </div>
                  {dataLoading
                    ? <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mb-1" />
                    : <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  }
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* HR Snapshot */}
        <Card className="border-1 transition-all duration-500 ease-out 
             hover:scale-105 hover:shadow-2xl ">
          <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Faculty Positions',      value: facultyCount,   color: 'text-blue-600' },
              { label: 'Staff Positions',        value: staffCount,     color: 'text-purple-600' },
              { label: 'Screening / Interview',  value: screeningCount, color: 'text-indigo-600' },
              { label: 'Offers / Onboarding',    value: offerCount,     color: 'text-emerald-600' }
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                {dataLoading
                  ? <div className="h-6 w-10 bg-gray-200 rounded animate-pulse" />
                  : <p className={`text-lg font-semibold ${item.color}`}>{item.value}</p>
                }
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border-1 transition-all duration-500 ease-out 
           hover:scale-105 hover:shadow-2xl ">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Filter className="h-4 w-4 text-gray-500" />
                <span>Filter hiring requests by status and role type</span>
              </div>
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <select
                  value={selectedRoleType}
                  onChange={(e) => setSelectedRoleType(e.target.value as typeof selectedRoleType)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Roles</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by ID, position, department, or requester…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Hiring Requests List */}
        <Card className="border-1  shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Briefcase className="mr-2 h-5 w-5" />
                Hiring Requests
              </span>
              <span className="text-sm font-normal text-gray-500">
                {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}
              </span>
            </CardTitle>
            <CardDescription>
              Track requests from departments, recruitment stages, and payroll status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border  border-gray-200 rounded-lg p-6 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-2/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((r) => (
                  <div
                    key={r.id}
                    className="border border-gray-200 transition-all duration-500 ease-out 
                         hover:scale-105 hover:shadow-2xl rounded-lg p-6 "
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-3">
                      <div className="flex gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white shrink-0">
                          <Briefcase className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-base font-semibold text-gray-900">
                              {r.position_title ?? r.title}
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(r.role_type)}`}>
                              {r.role_type}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(r.status)}`}>
                              {r.status}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(r.priority)}`}>
                              {r.priority} priority
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {r.departments?.name ?? '—'} •{' '}
                            Requested by {r.requester?.full_name ?? r.requester?.email ?? '—'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Requested: {formatDate(r.requested_date)} •{' '}
                            Needed by: {formatDate(r.needed_by)} •{' '}
                            FTE: {r.fte ?? '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-start lg:items-end gap-1 text-xs text-gray-600">
                        <p className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Stage: <span className="font-semibold ml-1">{r.stage ?? '—'}</span>
                        </p>
                        <p className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Payroll:{' '}
                          <span className={`ml-1 font-semibold text-xs px-1.5 py-0.5 rounded ${getPayrollBadge(r.payroll_status)}`}>
                            {getPayrollLabel(r.payroll_status)}
                          </span>
                        </p>
                        <Button size="sm" variant="outline" onClick={() => setSelectedRequest(r)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>

                    {r.notes && (
                      <div className="mt-2 border-t border-gray-100 pt-3 text-xs text-gray-600">
                        <span className="font-semibold">Notes: </span>{r.notes}
                      </div>
                    )}
                  </div>
                ))}

                {filteredRequests.length === 0 && (
                  <div className="text-center py-12">
                    <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No hiring requests match the selected filters.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => { setSearchQuery(''); setSelectedStatus('all'); setSelectedRoleType('all'); }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payroll Handoff */}
        <Card className="border-1 shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Payroll Handoff
            </CardTitle>
            <CardDescription>
              Items that require coordination with Finance for salary processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="border  border-gray-200 rounded-lg p-3 animate-pulse h-16" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {payrollRecords.map((p) => (
                  <div
                    key={p.id}
                    className="border transition-all duration-500 ease-out 
                     hover:scale-105 hover:shadow-2xl  border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between text-sm gap-3"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {p.employee?.full_name ?? p.employee?.email ?? '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.employee_department?.name ?? '—'} • {p.pay_type} • Effective from {formatDate(p.effective_from ?? null)}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Requested by {p.creator?.full_name ?? p.creator?.email ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        p.status === 'PendingApproval'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : p.status === 'Approved'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {p.status}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setNotifyRecord(p)}>
                        <Mail className="h-4 w-4 mr-1" />
                        Notify Finance
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setViewPayrollRecord(p)}>
                        <FileText className="h-4 w-4 mr-1" />
                        View Record
                      </Button>
                    </div>
                  </div>
                ))}

                {payrollRecords.length === 0 && (
                  <div className="text-center py-8">
                    <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No pending payroll items.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}