'use client';

/**
 * Staff Calendar & Duties Page
 *
 * RLS alignment (public.users synced with auth.users — same UUID):
 *
 *  getCurrentUser()        → auth.getUser() UUID → lookup public.users by same id
 *  fetchCalendarEvents()   → created_by = userId (= auth.uid()) — matches RLS SELECT/INSERT
 *  fetchStaffTasks()       → two policies: assigned_to OR assigned_by = auth.uid()
 *                            code uses .or() to fetch both in one query
 *  fetchBusTripStatus()    → updated_by = userId — matches RLS SELECT
 *                            FK hint added: bus_routes!bus_trip_status_route_id_fkey
 *  createCalendarEvent()   → created_by = userId (= auth.uid()) — matches RLS INSERT
 *                            date fixed: appends T00:00:00 to avoid timezone date-shift
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Calendar, Clock, MapPin, Filter, AlertCircle, CheckCircle,
  Plus, Loader2, ChevronLeft, ChevronRight, Bus, BookOpen,
  Clipboard, MoreHorizontal, X, Bell, Users, RefreshCw,
  Tag, FileText,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

// Named PublicUser (not User) to avoid conflict with browser's built-in User type
interface PublicUser {
  id: string;         // = auth.uid() — public.users synced with auth.users
  full_name: string;
  email: string;
  role: string;
}

type DutyType = 'Front Desk' | 'Bus Duty' | 'Exam' | 'Library' | 'Other' | 'Task' | 'Event';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  start_at: string;     // ISO datetime from DB
  end_at: string | null;
  location?: string | null;
  event_type?: string | null;
  created_by: string;     // FK → public.users.id (synced = auth.uid())
  created_at: string;
}

interface StaffTask {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: string;
  priority?: string | null;
  assigned_by: string;    // FK → public.users.id
  assigned_to: string;    // FK → public.users.id
  created_at: string;
  // joined via FK hint → public.users
  assigner?: { full_name: string; email: string } | null;
  assignee?: { full_name: string; email: string } | null;
}

interface BusRoute {
  id: string;
  code: string;
  departure_time: string; // Postgres time "HH:MM:SS"
  arrival_time: string;   // Postgres time "HH:MM:SS"
  capacity: number;
}

interface BusTripStatus {
  id: string;
  route_id: string;
  trip_date: string;      // Postgres date "YYYY-MM-DD"
  status: string;
  updated_by: string;     // FK → public.users.id
  notes?: string | null;
  route?: BusRoute | null;
}

interface UnifiedDuty {
  id: string;
  type: DutyType;
  title: string;
  date: string;           // YYYY-MM-DD — used for all comparisons
  startTime?: string;     // HH:MM:SS — from bus route departure / event times
  endTime?: string;       // HH:MM:SS — from bus route arrival
  endDate?: string;       // YYYY-MM-DD — only for multi-day calendar events
  location?: string | null;
  note?: string | null;
  status?: string;
  priority?: string | null;
  isAssignedByMe?: boolean; // true when current user assigned this task to someone else
  raw: CalendarEvent | StaffTask | BusTripStatus;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DUTY_TYPES: Array<'all' | DutyType> = [
  'all', 'Event', 'Task', 'Bus Duty', 'Exam', 'Front Desk', 'Library', 'Other',
];

const TYPE_META: Record<DutyType, {
  icon: React.ElementType; color: string; bg: string; dot: string;
}> = {
  'Event':      { icon: Calendar,       color: 'text-violet-700',  bg: 'bg-violet-50',  dot: 'bg-violet-500'  },
  'Task':       { icon: Clipboard,      color: 'text-sky-700',     bg: 'bg-sky-50',     dot: 'bg-sky-500'     },
  'Bus Duty':   { icon: Bus,            color: 'text-amber-700',   bg: 'bg-amber-50',   dot: 'bg-amber-500'   },
  'Exam':       { icon: FileText,       color: 'text-rose-700',    bg: 'bg-rose-50',    dot: 'bg-rose-500'    },
  'Front Desk': { icon: Users,          color: 'text-teal-700',    bg: 'bg-teal-50',    dot: 'bg-teal-500'    },
  'Library':    { icon: BookOpen,       color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  'Other':      { icon: MoreHorizontal, color: 'text-slate-700',   bg: 'bg-slate-50',   dot: 'bg-slate-400'   },
};

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-slate-100 text-slate-600',
};

const STATUS_BADGE: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700',
  in_progress: 'bg-sky-100 text-sky-700',
  completed:   'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-slate-100 text-slate-500',
  active:      'bg-emerald-100 text-emerald-700',
  delayed:     'bg-rose-100 text-rose-700',
};

// ─── Date / Time Helpers ──────────────────────────────────────────────────────

/** Safely extract YYYY-MM-DD from any ISO string without timezone shifting */
const isoToDate = (iso: string): string => iso.slice(0, 10);

