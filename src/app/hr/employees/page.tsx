'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, User, Mail, Phone, Calendar, AlertCircle, CheckCircle,
  Search, Filter, TrendingUp, TrendingDown, Clock, Shield, Eye,
  RefreshCw, Loader2, AlertTriangle, Building2, BookOpen, X,
  Plus, Save, FileText, Hash, Briefcase,
} from 'lucide-react';
import { createUserByAdmin, supabase, UserRole } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type EmployeeType = 'Faculty' | 'Staff';
type EmploymentStatus = 'Active' | 'On Leave' | 'Terminated' | 'Probation';
type RiskFlag = 'None' | 'Performance' | 'ContractEnding' | 'Leave';

interface Employee {
  id: string;
  name: string;
  type: EmployeeType;
  designation: string;
  department: string;
  program?: string;
  email: string;
  phone: string;
  joinDate: string;
  contractEnd?: string;
  employmentStatus: EmploymentStatus;
  employmentType: 'Permanent' | 'Contract' | 'Visiting';
  fte: number;
  supervisor: string;
  lastReview?: string;
  riskFlag: RiskFlag;
}

interface SummaryStats {
  total: number;
  active: number;
  onLeaveOrProbation: number;
  atRisk: number;
  facultyCount: number;
  staffCount: number;
}

interface AddEmployeeForm {
  full_name: string;
  email: string;
  role: string;
  department_id: string;
  designation: string;
  phone: string;
  employment_status: EmploymentStatus;
  employment_type: 'Permanent' | 'Contract' | 'Visiting';
  fte: number;
  supervisor: string;
  contract_end: string;
  risk_flag: RiskFlag;
  last_review: string;
}

