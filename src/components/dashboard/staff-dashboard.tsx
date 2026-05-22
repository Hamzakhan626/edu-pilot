'use client';
 
import { useState, useEffect, useCallback, useRef } from 'react';

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard, ClipboardCheck, FileText, Users,
  HelpCircle, AlertCircle, CheckCircle, Calendar, Search,
  Filter, Mail, Eye, Download, MessageCircle, Megaphone,
  Loader2, RefreshCw, X, Send, Plus,
} from 'lucide-react';
import { supabase } from '@/lib/auth';
 
// ─── Supabase ─────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────
type TicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high';
type TicketType     = 'Document' | 'IT' | 'Finance' | 'Academic' | 'Other';
 
interface ServiceTicket {
  id: string;
  subject: string;
  description: string;
  requester_name: string;
  requester_role: string;
  created_at: string;
  status: TicketStatus;
  type: TicketType;
  priority: TicketPriority;
  due_by?: string;
}
 
interface NewTicketForm {
  subject: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  due_by: string;
}
 
interface Task {
  id: string;
  title: string;
  due_date: string;
  category: string;
  related_to?: string;
}
 
interface StaffAnnouncement {
  id: string;
  title: string;
  sender_name: string;
  created_at: string;
  audience?: string;
  is_read: boolean;
}
 
interface SummaryData {
  openCount: number;
  highPriorityCount: number;
  dueTodayCount: number;
  unreadAnnouncementsCount: number;
}
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
}
 
const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
};
 
function statusBadgeCls(s: TicketStatus) {
  const m: Record<TicketStatus, string> = {
    open:        'bg-red-50 text-red-700 border-red-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    resolved:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed:      'bg-gray-50 text-gray-600 border-gray-200',
  };
  return `px-2 py-0.5 rounded-full text-[11px] border ${m[s]}`;
}
 
function priorityBadgeCls(p: TicketPriority) {
  const m: Record<TicketPriority, string> = {
    high:   'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low:    'bg-gray-50 text-gray-500 border-gray-200',
  };
  return `px-2 py-0.5 rounded-full text-[11px] border ${m[p]}`;
}
 
const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition';
 
// ─── Shared Modal wrapper ─────────────────────────────────────────────────────
function Modal({
  open, onClose, title, children, width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
 
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
 
  if (!open) return null;
 
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Modal body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
 
// ─── Label helper ─────────────────────────────────────────────────────────────
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  );
}
 