/** Today as YYYY-MM-DD in local timezone */
const todayStr = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isUpcoming = (d: string): boolean => d >= todayStr();
const isPast     = (d: string): boolean => d <  todayStr();
const isToday    = (d: string): boolean => d === todayStr();

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

/**
 * Format a Postgres time string "HH:MM:SS" or "HH:MM" → "12:30 PM"
 * This is ONLY for time values, not date strings.
 */
function formatTime(t?: string): string {
  if (!t) return '';
  const parts = t.split(':');
  const hour = parseInt(parts[0] ?? '0', 10);
  const min  = parts[1] ?? '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

const getDaysInMonth     = (y: number, m: number): number => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y: number, m: number): number => new Date(y, m, 1).getDay();

// ─── Supabase Query Functions ─────────────────────────────────────────────────

/**
 * Resolve the logged-in user from public.users.
 * RLS on public.users SELECT:
 *   EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid())
 * .eq('id', user.id) is explicit and mirrors the RLS condition.
 */
async function getCurrentUser(): Promise<PublicUser | null> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return null;

  const { data, error } = await supabase
    .from('users')                        // public.users — id synced with auth.users
    .select('id, full_name, email, role')
    .eq('id', user.id)                    // user.id === auth.uid()
    .single();

  if (error) { console.error('[getCurrentUser]', error.message); return null; }
  return data as PublicUser;
}

/**
 * Fetch calendar events the current user created.
 * RLS SELECT: created_by = auth.uid()
 *   AND EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid())
 * calendar_events.created_by → public.users.id (synced = auth.uid())
 * .eq('created_by', userId) explicitly mirrors the RLS condition.
 */
async function fetchCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
  .select('id, title, description, start_at, end_at, location, created_by, created_at')
    .eq('created_by', userId)             // userId = currentUser.id = auth.uid()
    .order('start_at', { ascending: true });

  if (error) { console.error('[fetchCalendarEvents]', error.message); return []; }
  return (data ?? []) as CalendarEvent[];
}

/**
 * Fetch staff tasks for the current user.
 *
 * Two RLS SELECT policies exist:
 *   Policy 1: assigned_to = auth.uid()  → tasks assigned TO me
 *   Policy 2: assigned_by = auth.uid()  → tasks I assigned to others
 *
 * We use .or() so both policies' rows are returned in one query.
 * The FK hints reference public.users (not auth.users) for the joins.
 */
async function fetchStaffTasks(userId: string): Promise<StaffTask[]> {
  const { data, error } = await supabase
    .from('staff_tasks')
    .select(`
      id, title, description, due_date, status, priority,
      assigned_by, assigned_to, created_at,
      assigner:users!staff_tasks_assigned_by_fkey ( full_name, email ),
      assignee:users!staff_tasks_assigned_to_fkey ( full_name, email )
    `)
    // Matches BOTH RLS policies in one query — no separate fetch needed
    .or(`assigned_to.eq.${userId},assigned_by.eq.${userId}`)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) { console.error('[fetchStaffTasks]', error.message); return []; }

  const rawTasks = (data ?? []) as any[];
  return rawTasks.map((task): StaffTask => ({
    ...task,
    assigner: Array.isArray(task.assigner)
      ? task.assigner[0] ?? null
      : task.assigner ?? null,
    assignee: Array.isArray(task.assignee)
      ? task.assignee[0] ?? null
      : task.assignee ?? null,
  }));
}

