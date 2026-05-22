'use client';

/**
 * HR Department Calendar & Events Page
 *
 * RLS alignment (public.users synced with auth.users — same UUID):
 *
 *  getCurrentUser()         → auth.getUser() UUID → lookup public.users by same id
 *  fetchCalendarEvents()    → fetches all department calendar events (no user filter —
 *                             HR sees all events; RLS: EXISTS public.users where id = auth.uid())
 *  fetchDepartmentEvents()  → joins courses, programs, users for richer event data
 *                             FK hints reference public.users (not auth.users)
 *  createCalendarEvent()    → created_by = userId (= auth.uid()) — matches RLS INSERT
 *                             date fix: appends T00:00:00 to avoid UTC timezone date-shift
 *  All realtime channels    → use currentUser.id (from public.users) = auth.uid()
 */

import { useEffect, useState, useCallback } from 'react';

import {
  Calendar, CalendarDays, Clock, MapPin, Users, GraduationCap,
  Megaphone, Tag, AlertCircle, CheckCircle, Search, Filter,
  Eye, BookOpen, User, Plus, Loader2, X, ChevronLeft,
  ChevronRight, RefreshCw, Bell,
} from 'lucide-react';
import { supabase } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicUser {
  id: string;         // = auth.uid() — public.users synced with auth.users
  full_name: string;
  email: string;
  role: string;
}

type EventType = 'Academic' | 'Exam' | 'Counselling' | 'Seminar' | 'Club' | 'Admin';
type EventStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';

interface CalendarEventRow {
  id: string;
  title: string;
  description?: string | null;
  start_at: string;
  end_at?: string | null;
  location?: string | null;
  type?: string | null;
  created_by: string;
  created_at: string;
  creator?: { full_name: string; email: string; role: string } | null;
}