// ══════════════════════════════════════════════════════════════════════════════
//  NEW SERVICE TICKET MODAL
//  Opens when "New Service Ticket" button is clicked.
//  Inserts into activity_log (or your tickets table).
// ══════════════════════════════════════════════════════════════════════════════
function NewTicketModal({
  open, onClose, userId, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onCreated: (t: ServiceTicket) => void;
}) {
  const EMPTY: NewTicketForm = {
    subject: '', description: '', type: 'Other', priority: 'medium', due_by: '',
  };
 
  const [form, setForm]     = useState<NewTicketForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NewTicketForm, string>>>({});
  const [apiErr, setApiErr] = useState('');
 
  // Reset form every time the modal opens
  useEffect(() => {
    if (open) { setForm(EMPTY); setErrors({}); setApiErr(''); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
 
  function validate() {
    const e: Partial<Record<keyof NewTicketForm, string>> = {};
    if (!form.subject.trim())     e.subject     = 'Subject is required.';
    if (!form.description.trim()) e.description = 'Description is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }
 
  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setApiErr('');
 
    try {
      /*
       * ── Supabase INSERT ───────────────────────────────────────────────────
       * We store ticket data in activity_log.details (JSONB).
       * action      = subject line
       * entity_type = ticket type (Document / IT / Finance / Academic / Other)
       * details     = { description, status, priority, due_by }
       *
       * If you have a dedicated `service_tickets` table, replace this with:
       *   supabase.from('service_tickets').insert({ user_id, subject, ... })
       */
      const { data, error } = await supabase
        .from('activity_log')
        .insert({
          user_id:     userId,
          action:      form.subject.trim(),
          entity_type: form.type,
          details: {
            description: form.description.trim(),
            status:      'open',
            priority:    form.priority,
            due_by:      form.due_by || null,
          },
        })
        .select(`
          id, action, entity_type, details, created_at,
          users!activity_log_user_id_fkey (full_name,  role)
        `)
        .single();
 
      if (error) throw error;
 
      const row = data as any;
      const created: ServiceTicket = {
        id:             row.id,
        subject:        row.action,
        description:    row.details?.description ?? '',
        requester_name: row.users
          ? row.users.full_name ?? 'You'
          : 'You',
        requester_role: row.users?.role ?? 'Staff',
        created_at:     row.created_at,
        status:         row.details?.status ?? 'open',
        type:           row.entity_type ?? 'Other',
        priority:       row.details?.priority ?? 'medium',
        due_by:         row.details?.due_by ?? undefined,
      };
 
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : 'Failed to create ticket. Please try again.');
    } finally {
      setSaving(false);
    }
  }
 
  return (
    <Modal open={open} onClose={onClose} title="New Service Ticket" width="max-w-xl">
      <div className="space-y-4">
 
        {/* Subject */}
        <div>
          <FieldLabel label="Subject" required />
          <Input
            value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="e.g. Student transcript request – Ali Raza"
            className={errors.subject ? 'border-red-400 focus-visible:ring-red-400' : ''}
          />
          {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
        </div>
 
        {/* Type + Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel label="Request Type" required />
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as TicketType }))}
              className={inputCls}
            >
              {(['Document', 'IT', 'Finance', 'Academic', 'Other'] as TicketType[]).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel label="Priority" required />
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}
              className={inputCls}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
 
        {/* Due by */}
        <div>
          <FieldLabel label="Due By" />
          <input
            type="date"
            value={form.due_by}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setForm(f => ({ ...f, due_by: e.target.value }))}
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">Leave empty if there is no specific deadline.</p>
        </div>
 
        {/* Description */}
        <div>
          <FieldLabel label="Description" required />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe the request in detail…"
            rows={4}
            className={`${inputCls} resize-none ${errors.description ? 'border-red-400 focus:ring-red-400' : ''}`}
          />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
        </div>
 
        {/* API error */}
        {apiErr && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{apiErr}</span>
          </div>
        )}
 
        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-700 text-white min-w-[140px]"
          >
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</>
              : <><Plus className="h-4 w-4 mr-2" />Create Ticket</>
            }
          </Button>
        </div>
      </div>
    </Modal>
  );
}
 