/**
 * Fetch bus trip status entries for the current user.
 * RLS SELECT: updated_by = auth.uid()
 *   AND EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid())
 *
 * FK hint for bus_routes join uses the named constraint to avoid ambiguity.
 * bus_routes RLS SELECT: EXISTS(public.users where id = auth.uid()) — readable by all staff.
 */
async function fetchBusTripStatus(userId: string): Promise<BusTripStatus[]> {
  const { data, error } = await supabase
    .from('bus_trip_status')
    .select(`
      id, route_id, trip_date, status, updated_by, notes,
      route:bus_routes!bus_trip_status_route_id_fkey (
        id, code, departure_time, arrival_time, capacity
      )
    `)
    .eq('updated_by', userId)             // userId = auth.uid() — matches RLS SELECT
    .order('trip_date', { ascending: true });

  if (error) { console.error('[fetchBusTripStatus]', error.message); return []; }

  const rawTrips = (data ?? []) as any[];
  return rawTrips.map((trip): BusTripStatus => ({
    ...trip,
    route: Array.isArray(trip.route) ? trip.route[0] ?? null : trip.route ?? null,
  }));
}

/**
 * Insert a new calendar event.
 * RLS INSERT: created_by = auth.uid()
 *   AND EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid())
 *
 * Date fix: input is "YYYY-MM-DD" from <input type="date">.
 * new Date("YYYY-MM-DD").toISOString() parses as UTC midnight and converts
 * to local time, which can shift the date by -1 day in positive-UTC timezones.
 * Fix: append T00:00:00 to force local-time parsing before converting.
 */
// async function createCalendarEvent(params: {
//   userId: string;
//   title: string;
//   description: string;
//   start_date: string;     // "YYYY-MM-DD" from date input
//   location: string;
//   event_type: string;
// }): Promise<{ error: string | null }> {
//   // "YYYY-MM-DDT00:00:00" → parsed as local time → correct ISO string
//   const isoDate = new Date(`${params.start_date}T00:00:00`).toISOString();

//   const { error } = await supabase.from('calendar_events').insert({
//     created_by:  params.userId,           // = auth.uid() — satisfies RLS INSERT
//     title:       params.title.trim(),
//     description: params.description.trim() || null,
//     start_date:  isoDate,
//     location:    params.location.trim() || null,
//     event_type:  params.event_type || 'Other',
//   });

//   return { error: error?.message ?? null };
// }

// ─── Normalize to UnifiedDuty ─────────────────────────────────────────────────

async function createCalendarEvent(params: {
  userId: string;
  title: string;
  description: string;
  start_date: string; // from UI input
  location: string;
}) {
  const isoDate = new Date(`${params.start_date}T00:00:00`).toISOString();

  const { error } = await supabase.from('calendar_events').insert({
    created_by: params.userId,
    title: params.title,
    description: params.description,
    start_at: isoDate,
    end_at: null,
    location: params.location,
  });

  return { error: error?.message ?? null };
}

function normalizeEvents(events: CalendarEvent[]): UnifiedDuty[] {
  return events.map(ev => ({
    id:       ev.id,
    type:     (ev.event_type as DutyType) ?? 'Event',
    title:    ev.title,
    date:      ev.start_at ? isoToDate(ev.start_at) : todayStr(),
    // end_at is a datetime (YYYY-MM-DDTHH:MM:SS), not a date — store as endDate, not endTime
    endDate:  ev.end_at ? isoToDate(ev.end_at) : undefined,
    location: ev.location,
    note:     ev.description,
    status:   'scheduled',
    raw:      ev,
  }));
}