/** Unified shape used for rendering — covers both DB rows and local normalization */
interface EventItem {
  id: string;
  title: string;
  type: EventType;
  programName?: string;
  courseCode?: string;
  courseName?: string;
  semester?: number;
  organizer: string;
  organizerRole: string;
  date: string;       // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string;   // HH:MM
  location: string;
  mode: 'On-campus' | 'Online' | 'Hybrid';
  capacity?: number;
  registered?: number;
  mandatory: boolean;
  status: EventStatus;
  raw?: CalendarEventRow;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<EventType, { color: string; bg: string; border: string; dot: string }> = {
  Exam:        { color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',    dot: 'bg-rose-500'    },
  Academic:    { color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  Seminar:     { color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200',  dot: 'bg-purple-500'  },
  Counselling: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  Club:        { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  Admin:       { color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200',   dot: 'bg-slate-400'   },
};

const STATUS_META: Record<EventStatus, { color: string; bg: string; border: string }> = {
  Upcoming:  { color: 'text-blue-700',    bg: 'bg-blue-50',   border: 'border-blue-200'   },
  Ongoing:   { color: 'text-green-700',   bg: 'bg-green-50',  border: 'border-green-200'  },
  Completed: { color: 'text-slate-700',   bg: 'bg-slate-100', border: 'border-slate-200'  },
  Cancelled: { color: 'text-rose-700',    bg: 'bg-rose-50',   border: 'border-rose-200'   },
};

const EVENT_TYPES: Array<'all' | EventType> = [
  'all', 'Academic', 'Exam', 'Counselling', 'Seminar', 'Club', 'Admin',
];
const EVENT_STATUSES: Array<'all' | EventStatus> = [
  'all', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled',
];

// ─── Date / Time Helpers ──────────────────────────────────────────────────────

const isoToDate = (iso: string): string => iso.slice(0, 10);

const todayStr = (): string => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

const isUpcoming = (d: string) => d >= todayStr();
const isToday    = (d: string) => d === todayStr();

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function formatTime(t?: string): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  const hour = parseInt(hStr ?? '0', 10);
  const min  = mStr ?? '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

/** Derive a human-readable EventStatus from the event's date vs today */
function deriveStatus(dateStr: string): EventStatus {
  if (dateStr > todayStr()) return 'Upcoming';
  if (dateStr === todayStr()) return 'Ongoing';
  return 'Completed';
}

const getDaysInMonth     = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

// ─── Supabase Query Functions ─────────────────────────────────────────────────

/**
 * Resolve the logged-in user from public.users.
 * RLS SELECT: EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid())
 */
async function getCurrentUser(): Promise<PublicUser | null> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single();

  if (error) { console.error('[getCurrentUser]', error.message); return null; }
  return data as PublicUser;
}

/**
 * Fetch department-wide calendar events.
 * HR has visibility into all calendar_events (no user_id filter needed).
 * RLS SELECT: EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid())
 * FK hint → public.users via the named constraint (not auth.users).
 */
async function fetchCalendarEvents(): Promise<CalendarEventRow[]> {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          description,
          start_at,
          end_at,
          location,
          type,
          created_by,
          created_at,
          creator:users (
            full_name,
            email,
            role
          )
        `)
        .order('start_at', { ascending: true });

  if (error) { console.error('[fetchCalendarEvents]', error.message); return []; }

  return ((data ?? []) as any[]).map(row => ({
    ...row,
    creator: Array.isArray(row.creator) ? row.creator[0] ?? null : row.creator ?? null,
  })) as CalendarEventRow[];
}

/**
 * Insert a new calendar event.
 * RLS INSERT: created_by = auth.uid()
 *   AND EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid())
 *
 * Date fix: "YYYY-MM-DD" from <input type="date"> → append T00:00:00
 * to parse as local time before converting to ISO, avoiding UTC midnight
 * shifting the date by -1 day in positive-UTC offset timezones.
 */
async function createCalendarEvent(params: {
  userId: string;
  title: string;
  description: string;
  start_date: string;   // "YYYY-MM-DD" from date input
  end_date: string;     // "YYYY-MM-DD" from date input
  location: string;
  type: string;
}): Promise<{ error: string | null }> {
  const startISO = new Date(`${params.start_date}T00:00:00`).toISOString();
  const endISO   = params.end_date
    ? new Date(`${params.end_date}T23:59:59`).toISOString()
    : null;

  const { error } = await supabase.from('calendar_events').insert({
    created_by:  params.userId,
    title:       params.title.trim(),
    description: params.description.trim() || null,
    start_at:    startISO,
    end_at:      endISO,
    location:    params.location.trim() || null,
    type:  params.type || 'Admin',
  });

  return { error: error?.message ?? null };
}

// ─── Normalize DB rows → EventItem ───────────────────────────────────────────

function normalizeCalendarRows(rows: CalendarEventRow[]): EventItem[] {
  return rows.map(row => {
    const dateStr = row.start_at ? isoToDate(row.start_at) : todayStr();
    return {
      id:           row.id,
      title:        row.title,
      type: (row.type as EventType) ?? 'Admin',
      organizer:    row.creator?.full_name ?? 'HR Department',
      organizerRole:row.creator?.role      ?? 'HR',
      date:         dateStr,
      startTime:    row.start_at?.slice(11, 16) ?? undefined,
      endTime:      row.end_at?.slice(11, 16)   ?? undefined,
      location:     row.location ?? '—',
      mode:         'On-campus' as const,
      mandatory:    false,
      status:       deriveStatus(dateStr),
      raw:          row,
    };
  });
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType }
let _tid = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          t.type === 'success' ? 'bg-emerald-600 text-white' :
          t.type === 'error'   ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'
        }`}>
          <span>{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="opacity-70 hover:opacity-100 text-white leading-none">✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ year, month, events, onChangeMonth }: {
  year: number; month: number;
  events: EventItem[];
  onChangeMonth: (delta: number) => void;
}) {
  const days     = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today    = todayStr();
  const eventDates = new Set(events.map(e => e.date));

  const MONTHS    = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
  const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 select-none">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onChangeMonth(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition">
          <ChevronLeft className="h-4 w-4 text-slate-600" />
        </button>
        <span className="text-sm font-semibold text-slate-800">{MONTHS[month]} {year}</span>
        <button onClick={() => onChangeMonth(1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition">
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-[10px] font-semibold text-slate-400 text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />;
          const mm      = String(month + 1).padStart(2, '0');
          const dd      = String(day).padStart(2, '0');
          const dateStr = `${year}-${mm}-${dd}`;
          const hasEv   = eventDates.has(dateStr);
          const isT     = dateStr === today;
          return (
            <div key={dateStr} className={`relative aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${
              isT    ? 'bg-blue-600 text-white font-bold' :
              hasEv  ? 'bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100' :
                       'text-slate-600 hover:bg-slate-50'
            }`}>
              {day}
              {hasEv && !isT && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────

function EventDetailModal({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const typeMeta   = TYPE_META[event.type]   ?? TYPE_META['Admin'];
  const statusMeta = STATUS_META[event.status] ?? STATUS_META['Upcoming'];
  const hasReg     = event.capacity != null && event.registered != null;
  const fillRate   = hasReg ? Math.round((event.registered! / event.capacity!) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${typeMeta.bg} ${typeMeta.color} ${typeMeta.border}`}>
              {event.type}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
              {event.status}
            </span>
            {event.mandatory && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                Mandatory
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg transition">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">{event.title}</h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2 text-slate-600">
              <CalendarDays className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium mb-0.5">Date</p>
                <p className="font-semibold text-slate-800">{formatDisplayDate(event.date)}</p>
              </div>
            </div>
            {(event.startTime || event.endTime) && (
              <div className="flex items-start gap-2 text-slate-600">
                <Clock className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-0.5">Time</p>
                  <p className="font-semibold text-slate-800">
                    {event.startTime && formatTime(event.startTime)}
                    {event.startTime && event.endTime && ' – '}
                    {event.endTime && formatTime(event.endTime)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2 text-slate-600">
              <MapPin className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium mb-0.5">Location</p>
                <p className="font-semibold text-slate-800">{event.location}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-600">
              <User className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium mb-0.5">Organizer</p>
                <p className="font-semibold text-slate-800">{event.organizer}</p>
                <p className="text-xs text-slate-500">{event.organizerRole}</p>
              </div>
            </div>
          </div>

          {(event.programName || event.courseName) && (
            <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
              {event.programName && (
                <p className="text-slate-600"><span className="font-semibold">Program:</span> {event.programName}</p>
              )}
              {event.semester && (
                <p className="text-slate-600"><span className="font-semibold">Semester:</span> {event.semester}</p>
              )}
              {event.courseName && event.courseCode && (
                <p className="text-slate-600"><span className="font-semibold">Course:</span> {event.courseName} ({event.courseCode})</p>
              )}
            </div>
          )}

          {hasReg && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Registrations</span>
                <span className="font-bold text-slate-800">{event.registered}/{event.capacity}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${fillRate >= 90 ? 'bg-rose-500' : fillRate >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${fillRate}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 text-right">{fillRate}% filled</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Event Modal ───────────────────────────────────────────────────────

function CreateEventModal({ userId, onClose, onCreated }: {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    title: '', description: '',
    start_date: todayStr(), end_date: '',
    location: '', type: 'Admin',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim())  { setErr('Title is required.');       return; }
    if (!form.start_date)    { setErr('Start date is required.');  return; }
    if (form.end_date && form.end_date < form.start_date) {
      setErr('End date cannot be before start date.'); return;
    }

    setSaving(true);
    setErr(null);
    const { error } = await createCalendarEvent({ userId, ...form });
    setSaving(false);

    if (error) { setErr(error); return; }
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-blue-500" />
            Create New Event
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg transition">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {err && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {err}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Event Title *</label>
            <input
              autoFocus
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Midterm Exam – Database Systems"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Start Date *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">End Date</label>
              <input
                type="date"
                value={form.end_date}
                min={form.start_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Event Type</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                {(['Academic','Exam','Counselling','Seminar','Club','Admin'] as EventType[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Location</label>
              <input
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. Hall A, Online..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Any additional details..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({ event, onViewDetail }: { event: EventItem; onViewDetail: (e: EventItem) => void }) {
  const typeMeta   = TYPE_META[event.type]     ?? TYPE_META['Admin'];
  const statusMeta = STATUS_META[event.status] ?? STATUS_META['Upcoming'];
  const hasReg     = event.capacity != null && event.registered != null;
  const fillRate   = hasReg ? Math.round((event.registered! / event.capacity!) * 100) : 0;
  const today      = isToday(event.date);
  const upcoming   = isUpcoming(event.date);

  const typeIcon = {
    Exam:        <GraduationCap className="h-5 w-5 text-indigo-600" />,
    Academic:    <BookOpen      className="h-5 w-5 text-indigo-600" />,
    Seminar:     <Users         className="h-5 w-5 text-indigo-600" />,
    Counselling: <User          className="h-5 w-5 text-indigo-600" />,
    Club:        <Tag           className="h-5 w-5 text-indigo-600" />,
    Admin:       <Megaphone     className="h-5 w-5 text-indigo-600" />,
  }[event.type];

  return (
    <div className={`relative border rounded-xl p-4 hover:shadow-md transition-all ${
      today    ? 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-200' :
      !upcoming ? 'opacity-70 bg-slate-50 border-slate-100' :
                  'border-slate-200 bg-white hover:border-slate-300'
    }`}>
      {today && (
        <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider">
          TODAY
        </span>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-2">
        <div className="flex gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            {typeIcon}
          </div>
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${typeMeta.bg} ${typeMeta.color} ${typeMeta.border}`}>
                {event.type}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
                {event.status}
              </span>
              {event.mandatory && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Mandatory
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-slate-900 truncate">{event.title}</p>

            {/* Date / time */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDisplayDate(event.date)}
              </span>
              {(event.startTime || event.endTime) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {event.startTime && formatTime(event.startTime)}
                  {event.startTime && event.endTime && ' – '}
                  {event.endTime && formatTime(event.endTime)}
                </span>
              )}
            </div>

            {/* Program / course meta */}
            {(event.programName || event.courseName) && (
              <p className="text-xs text-slate-500 mt-0.5">
                {event.programName}
                {event.semester && ` · Semester ${event.semester}`}
                {event.courseName && event.courseCode && ` · ${event.courseName} (${event.courseCode})`}
              </p>
            )}

            <p className="text-xs text-slate-500 mt-0.5">
              Organized by <span className="font-medium text-slate-700">{event.organizer}</span>
              {event.organizerRole && ` · ${event.organizerRole}`}
            </p>
          </div>
        </div>

        {/* Right meta */}
        <div className="flex flex-col items-start lg:items-end gap-1.5 text-xs text-slate-600 flex-shrink-0">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {event.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {event.mode}
          </span>
          <button
            onClick={() => onViewDetail(event)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-medium transition-all mt-0.5"
          >
            <Eye className="h-3.5 w-3.5" /> View Details
          </button>
        </div>
      </div>

      {/* Registration bar */}
      {hasReg && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
          <div>
            <p className="mb-1 text-slate-400 font-medium">Registrations</p>
            <p className="text-sm font-semibold text-slate-800">{event.registered}/{event.capacity} registered</p>
          </div>
          <div>
            <p className="mb-1 text-slate-400 font-medium">Fill Rate</p>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-1.5">
              <div
                className={`h-2 rounded-full transition-all ${fillRate >= 90 ? 'bg-rose-500' : fillRate >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${fillRate}%` }}
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-slate-400 font-medium">Audience</p>
            <p className="font-medium text-slate-700">
              {event.programName ?? 'Whole department'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HRCalendarEventsPage() {
  const [currentUser, setCurrentUser]   = useState<PublicUser | null>(null);
  const [events, setEvents]             = useState<EventItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedType, setSelectedType] = useState<'all' | EventType>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | EventStatus>('all');
  const [timeFilter, setTimeFilter]     = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [showCreate, setShowCreate]     = useState(false);
  const [detailEvent, setDetailEvent]   = useState<EventItem | null>(null);
  const [calYear, setCalYear]           = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]         = useState(new Date().getMonth());
  const [toasts, setToasts]             = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_tid;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /** Load all calendar events. Uses Promise.allSettled so a single failure doesn't wipe the page. */
  const loadAll = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);

    const [calResult] = await Promise.allSettled([fetchCalendarEvents()]);
    const calRows     = calResult.status === 'fulfilled' ? calResult.value : [];
    if (calResult.status === 'rejected') console.error('[loadAll] calendar:', calResult.reason);

    setEvents(normalizeCalendarRows(calRows));
    quiet ? setRefreshing(false) : setLoading(false);
  }, []);

  useEffect(() => {
    getCurrentUser().then(u => {
      setCurrentUser(u);
      loadAll();
    });
  }, [loadAll]);

  /** Realtime: new calendar_events inserts */
  useEffect(() => {
    if (!currentUser) return;
    const ch = supabase
      .channel('calendar_events:hr')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calendar_events' }, () => {
        loadAll(true);
        addToast('New event added to calendar', 'info');
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [currentUser, loadAll, addToast]);

  const handleChangeMonth = (delta: number) => {
    setCalMonth(prev => {
      let m = prev + delta;
      let y = calYear;
      if (m < 0)  { m = 11; y--; setCalYear(y); }
      if (m > 11) { m = 0;  y++; setCalYear(y); }
      return m;
    });
  };

  // ── Derived values ──
  const today       = todayStr();
  const todayEvents = events.filter(e => e.date === today);

  const filtered = events.filter(e => {
    const typeOk   = selectedType   === 'all' || e.type   === selectedType;
    const statusOk = selectedStatus === 'all' || e.status === selectedStatus;
    const timeOk   =
      timeFilter === 'all'      ? true :
      timeFilter === 'upcoming' ? isUpcoming(e.date) :
                                  !isUpcoming(e.date) || isToday(e.date);

    const q = searchQuery.toLowerCase();
    const searchOk =
      !q ||
      e.title.toLowerCase().includes(q) ||
      (e.courseCode    && e.courseCode.toLowerCase().includes(q)) ||
      (e.courseName    && e.courseName.toLowerCase().includes(q)) ||
      (e.programName   && e.programName.toLowerCase().includes(q)) ||
      e.organizer.toLowerCase().includes(q);

    return typeOk && statusOk && timeOk && searchOk;
  });

  const totalEvents    = events.length;
  const upcomingCount  = events.filter(e => e.status === 'Upcoming').length;
  const mandatoryCount = events.filter(e => e.mandatory).length;
  const examCount      = events.filter(e => e.type === 'Exam').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading department calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── Header ── */}
      <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fff 0%, transparent 50%)' }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-1">
              HR Department
            </p>
            <h1 className="text-2xl font-bold">Department Calendar &amp; Events</h1>
            <p className="text-blue-100 text-sm mt-1">
              Exams, seminars, counselling clinics, and departmental activities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {currentUser && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 text-sm font-semibold rounded-xl transition shadow-lg"
              >
                <Megaphone className="h-4 w-4" /> Create New Event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Scheduled',  value: totalEvents,    icon: Calendar,    color: 'text-blue-600 bg-blue-50',    border: 'border-blue-100',    note: 'Across all programs'       },
          { label: 'Upcoming Events',  value: upcomingCount,  icon: CalendarDays,color: 'text-emerald-600 bg-emerald-50', border: 'border-emerald-100', note: 'Remaining this term'  },
          { label: 'Mandatory Events', value: mandatoryCount, icon: AlertCircle, color: 'text-amber-600 bg-amber-50',  border: 'border-amber-100',   note: 'Exams and key sessions'    },
          { label: 'Exams Scheduled',  value: examCount,      icon: GraduationCap,color:'text-purple-600 bg-purple-50', border: 'border-purple-100',  note: 'Department exam load'      },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              {s.label === 'Mandatory Events'
                ? <AlertCircle className="h-4 w-4 text-rose-400" />
                : <CheckCircle className="h-4 w-4 text-emerald-400" />}
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
            <p className="text-xs text-slate-400 mt-1">{s.note}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid: calendar sidebar + event list ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-5">

        {/* ─ Left sidebar ─ */}
        <div className="space-y-4">
          <MiniCalendar
            year={calYear}
            month={calMonth}
            events={events}
            onChangeMonth={handleChangeMonth}
          />

          {/* Type legend — only shows types with ≥1 event */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Legend</p>
            <div className="space-y-2">
              {(Object.entries(TYPE_META) as [EventType, typeof TYPE_META[EventType]][]).map(([type, meta]) => {
                const count = events.filter(e => e.type === type).length;
                if (count === 0) return null;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      <span className="text-xs text-slate-600">{type}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 tabular-nums">{count}</span>
                  </div>
                );
              })}
              {events.length === 0 && (
                <p className="text-xs text-slate-400 italic">No events yet</p>
              )}
            </div>
          </div>

          {/* Today panel */}
          {todayEvents.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" /> Today
              </p>
              <div className="space-y-2">
                {todayEvents.map(e => {
                  const meta = TYPE_META[e.type] ?? TYPE_META['Admin'];
                  return (
                    <div key={e.id} className="flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${meta.dot}`} />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 leading-tight">{e.title}</p>
                        {e.startTime && (
                          <p className="text-[10px] text-blue-500">{formatTime(e.startTime)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─ Right column: filters + event cards ─ */}
        <div className="space-y-4">

          {/* Filter bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            {/* Time + type + status row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 flex-shrink-0">
                <Filter className="h-3.5 w-3.5" /> Filters
              </div>

              {/* Time filter pills */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                {(['upcoming','past','all'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTimeFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      timeFilter === f
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value as 'all' | EventType)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value as 'all' | EventStatus)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {EVENT_STATUSES.map(s => (
                  <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>
                ))}
              </select>

              <span className="text-xs text-slate-400 sm:ml-auto">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title, course, program, or organizer..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Event cards */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
                <Calendar className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-sm">No events match your filters</p>
                <p className="text-slate-400 text-xs mt-1">
                  {searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : timeFilter === 'upcoming'
                      ? 'No upcoming events scheduled.'
                      : 'No events found.'}
                </p>
              </div>
            ) : (
              filtered.map(event => (
                <EventCard key={event.id} event={event} onViewDetail={setDetailEvent} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showCreate && currentUser && (
        <CreateEventModal
          userId={currentUser.id}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            loadAll(true);
            addToast('Event created successfully!', 'success');
          }}
        />
      )}

      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
        />
      )}
    </div>
  );
}