// ══════════════════════════════════════════════════════════════════════════════
//  VIEW TICKET MODAL
//  Opens when "Open" button on a ticket row is clicked.
//  Shows full details and lets staff change the status.
// ══════════════════════════════════════════════════════════════════════════════
function ViewTicketModal({
  ticket, onClose, onStatusChange,
}: {
  ticket: ServiceTicket | null;
  onClose: () => void;
  onStatusChange: (id: string, status: TicketStatus) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [apiErr, setApiErr]     = useState('');
 
  async function changeStatus(newStatus: TicketStatus) {
    if (!ticket || ticket.status === newStatus) return;
    setUpdating(true);
    setApiErr('');
 
    try {
      /*
       * ── Supabase UPDATE ───────────────────────────────────────────────────
       * We use a Postgres function (RPC) to do a partial JSONB update.
       * Create it once in your Supabase SQL editor:
       *
       *   CREATE OR REPLACE FUNCTION update_ticket_status(ticket_id uuid, new_status text)
       *   RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
       *     UPDATE activity_log
       *     SET    details = jsonb_set(details, '{status}', to_jsonb(new_status), true)
       *     WHERE  id = ticket_id AND user_id = auth.uid();
       *   $$;
       *
       * If you have a dedicated tickets table with a `status` column, replace with:
       *   supabase.from('service_tickets').update({ status: newStatus }).eq('id', ticket.id)
       */
      const { error } = await supabase.rpc('update_ticket_status', {
        ticket_id:  ticket.id,
        new_status: newStatus,
      });
 
      if (error) throw error;
 
      onStatusChange(ticket.id, newStatus);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  }
 
  return (
    <Modal
      open={!!ticket}
      onClose={onClose}
      title={`Ticket · ${ticket?.id.slice(0, 8).toUpperCase() ?? ''}`}
      width="max-w-xl"
    >
      {ticket && (
        <div className="space-y-5">
 
          {/* Subject + badges */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-2 leading-snug">
              {ticket.subject}
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className={statusBadgeCls(ticket.status)}>{STATUS_LABEL[ticket.status]}</span>
              <span className={priorityBadgeCls(ticket.priority)}>{ticket.priority} priority</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] border border-gray-200 bg-gray-50 text-gray-600">
                {ticket.type}
              </span>
            </div>
          </div>
 
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Requester</p>
              <p className="text-sm font-medium text-gray-800">{ticket.requester_name}</p>
              <p className="text-xs text-gray-500">{ticket.requester_role}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Dates</p>
              <p className="text-sm font-medium text-gray-800">Created: {formatDate(ticket.created_at)}</p>
              {ticket.due_by && (
                <p className="text-xs text-amber-600 font-semibold mt-0.5">Due: {formatDate(ticket.due_by)}</p>
              )}
            </div>
          </div>
 
          {/* Description */}
          {ticket.description && (
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">Description</p>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[60px]">
                {ticket.description}
              </div>
            </div>
          )}
 
          {/* Status change buttons */}
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">Change Status</p>
            <div className="flex flex-wrap gap-2">
              {(['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map(s => (
                <button
                  key={s}
                  disabled={ticket.status === s || updating}
                  onClick={() => changeStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${ticket.status === s
                      ? 'bg-sky-600 text-white border-sky-600 cursor-default shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50'
                    } disabled:opacity-60`}
                >
                  {updating && ticket.status !== s && (
                    <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                  )}
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {apiErr && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {apiErr}
              </p>
            )}
          </div>
 
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
 
// ══════════════════════════════════════════════════════════════════════════════
//  REPLY MODAL
//  Opens when "Reply" button on a ticket row is clicked.
//  Inserts a reply record and shows a success state.
// ══════════════════════════════════════════════════════════════════════════════
function ReplyModal({
  ticket, onClose, userId,
}: {
  ticket: ServiceTicket | null;
  onClose: () => void;
  userId: string;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [apiErr, setApiErr]   = useState('');
 
  // Reset each time a ticket is opened
  useEffect(() => {
    if (ticket) { setMessage(''); setSent(false); setApiErr(''); }
  }, [ticket]);
 
  async function handleSend() {
    if (!ticket || !message.trim()) return;
    setSending(true);
    setApiErr('');
 
    try {
      /*
       * ── Supabase INSERT ───────────────────────────────────────────────────
       * Preferred: use the messages + conversations tables that exist in your schema.
       *
       *   Step 1 – upsert a conversation for this ticket:
       *   const { data: conv } = await supabase
       *     .from('conversations')
       *     .upsert({ reference_id: ticket.id, reference_type: 'ticket' }, { onConflict: 'reference_id' })
       *     .select('id').single();
       *
       *   Step 2 – add participant (staff) if not already there:
       *   await supabase.from('conversation_participants')
       *     .upsert({ conversation_id: conv.id, user_id: userId }, { onConflict: 'conversation_id,user_id' });
       *
       *   Step 3 – insert the message:
       *   await supabase.from('messages').insert({
       *     conversation_id: conv.id,
       *     sender_id:       userId,
       *     content:         message.trim(),
       *   });
       *
       * Fallback: log reply as an activity_log entry (used here because the
       * conversations table schema details are not confirmed yet).
       */
      const { error } = await supabase
        .from('activity_log')
        .insert({
          user_id:     userId,
          action:      `Reply to: ${ticket.subject}`,
          entity_id:   ticket.id,
          entity_type: 'ticket_reply',
          details: {
            message:    message.trim(),
            replied_at: new Date().toISOString(),
          },
        });
 
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      setApiErr(err instanceof Error ? err.message : 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  }
 
  return (
    <Modal
      open={!!ticket}
      onClose={onClose}
      title={`Reply · ${ticket?.subject ?? ''}`}
      width="max-w-lg"
    >
      {sent ? (
        /* Success state */
        <div className="text-center py-10 space-y-3">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="font-semibold text-gray-800">Reply sent!</p>
          <p className="text-sm text-gray-500">Your message has been recorded against this ticket.</p>
          <Button variant="outline" onClick={onClose} className="mt-2">Close</Button>
        </div>
      ) : (
        <div className="space-y-4">
 
          {/* Context banner */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
            <p className="text-[11px] text-sky-400 font-medium uppercase tracking-wide mb-0.5">Replying to</p>
            <p className="text-sm font-medium text-gray-800 leading-snug">{ticket?.subject}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {ticket?.requester_name} · {ticket?.requester_role}
            </p>
          </div>
 
          {/* Message textarea */}
          <div>
            <FieldLabel label="Your Message" required />
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your reply here…"
              rows={5}
              className={`${inputCls} resize-none`}
              autoFocus
            />
          </div>
 
          {/* API error */}
          {apiErr && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{apiErr}</span>
            </div>
          )}
 
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="bg-sky-600 hover:bg-sky-700 text-white min-w-[130px]"
            >
              {sending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending…</>
                : <><Send className="h-4 w-4 mr-2" />Send Reply</>
              }
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
 
// ══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function StaffDashboardPage() {
  const [userId, setUserId]   = useState<string | null>(null);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [announcements, setAnnouncements] = useState<StaffAnnouncement[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    openCount: 0, highPriorityCount: 0, dueTodayCount: 0, unreadAnnouncementsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
 
  // Filters
  const [ticketFilter, setTicketFilter] = useState<'all' | TicketStatus>('all');
  const [searchQuery, setSearchQuery]   = useState('');
 
  // Modal state
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [viewTicket, setViewTicket]       = useState<ServiceTicket | null>(null);
  const [replyTicket, setReplyTicket]     = useState<ServiceTicket | null>(null);
 
  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setUserId(data.session?.user.id ?? null)
    );
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) =>
      setUserId(session?.user.id ?? null)
    );
    return () => listener.subscription.unsubscribe();
  }, []);
 
  // ── Fetch all ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchTickets(), fetchTasks(), fetchAnnouncements()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
 
  useEffect(() => { fetchAll(); }, [fetchAll]);
 
  // ── Fetch tickets ──────────────────────────────────────────────────────────
  async function fetchTickets() {
    const { data, error } = await supabase
      .from('activity_log')
      .select(`
        id, action, entity_type, details, created_at,
        users!activity_log_user_id_fkey (full_name,  role)
      `)
      .eq('user_id', userId)
      .neq('entity_type', 'ticket_reply')
      .order('created_at', { ascending: false })
      .limit(50);
 
    if (error) throw error;
 
    const mapped: ServiceTicket[] = (data ?? []).map((row: any) => ({
      id:             row.id,
      subject:        row.action ?? 'Untitled',
      description:    row.details?.description ?? '',
      requester_name: row.users
        ? row.users.full_name
        : 'Unknown',
      requester_role: row.users?.role ?? 'Staff',
      created_at:     row.created_at,
      status:         (row.details?.status  as TicketStatus)   ?? 'open',
      type:           (row.entity_type      as TicketType)     ?? 'Other',
      priority:       (row.details?.priority as TicketPriority) ?? 'medium',
      due_by:         row.details?.due_by ?? undefined,
    }));
 
    setTickets(mapped);
    recomputeSummary(mapped);
  }
 
  function recomputeSummary(t: ServiceTicket[]) {
    const today = new Date().toDateString();
    setSummary(prev => ({
      ...prev,
      openCount:         t.filter(x => x.status === 'open' || x.status === 'in_progress').length,
      highPriorityCount: t.filter(x => (x.status === 'open' || x.status === 'in_progress') && x.priority === 'high').length,
      dueTodayCount:     t.filter(x => x.due_by && new Date(x.due_by).toDateString() === today).length,
    }));
  }
 
  // ── Fetch tasks ────────────────────────────────────────────────────────────
  async function fetchTasks() {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('id, title, start_at, type, program, semester')
      .eq('created_by', userId)
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(10);
 
    if (error) throw error;
 
    setTasks((data ?? []).map((row: any) => ({
      id:         row.id,
      title:      row.title,
      due_date:   row.start_at,
      category:   row.type ?? 'General',
      related_to: row.program ?? row.semester ?? undefined,
    })));
  }
 
  // ── Fetch announcements ────────────────────────────────────────────────────
  async function fetchAnnouncements() {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, is_read, created_at, details')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
 
    if (error) throw error;
 
    const mapped: StaffAnnouncement[] = (data ?? []).map((row: any) => ({
      id:          row.id,
      title:       row.title ?? row.details?.message ?? 'Notification',
      sender_name: row.details?.sender ?? 'Administration',
      created_at:  row.created_at,
      audience:    row.details?.audience,
      is_read:     row.is_read ?? false,
    }));
 
    setAnnouncements(mapped);
    setSummary(prev => ({
      ...prev,
      unreadAnnouncementsCount: mapped.filter(a => !a.is_read).length,
    }));
  }
 
  // ── Mark announcement read ─────────────────────────────────────────────────
  async function markRead(id: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);
 
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    setSummary(prev => ({
      ...prev,
      unreadAnnouncementsCount: Math.max(0, prev.unreadAnnouncementsCount - 1),
    }));
  }
 
  // ── Ticket created (optimistic prepend) ────────────────────────────────────
  function handleTicketCreated(ticket: ServiceTicket) {
    const next = [ticket, ...tickets];
    setTickets(next);
    recomputeSummary(next);
  }
 
  // ── Status changed from ViewTicketModal ────────────────────────────────────
  function handleStatusChange(id: string, status: TicketStatus) {
    const next = tickets.map(t => t.id === id ? { ...t, status } : t);
    setTickets(next);
    setViewTicket(v => v?.id === id ? { ...v, status } : v);
    recomputeSummary(next);
  }
 
  // ── Filtered tickets ───────────────────────────────────────────────────────
  const filtered = tickets.filter(t => {
    const okStatus = ticketFilter === 'all' || t.status === ticketFilter;
    const q = searchQuery.toLowerCase();
    const okSearch = !q
      || t.subject.toLowerCase().includes(q)
      || t.requester_name.toLowerCase().includes(q)
      || t.id.toLowerCase().includes(q)
      || t.type.toLowerCase().includes(q);
    return okStatus && okSearch;
  });
 
  // ── Summary card config ────────────────────────────────────────────────────
  const summaryCards = [
    { label: 'Open / In-Progress', value: summary.openCount,               icon: HelpCircle,  color: 'blue',   note: 'Student, parent & internal',   alert: summary.openCount > 0 },
    { label: 'High Priority',       value: summary.highPriorityCount,       icon: AlertCircle, color: 'red',    note: 'Needs quick attention',         alert: summary.highPriorityCount > 0 },
    { label: 'Tasks Due Today',     value: summary.dueTodayCount,           icon: Calendar,    color: 'orange', note: 'Tickets with today\'s due date', alert: summary.dueTodayCount > 0 },
    { label: 'Unread',              value: summary.unreadAnnouncementsCount, icon: Megaphone,  color: 'purple', note: 'From admin, HR & exam cell',    alert: false },
  ];
 
  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-sky-500 mx-auto" />
          <p className="text-gray-500 text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }
 
  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="font-semibold text-gray-800">Failed to load dashboard</p>
          <p className="text-sm text-gray-500">{error}</p>
          <Button onClick={fetchAll} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }
 
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ═══ MODALS ═══ */}
      {userId && (
        <>
          {/* 1. New ticket form */}
          <NewTicketModal
            open={showNewTicket}
            onClose={() => setShowNewTicket(false)}
            userId={userId}
            onCreated={handleTicketCreated}
          />
 
          {/* 2. View ticket detail + status change */}
          <ViewTicketModal
            ticket={viewTicket}
            onClose={() => setViewTicket(null)}
            onStatusChange={handleStatusChange}
          />
 
          {/* 3. Reply to a ticket */}
          <ReplyModal
            ticket={replyTicket}
            onClose={() => setReplyTicket(null)}
            userId={userId}
          />
        </>
      )}
 
      {/* ═══ PAGE ═══ */}
      <div className="space-y-6">
 
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Staff Dashboard</h1>
              <p className="text-sky-100 text-sm">
                Overview of student requests, tasks, and announcements
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={fetchAll}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
 
              {/*
               * ★ NEW SERVICE TICKET
               * onClick → opens NewTicketModal which has the full form.
               * On submit → inserts to Supabase → calls onCreated → ticket
               * is prepended to the list with optimistic update.
               */}
              <Button
                onClick={() => setShowNewTicket(true)}
                className="bg-white text-sky-700 hover:bg-sky-50 font-semibold shadow-sm"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                New Service Ticket
              </Button>
            </div>
          </div>
        </div>
 
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-3 bg-${s.color}-100 rounded-xl`}>
                      <Icon className={`h-6 w-6 text-${s.color}-600`} />
                    </div>
                    {s.alert && s.value > 0
                      ? <AlertCircle className="h-4 w-4 text-red-400" />
                      : <CheckCircle className="h-4 w-4 text-emerald-500" />
                    }
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.note}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
 
        {/* Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="h-4 w-4 text-gray-400" />
                Filter helpdesk tickets
              </div>
              <select
                value={ticketFilter}
                onChange={e => setTicketFilter(e.target.value as 'all' | TicketStatus)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 w-full lg:w-auto"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by subject, requester, ticket ID, or type…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>
 
        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
          {/* Tickets */}
          <Card className="border-0 shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <HelpCircle className="mr-2 h-5 w-5" />
                Service Tickets
                <span className="ml-auto text-xs font-normal text-gray-400">
                  {filtered.length} / {tickets.length}
                </span>
              </CardTitle>
              <CardDescription>
                Requests from students, parents, and internal departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filtered.map(t => (
                  <div
                    key={t.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-sky-200 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-start gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-sky-600" />
                      </div>
 
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">
                            {t.subject}
                          </p>
                          <span className={statusBadgeCls(t.status)}>{STATUS_LABEL[t.status]}</span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] border border-gray-200 bg-gray-50 text-gray-600">
                            {t.type}
                          </span>
                          <span className={priorityBadgeCls(t.priority)}>{t.priority} priority</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {t.requester_name} · {t.requester_role}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Created: {formatDate(t.created_at)}
                          {t.due_by && ` · Due: ${formatDate(t.due_by)}`}
                        </p>
                      </div>
 
                      {/* Action buttons */}
                      <div className="flex md:flex-col gap-2 shrink-0">
                        {/*
                         * ★ OPEN → opens ViewTicketModal
                         *   Shows full details + status change buttons
                         *   Calls onStatusChange → updates local state
                         */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => setViewTicket(t)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Open
                        </Button>
 
                        {/*
                         * ★ REPLY → opens ReplyModal
                         *   Textarea + send button
                         *   Inserts reply into activity_log (or messages table)
                         */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => setReplyTicket(t)}
                        >
                          <Mail className="h-3.5 w-3.5 mr-1" /> Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
 
                {filtered.length === 0 && (
                  <div className="text-center py-12">
                    <HelpCircle className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">No tickets found</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Adjust your filters or{' '}
                      <button
                        onClick={() => setShowNewTicket(true)}
                        className="text-sky-500 underline underline-offset-2 hover:text-sky-700"
                      >
                        create a new ticket
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
 
          {/* Right column */}
          <div className="space-y-6">
 
            {/* Tasks */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <ClipboardCheck className="mr-2 h-5 w-5" />
                  My Tasks
                </CardTitle>
                <CardDescription>Upcoming calendar items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className="border border-gray-200 rounded-lg px-3 py-2.5 hover:border-sky-200 transition-colors"
                    >
                      <p className="font-semibold text-gray-900 text-sm mb-0.5 leading-snug">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {task.category}{task.related_to && ` · ${task.related_to}`}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Due: {formatDate(task.due_date)}
                      </p>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-6">No upcoming tasks.</p>
                  )}
                </div>
              </CardContent>
            </Card>
 
            {/* Announcements */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Announcements
                  {summary.unreadAnnouncementsCount > 0 && (
                    <span className="ml-2 bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {summary.unreadAnnouncementsCount}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Click an item to mark it as read</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {announcements.map(a => (
                    <div
                      key={a.id}
                      onClick={() => !a.is_read && markRead(a.id)}
                      className={`border rounded-xl px-3 py-2.5 transition-all ${
                        a.is_read
                          ? 'border-gray-200 bg-white cursor-default hover:border-gray-300'
                          : 'border-indigo-200 bg-indigo-50 cursor-pointer hover:bg-indigo-100'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!a.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 text-sm leading-snug">{a.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {a.sender_name}{a.audience && ` · ${a.audience}`}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(a.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {announcements.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-6">No announcements.</p>
                  )}
                </div>
              </CardContent>
            </Card>
 
            {/* Quick links */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <FileText className="mr-2 h-5 w-5" />
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { label: 'Student Records',  Icon: Users },
                    { label: 'Exam Schedule',    Icon: Calendar },
                    { label: 'Forms & Templates', Icon: Download },
                    { label: 'Contact Admin',    Icon: Mail },
                  ] as const).map(({ label, Icon }) => (
                    <Button key={label} variant="outline" className="justify-start text-xs gap-2">
                      <Icon className="h-4 w-4" /> {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}