function normalizeTasks(tasks: StaffTask[], currentUserId: string): UnifiedDuty[] {
  return tasks
    .filter(t => t.due_date)
    .map(t => ({
      id:             t.id,
      type:           'Task' as DutyType,
      title:          t.title,
      date:           t.due_date ? isoToDate(t.due_date) : todayStr(),
      note:           t.description,
      status:         t.status,
      priority:       t.priority,
      // Flag tasks this user assigned to others so UI can show "assigned by you"
      isAssignedByMe: t.assigned_by === currentUserId && t.assigned_to !== currentUserId,
      raw:            t,
    }));
}

function normalizeBusTrips(trips: BusTripStatus[]): UnifiedDuty[] {
  return trips.map(trip => ({
    id:        trip.id,
    type:      'Bus Duty' as DutyType,
    title:     `Bus Route ${trip.route?.code ?? '—'}`,
    date:      trip.trip_date ? isoToDate(trip.trip_date) : todayStr(),
    // departure_time and arrival_time are Postgres time values "HH:MM:SS" — correct for formatTime()
    startTime: trip.route?.departure_time,
    endTime:   trip.route?.arrival_time,
    location:  `Route ${trip.route?.code ?? ''}`,
    note:      trip.notes,
    status:    trip.status,
    raw:       trip,
  }));
}

// ─── DutyCard ─────────────────────────────────────────────────────────────────