const EMPTY_FORM: AddEmployeeForm = {
  full_name: '',
  email: '',
  role: 'staff',
  department_id: '',
  designation: '',
  phone: '',
  employment_status: 'Active',
  employment_type: 'Permanent',
  fte: 1,
  supervisor: '',
  contract_end: '',
  risk_flag: 'None',
  last_review: '',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function roleToType(role: string): EmployeeType {
  const faculty = ['teacher', 'faculty', 'professor', 'lecturer', 'hod'];
  return faculty.includes((role ?? '').toLowerCase()) ? 'Faculty' : 'Staff';
}

// ---------------------------------------------------------------------------
// Supabase queries
// ---------------------------------------------------------------------------
async function fetchEmployees(): Promise<Employee[]> {
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(`
      id,
      full_name,
      email,
      role,
      created_at,
      department_id,
      departments!users_department_id_fkey (
        id,
        name
      )
    `)
    .not('role', 'in', '("student","Student")')
    .order('created_at', { ascending: false });

  if (usersError) throw usersError;
  if (!users || users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  const { data: metaRows } = await supabase
    .from('hr_employee_meta')
    .select('*')
    .in('user_id', userIds);

  const metaMap = new Map<string, Record<string, unknown>>();
  (metaRows ?? []).forEach((m) => metaMap.set(m.user_id, m));

  const { data: teacherPrograms } = await supabase
    .from('teacher_programs')
    .select('teacher_id, programs(name)')
    .in('teacher_id', userIds);

  const programMap = new Map<string, string[]>();
  (teacherPrograms ?? []).forEach((tp) => {
    const pid = tp.teacher_id;
    const programs = Array.isArray(tp.programs) ? tp.programs : tp.programs ? [tp.programs] : [];
    programs.forEach((p: any) => {
      if (p?.name) programMap.set(pid, [...(programMap.get(pid) ?? []), p.name]);
    });
  });

  return users.map((u) => {
    const meta = metaMap.get(u.id) ?? {};
    const deptRaw = u.departments;
    const dept = Array.isArray(deptRaw) ? deptRaw[0] ?? null : deptRaw ?? null;
    const programs = programMap.get(u.id) ?? [];
    const type = roleToType(u.role ?? '');

    return {
      id: u.id,
      name: u.full_name ?? 'Unknown',
      type,
      designation: (meta.designation as string) ?? u.role ?? 'Staff',
      department: dept?.name ?? 'N/A',
      program: programs.length > 0 ? programs.join(' / ') : undefined,
      email: u.email ?? '',
      phone: (meta.phone as string) ?? '—',
      joinDate: u.created_at ?? '',
      contractEnd: (meta.contract_end as string) ?? undefined,
      employmentStatus: (meta.employment_status as EmploymentStatus) ?? 'Active',
      employmentType: (meta.employment_type as Employee['employmentType']) ?? 'Permanent',
      fte: (meta.fte as number) ?? 1,
      supervisor: (meta.supervisor as string) ?? '—',
      lastReview: (meta.last_review as string) ?? undefined,
      riskFlag: (meta.risk_flag as RiskFlag) ?? 'None',
    };
  });
}

async function fetchDepartments(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase.from('departments').select('id, name').order('name');
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------
function getStatusBadge(status: EmploymentStatus) {
  switch (status) {
    case 'Active':     return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'On Leave':   return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'Probation':  return 'bg-violet-50 text-violet-700 border border-violet-200';
    case 'Terminated': return 'bg-red-50 text-red-700 border border-red-200';
    default:           return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
}
function getTypeBadge(t: EmployeeType) {
  return t === 'Faculty'
    ? 'bg-sky-50 text-sky-700 border border-sky-200'
    : 'bg-indigo-50 text-indigo-700 border border-indigo-200';
}
function getRiskBadge(r: RiskFlag) {
  switch (r) {
    case 'Performance':    return 'bg-red-50 text-red-700 border border-red-200';
    case 'ContractEnding': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'Leave':          return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    default:               return 'bg-gray-50 text-gray-600 border border-gray-200';
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function EmployeeSkeleton() {
  return (
    <div className="border border-gray-200 rounded-xl p-6 animate-pulse">
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-3 bg-gray-100 rounded w-64" />
          <div className="h-3 bg-gray-100 rounded w-32" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------
const inputCls =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function ProfileSection({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sky-600">{icon}</span>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {children}
      </div>
    </div>
  );
}

function ProfileRow({ label, value, icon, valueClass = 'text-gray-800' }: {
  label: string; value: string; icon?: React.ReactNode; valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white">
      {icon && <span className="shrink-0 text-gray-400">{icon}</span>}
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <span className={`text-sm flex-1 truncate ${valueClass}`}>{value || '—'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VIEW PROFILE SLIDE-OVER PANEL
// ---------------------------------------------------------------------------
function ViewProfileModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      {/* Backdrop with blur */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Modal container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          style={{ animation: 'fadeScaleIn 0.2s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            @keyframes fadeScaleIn {
              from { transform: scale(0.95); opacity: 0; }
              to   { transform: scale(1);    opacity: 1; }
            }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
                <User className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{employee.name}</h2>
                <p className="text-xs text-gray-500">{employee.designation}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Status badges */}
          <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2 shrink-0 bg-gray-50">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getTypeBadge(employee.type)}`}>
              {employee.type}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusBadge(employee.employmentStatus)}`}>
              {employee.employmentStatus}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-200">
              {employee.employmentType}
            </span>
            {employee.riskFlag !== 'None' && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getRiskBadge(employee.riskFlag)}`}>
                {employee.riskFlag === 'ContractEnding' ? 'Contract ending soon' : employee.riskFlag}
              </span>
            )}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <ProfileSection title="Contact Information" icon={<Mail className="h-4 w-4" />}>
              <ProfileRow label="Email" value={employee.email} icon={<Mail className="h-3.5 w-3.5" />} />
              <ProfileRow label="Phone" value={employee.phone} icon={<Phone className="h-3.5 w-3.5" />} />
            </ProfileSection>

            <ProfileSection title="Employment Details" icon={<Briefcase className="h-4 w-4" />}>
              <ProfileRow label="Department" value={employee.department} icon={<Building2 className="h-3.5 w-3.5" />} />
              {employee.program && (
                <ProfileRow label="Program" value={employee.program} icon={<BookOpen className="h-3.5 w-3.5" />} />
              )}
              <ProfileRow label="Supervisor" value={employee.supervisor} icon={<User className="h-3.5 w-3.5" />} />
              <ProfileRow label="FTE" value={String(employee.fte)} icon={<Hash className="h-3.5 w-3.5" />} />
            </ProfileSection>

            <ProfileSection title="Key Dates" icon={<Calendar className="h-4 w-4" />}>
              <ProfileRow label="Join Date" value={formatDate(employee.joinDate)} icon={<Calendar className="h-3.5 w-3.5" />} />
              {employee.contractEnd && (
                <ProfileRow
                  label="Contract End"
                  value={formatDate(employee.contractEnd)}
                  icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
                  valueClass="text-amber-700 font-medium"
                />
              )}
              {employee.lastReview && (
                <ProfileRow label="Last Review" value={formatDate(employee.lastReview)} icon={<Shield className="h-3.5 w-3.5" />} />
              )}
            </ProfileSection>

            {employee.riskFlag !== 'None' && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-semibold text-red-700">Risk Flag Active</span>
                </div>
                <p className="text-sm text-red-600 leading-relaxed">
                  {employee.riskFlag === 'Performance' &&
                    'This employee has an active performance concern. A formal review may be required.'}
                  {employee.riskFlag === 'ContractEnding' &&
                    "This employee's contract is ending soon. Renewal or off-boarding action is needed."}
                  {employee.riskFlag === 'Leave' &&
                    'This employee is currently on leave. Coverage arrangements may be required.'}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Employee ID</span>
              <span className="ml-auto font-mono text-xs text-gray-700 select-all break-all">{employee.id}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
// ---------------------------------------------------------------------------
// ADD EMPLOYEE MODAL
// ---------------------------------------------------------------------------
function AddEmployeeModal({
  departments,
  onClose,
  onSuccess,
}: {
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<AddEmployeeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function setField<K extends keyof AddEmployeeForm>(key: K, value: AddEmployeeForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

 async function handleSubmit() {
  setFormError(null);
  if (!form.full_name.trim()) return setFormError('Full name is required.');
  if (!form.email.trim() || !form.email.includes('@')) return setFormError('A valid email address is required.');
  if (!form.department_id) return setFormError('Please select a department.');

  setSaving(true);
  try {
    // Map EmployeeType to UserRole (faculty/staff → teacher/staff)
    let role: UserRole = 'staff';
    if (form.role === 'teacher' || form.role === 'hod') role = 'teacher';
    else if (form.role === 'hr') role = 'hr';
    else if (form.role === 'admin') role = 'admin';
    else if (form.role === 'staff') role = 'staff';
    // Note: 'faculty' is not a role; use 'teacher'

    // Generate a temporary password (you can email it or set a default)
    const tempPassword = Math.random().toString(36).slice(-8) + '@A1';

    // Create user via the existing admin function
    const newUserId = await createUserByAdmin(
      form.full_name.trim(),
      form.email.trim().toLowerCase(),
      tempPassword,
      role,
      {
        department_id: form.department_id,
        // If you need program_id, semester, etc. add them via extras
      }
    );

    // Now insert into hr_employee_meta using the newly created user ID
    const { error: metaErr } = await supabase
      .from('hr_employee_meta')
      .insert({
        user_id: newUserId,
        designation: form.designation.trim() || null,
        phone: form.phone.trim() || null,
        employment_status: form.employment_status,
        employment_type: form.employment_type,
        fte: form.fte,
        supervisor: form.supervisor.trim() || null,
        contract_end: form.employment_type !== 'Permanent' && form.contract_end ? form.contract_end : null,
        risk_flag: form.risk_flag,
        last_review: form.last_review || null,
      });

    if (metaErr) throw metaErr;

    onSuccess();
    onClose();
  } catch (err: any) {
    console.error(err);
    setFormError(err?.message ?? 'Failed to add employee. Please check your input and try again.');
  } finally {
    setSaving(false);
  }
}

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          style={{ animation: 'fadeScaleIn 0.2s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            @keyframes fadeScaleIn {
              from { transform: scale(0.95); opacity: 0; }
              to   { transform: scale(1);    opacity: 1; }
            }
          `}</style>

          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
                <Plus className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Add New Employee</h2>
                <p className="text-xs text-gray-500">Fill in the details to create a new record</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* Basic Info */}
            <fieldset>
              <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pb-1 border-b border-gray-100 w-full">
                Basic Information
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Full Name *">
                  <input
                    type="text"
                    placeholder="Dr. Sarah Johnson"
                    value={form.full_name}
                    onChange={(e) => setField('full_name', e.target.value)}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Email Address *">
                  <input
                    type="email"
                    placeholder="s.johnson@university.edu"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Phone">
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Designation">
                  <input
                    type="text"
                    placeholder="e.g. Professor & HoD CS"
                    value={form.designation}
                    onChange={(e) => setField('designation', e.target.value)}
                    className={inputCls}
                  />
                </FormField>
              </div>
            </fieldset>

            {/* Role & Department */}
            <fieldset>
              <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pb-1 border-b border-gray-100 w-full">
                Role & Department
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Role">
                  <select value={form.role} onChange={(e) => setField('role', e.target.value)} className={inputCls}>
                    <option value="staff">Staff</option>
                    <option value="teacher">Teacher / Faculty</option>
                    <option value="hod">Head of Department</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                  </select>
                </FormField>
                <FormField label="Department *">
                  <select value={form.department_id} onChange={(e) => setField('department_id', e.target.value)} className={inputCls}>
                    <option value="">Select department…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Supervisor">
                  <input
                    type="text"
                    placeholder="Dean / HoD name"
                    value={form.supervisor}
                    onChange={(e) => setField('supervisor', e.target.value)}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="FTE">
                  <input
                    type="number"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={form.fte}
                    onChange={(e) => setField('fte', parseFloat(e.target.value) || 1)}
                    className={inputCls}
                  />
                </FormField>
              </div>
            </fieldset>

            {/* Employment Details */}
            <fieldset>
              <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pb-1 border-b border-gray-100 w-full">
                Employment Details
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Employment Status">
                  <select
                    value={form.employment_status}
                    onChange={(e) => setField('employment_status', e.target.value as EmploymentStatus)}
                    className={inputCls}
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Probation">Probation</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </FormField>
                <FormField label="Employment Type">
                  <select
                    value={form.employment_type}
                    onChange={(e) => setField('employment_type', e.target.value as AddEmployeeForm['employment_type'])}
                    className={inputCls}
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Visiting">Visiting</option>
                  </select>
                </FormField>
                <FormField label="Contract End Date">
                  <input
                    type="date"
                    value={form.contract_end}
                    onChange={(e) => setField('contract_end', e.target.value)}
                    className={inputCls}
                    disabled={form.employment_type === 'Permanent'}
                  />
                </FormField>
                <FormField label="Last Review Date">
                  <input
                    type="date"
                    value={form.last_review}
                    onChange={(e) => setField('last_review', e.target.value)}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Risk Flag">
                  <select
                    value={form.risk_flag}
                    onChange={(e) => setField('risk_flag', e.target.value as RiskFlag)}
                    className={inputCls}
                  >
                    <option value="None">None</option>
                    <option value="Performance">Performance</option>
                    <option value="ContractEnding">Contract Ending</option>
                    <option value="Leave">Leave</option>
                  </select>
                </FormField>
              </div>
            </fieldset>
          </div>

          {/* Modal footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-60 shadow-sm"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Save className="h-4 w-4" /> Add Employee</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------
export default function HREmployeeManagementPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | EmployeeType>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | EmploymentStatus>('all');

  // Modal / panel state
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empData, deptData] = await Promise.all([fetchEmployees(), fetchDepartments()]);
      setEmployees(empData);
      setDepartments(deptData);
    } catch (err) {
      console.error('Failed to load employees:', err);
      setError('Failed to load employee data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Stats
  const stats: SummaryStats = {
    total: employees.length,
    active: employees.filter((e) => e.employmentStatus === 'Active').length,
    onLeaveOrProbation: employees.filter(
      (e) => e.employmentStatus === 'On Leave' || e.employmentStatus === 'Probation'
    ).length,
    atRisk: employees.filter((e) => e.riskFlag !== 'None').length,
    facultyCount: employees.filter((e) => e.type === 'Faculty').length,
    staffCount: employees.filter((e) => e.type === 'Staff').length,
  };

  // Filtered list
  const filtered = employees.filter((e) => {
    const matchType   = selectedType   === 'all' || e.type             === selectedType;
    const matchStatus = selectedStatus === 'all' || e.employmentStatus === selectedStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      e.name.toLowerCase().includes(q)         ||
      e.id.toLowerCase().includes(q)           ||
      e.department.toLowerCase().includes(q)   ||
      (e.program ?? '').toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q);
    return matchType && matchStatus && matchSearch;
  });

  const summaryCards = [
    { label: 'Total Employees',          value: stats.total,              icon: Users,       color: 'blue',   note: `${stats.facultyCount} Faculty • ${stats.staffCount} Staff`, isAlert: false },
    { label: 'Active Employees',          value: stats.active,             icon: CheckCircle, color: 'green',  note: 'Currently employed / on payroll',                            isAlert: false },
    { label: 'On Leave / Probation',      value: stats.onLeaveOrProbation, icon: Clock,       color: 'orange', note: 'Special attention group',                                    isAlert: true  },
    { label: 'Employees with Risk Flags', value: stats.atRisk,             icon: AlertCircle, color: 'red',    note: 'Performance, contract, or leave risks',                      isAlert: true  },
  ];

  return (
    <div className="space-y-6">

      {/* ---- Modals & panels ---- */}
      {showAddModal && (
        <AddEmployeeModal
          departments={departments}
          onClose={() => setShowAddModal(false)}
          onSuccess={load}
        />
      )}
     {viewEmployee && (
  <ViewProfileModal employee={viewEmployee} onClose={() => setViewEmployee(null)} />
)}

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 transition-all duration-500 ease-out 
              hover:scale-105 hover:shadow-2xl  border-1 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl text-sky-100 font-bold mb-1">Employee Management</h1>
            <p className="text-sky-100">Central view of all faculty and staff records for HR</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-sky-700 hover:bg-sky-50 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={load} className="ml-auto text-sm underline underline-offset-2">Retry</button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white transition-all duration-500 ease-out 
                          hover:scale-105 hover:shadow-2xl border-1 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
                {stat.isAlert
                  ? <TrendingDown className="h-4 w-4 text-red-500" />
                  : <TrendingUp   className="h-4 w-4 text-green-500" />}
              </div>
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-7 bg-gray-200 rounded w-12" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
                  <p className="text-xs text-gray-600">{stat.note}</p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white transition-all duration-500 ease-out 
                    hover:scale-105 hover:shadow-2xl border-1  rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Filter className="h-4 w-4 text-gray-500" />
            <span>Filter employees by type and employment status</span>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value === 'all' ? 'all' : e.target.value as EmployeeType)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="all">All Types</option>
              <option value="Faculty">Faculty</option>
              <option value="Staff">Staff</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value === 'all' ? 'all' : e.target.value as EmploymentStatus)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Probation">Probation</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search by name, ID, designation, department or program..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Employee list */}
      <div className="bg-white shadow-xl border-1 rounded-xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Employee Directory</h2>
            {!loading && (
              <span className="ml-auto text-sm text-gray-500">
                {filtered.length} of {employees.length} employees
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Faculty and staff with employment status, contracts, and supervisors
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Loading skeletons */}
          {loading && Array.from({ length: 4 }).map((_, i) => <EmployeeSkeleton key={i} />)}

          {/* Cards */}
          {!loading && filtered.map((e) => (
            <div
              key={e.id}
              className="border border-gray-200 transition-all duration-500 ease-out 
                            hover:scale-105 hover:shadow-2xl rounded-xl p-6 "
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                    <User className="h-6 w-6 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{e.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${getTypeBadge(e.type)}`}>{e.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${getStatusBadge(e.employmentStatus)}`}>{e.employmentStatus}</span>
                      {e.riskFlag !== 'None' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${getRiskBadge(e.riskFlag)}`}>
                          {e.riskFlag === 'ContractEnding' ? 'Contract ending soon' : e.riskFlag}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{e.designation}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      <span>{e.department}</span>
                      {e.program && (
                        <>
                          <span className="mx-1">•</span>
                          <BookOpen className="h-3 w-3" />
                          <span>{e.program}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      FTE: {e.fte} • {e.employmentType} • Supervisor: {e.supervisor}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-1.5 text-xs text-gray-600 shrink-0">
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    Joined: <span className="font-mono text-gray-800">{formatDate(e.joinDate)}</span>
                  </p>
                  {e.contractEnd && (
                    <p className="flex items-center gap-1.5 text-amber-700">
                      <Clock className="h-3 w-3" />
                      Contract ends: <span className="font-mono">{formatDate(e.contractEnd)}</span>
                    </p>
                  )}
                  {e.lastReview && (
                    <p className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-gray-400" />
                      Last review: <span className="font-mono text-gray-800">{formatDate(e.lastReview)}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-700">{e.email}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span>{e.phone}</span>
                  </p>
                  {/* ✅ View Profile — opens slide-over */}
                  <button
                    onClick={() => setViewEmployee(e)}
                    className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-sky-300 hover:bg-sky-50 text-gray-600 hover:text-sky-700 rounded-lg text-xs transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {!loading && filtered.length === 0 && !error && (
            <div className="text-center py-16">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No employees found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No employee records yet — click "Add Employee" to get started'}
              </p>
              {!searchQuery && selectedType === 'all' && selectedStatus === 'all' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add First Employee
                </button>
              )}
            </div>
          )}

          {/* Refresh spinner */}
          {loading && employees.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-4 text-sky-600 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Refreshing data…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}