function DutyCard({ duty }: { duty: UnifiedDuty }) {
  const meta  = TYPE_META[duty.type] ?? TYPE_META['Other'];
  const Icon  = meta.icon;
  const past  = isPast(duty.date);
  const today = isToday(duty.date);

  return (
    <div className={`relative rounded-2xl border p-4 transition-all hover:shadow-md ${
      past  ? 'opacity-60 bg-slate-50 border-slate-100' :
      today ? 'border-indigo-300 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-200' :
              'bg-white border-slate-200 hover:border-slate-300'
    }`}>
      {today && (
        <span className="absolute -top-2.5 left-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider">
          TODAY
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">

          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
            <Icon className={`h-4 w-4 ${meta.color}`} />
          </div>

          <div className="min-w-0 flex-1">
            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                {duty.type}
              </span>
              {duty.isAssignedByMe && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Assigned by you
                </span>
              )}
              {duty.priority && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[duty.priority] ?? PRIORITY_BADGE['low']}`}>
                  {duty.priority}
                </span>
              )}
              {duty.status && duty.status !== 'scheduled' && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[duty.status] ?? STATUS_BADGE['pending']}`}>
                  {duty.status.replace('_', ' ')}
                </span>
              )}
            </div>

            <p className="font-semibold text-slate-800 text-sm mt-1.5 truncate">{duty.title}</p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDisplayDate(duty.date)}
                {/* Show end date only for multi-day events */}
                {duty.endDate && duty.endDate !== duty.date && (
                  <> → {formatDisplayDate(duty.endDate)}</>
                )}
              </span>

              {/* startTime/endTime are time strings (bus routes) */}
              {(duty.startTime || duty.endTime) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {duty.startTime && formatTime(duty.startTime)}
                  {duty.startTime && duty.endTime && ' – '}
                  {duty.endTime && formatTime(duty.endTime)}
                </span>
              )}

              {duty.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {duty.location}
                </span>
              )}
            </div>

            {duty.note && (
              <p className="text-xs text-slate-400 mt-1.5 italic line-clamp-2">{duty.note}</p>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 mt-0.5">
          {past
            ? <CheckCircle className="h-5 w-5 text-emerald-400" />
            : <div className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />}
        </div>
      </div>
    </div>
  );
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ year, month, duties, onChangeMonth }: {
  year: number;
  month: number;
  duties: UnifiedDuty[];
  onChangeMonth: (delta: number) => void;
}) {
  const days     = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today    = todayStr();
  const dutyDates = new Set(duties.map(d => d.date));

  const MONTHS   = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
  const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onChangeMonth(-1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
        >
          <ChevronLeft className="h-4 w-4 text-slate-600" />
        </button>
        <span className="text-sm font-semibold text-slate-800">{MONTHS[month]} {year}</span>
        <button
          onClick={() => onChangeMonth(1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
        >
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
          if (day === null) return <div key={`empty-${idx}`} />;
          const mm      = String(month + 1).padStart(2, '0');
          const dd      = String(day).padStart(2, '0');
          const dateStr = `${year}-${mm}-${dd}`;
          const hasDuty = dutyDates.has(dateStr);
          const isT     = dateStr === today;

          return (
            <div
              key={dateStr}
              className={`relative aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${
                isT      ? 'bg-indigo-600 text-white font-bold' :
                hasDuty  ? 'bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100' :
                           'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {day}
              {hasDuty && !isT && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AddEventModal ────────────────────────────────────────────────────────────

function AddEventModal({ userId, onClose, onCreated }: {
  userId: string;   // currentUser.id from public.users = auth.uid()
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    title: '', description: '', start_date: todayStr(),
    location: '', type : 'Event',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    if (!form.start_date)   { setErr('Date is required.');  return; }

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Add Personal Reminder</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg transition"
          >
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
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Title *</label>
            <input
              autoFocus
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Staff meeting, Exam invigilation..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Date *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Type</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                {(['Event','Exam','Front Desk','Library','Other'] as const).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Location</label>
            <input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. Hall A, Admin Block..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Notes</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
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
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-xl transition flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Add Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffCalendarPage() {
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [duties, setDuties]           = useState<UnifiedDuty[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [typeFilter, setTypeFilter]   = useState<'all' | DutyType>('all');
  const [timeFilter, setTimeFilter]   = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [showModal, setShowModal]     = useState(false);
  const [calYear, setCalYear]         = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]       = useState(new Date().getMonth());

  /**
   * Load all three data sources in parallel.
   * Each fetch is independently safe — a single source error won't
   * wipe out the others (Promise.allSettled vs Promise.all).
   * userId = currentUser.id = auth.uid() (synced) — passed to each query.
   */
  const loadAll = useCallback(async (uid: string, quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);

    const [evResult, taskResult, busResult] = await Promise.allSettled([
      fetchCalendarEvents(uid),
      fetchStaffTasks(uid),
      fetchBusTripStatus(uid),
    ]);

    const events   = evResult.status   === 'fulfilled' ? evResult.value   : [];
    const tasks    = taskResult.status === 'fulfilled' ? taskResult.value : [];
    const busTrips = busResult.status  === 'fulfilled' ? busResult.value  : [];

    if (evResult.status   === 'rejected') console.error('[loadAll] events:',   evResult.reason);
    if (taskResult.status === 'rejected') console.error('[loadAll] tasks:',    taskResult.reason);
    if (busResult.status  === 'rejected') console.error('[loadAll] busTrips:', busResult.reason);

    const all: UnifiedDuty[] = [
      ...normalizeEvents(events),
      ...normalizeTasks(tasks, uid),          // uid needed to flag isAssignedByMe
      ...normalizeBusTrips(busTrips),
    ].sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.localeCompare(b.date);
          });

    setDuties(all);
    quiet ? setRefreshing(false) : setLoading(false);
  }, []);

  useEffect(() => {
    getCurrentUser().then(u => {
      setCurrentUser(u);
      if (u) loadAll(u.id);
    });
  }, [loadAll]);

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
  const today        = todayStr();
  const todayDuties  = duties.filter(d => d.date === today);
  const filtered     = duties.filter(d => {
    const typeOk = typeFilter === 'all' || d.type === typeFilter;
    const timeOk =
      timeFilter === 'all'      ? true :
      timeFilter === 'upcoming' ? isUpcoming(d.date) :
                                  isPast(d.date);
    return typeOk && timeOk;
  });

  // ── Loading screen ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="relative bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #6366f1 0%, transparent 50%), radial-gradient(circle at 20% 80%, #0ea5e9 0%, transparent 50%)' }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-indigo-300 text-xs font-semibold tracking-widest uppercase mb-1">
              {currentUser?.full_name ?? 'Staff'}
            </p>
            <h1 className="text-2xl text-white font-bold">My Calendar & Duties</h1>
            <p className="text-slate-300 text-sm mt-1">
              Duties, tasks, bus routes and personal reminders — all in one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => currentUser && loadAll(currentUser.id, true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-xl transition shadow-lg"
            >
              <Plus className="h-4 w-4" /> Add Reminder
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Duties", value: todayDuties.length,                           icon: Bell,      color: 'text-indigo-600 bg-indigo-50', border: 'border-indigo-100' },
          { label: 'Upcoming',       value: duties.filter(d => isUpcoming(d.date)).length, icon: Calendar,  color: 'text-sky-600 bg-sky-50',       border: 'border-sky-100'    },
          { label: 'Tasks',          value: duties.filter(d => d.type === 'Task').length,  icon: Clipboard, color: 'text-violet-600 bg-violet-50', border: 'border-violet-100' },
          { label: 'Total Entries',  value: duties.length,                                 icon: Tag,       color: 'text-slate-600 bg-slate-50',   border: 'border-slate-200'  },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl border ${s.border} p-4 shadow-sm flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-5">

        {/* ─ Left column ─ */}
        <div className="space-y-4">

          <MiniCalendar
            year={calYear}
            month={calMonth}
            duties={duties}
            onChangeMonth={handleChangeMonth}
          />

          {/* Legend — only shows types that have at least 1 entry */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Legend</p>
            <div className="space-y-2">
              {(Object.entries(TYPE_META) as [DutyType, typeof TYPE_META[DutyType]][]).map(([type, meta]) => {
                const count = duties.filter(d => d.type === type).length;
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
              {duties.length === 0 && (
                <p className="text-xs text-slate-400 italic">No entries yet</p>
              )}
            </div>
          </div>

          {/* Today panel */}
          {todayDuties.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" /> Today
              </p>
              <div className="space-y-2">
                {todayDuties.map(d => {
                  const meta = TYPE_META[d.type] ?? TYPE_META['Other'];
                  return (
                    <div key={d.id} className="flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${meta.dot}`} />
                      <div>
                        <p className="text-xs font-semibold text-indigo-900 leading-tight">{d.title}</p>
                        {d.startTime && (
                          <p className="text-[10px] text-indigo-500">{formatTime(d.startTime)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─ Right column ─ */}
        <div className="space-y-4">

          {/* Filter bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Filter className="h-3.5 w-3.5" /> Filters
            </div>

            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {(['upcoming', 'past', 'all'] as const).map(f => (
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
              value={typeFilter}
              onChange={e => setTypeFilter(
                e.target.value === 'all' ? 'all' : e.target.value as DutyType
              )}
              className="flex-1 sm:max-w-[180px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            >
              {DUTY_TYPES.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
              ))}
            </select>

            <span className="text-xs text-slate-400 sm:ml-auto">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Duty list */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
                <AlertCircle className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-sm">No duties found</p>
                <p className="text-slate-400 text-xs mt-1">
                  {typeFilter !== 'all' || timeFilter !== 'all'
                    ? 'Try adjusting your filters.'
                    : 'Your schedule is clear.'}
                </p>
              </div>
            ) : (
              filtered.map(duty => <DutyCard key={duty.id} duty={duty} />)
            )}
          </div>
        </div>
      </div>

      {/* ── Add Reminder Modal ── */}
      {showModal && currentUser && (
        <AddEventModal
          userId={currentUser.id}           // public.users.id = auth.uid() — satisfies RLS INSERT
          onClose={() => setShowModal(false)}
          onCreated={() => loadAll(currentUser.id, true)}
        />
      )}
    </div>
  );
}