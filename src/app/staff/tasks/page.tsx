'use client';
import { useEffect, useState, useCallback } from 'react';

import {
  ClipboardCheck,
  AlertCircle,
  Filter,
  Search,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Clock,
  PauseCircle,
  Circle,
  Tag,
  Layers,
} from 'lucide-react';
import { supabase } from '@/lib/auth';


// ─── Types ────────────────────────────────────────────────────────────────────
type TaskStatus = 'NotStarted' | 'InProgress' | 'Completed' | 'OnHold';
type TaskCategory = 'Student' | 'Exam' | 'Finance' | 'General';

interface StaffTask {
  id: string;
  title: string;
  category: TaskCategory;
  due_date: string;
  status: TaskStatus;
  source: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isOverdue(due: string, status: TaskStatus) {
  if (status === 'Completed') return false;
  return new Date(due) < new Date();
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; icon: React.ReactNode; pill: string }
> = {
  NotStarted: {
    label: 'Not Started',
    icon: <Circle className="h-3.5 w-3.5" />,
    pill: 'bg-slate-100 text-slate-600 border border-slate-200',
  },
  InProgress: {
    label: 'In Progress',
    icon: <Clock className="h-3.5 w-3.5" />,
    pill: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  Completed: {
    label: 'Completed',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  OnHold: {
    label: 'On Hold',
    icon: <PauseCircle className="h-3.5 w-3.5" />,
    pill: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
};

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  Student: 'bg-violet-100 text-violet-700',
  Exam: 'bg-rose-100 text-rose-700',
  Finance: 'bg-teal-100 text-teal-700',
  General: 'bg-gray-100 text-gray-600',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function StaffTasksPage() {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TaskCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Fetch tasks for the logged-in user ──────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError('Not authenticated. Please log in.');
      setLoading(false);
      return;
    }

        const { data, error } = await supabase
        .from('staff_tasks')
        .select(`
          id,
          title,
          category,
          status,
          source,
          due_date,
          notes,
          created_at,
          assigned_by_user:users!assigned_by ( full_name )
        `)
        .eq('assigned_to', session.user.id)
        .order('due_date', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setTasks((data as StaffTask[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ── Inline status update ────────────────────────────────────────────────────
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setUpdatingId(null);
      return;
    }

    setUpdatingId(taskId);
    const { error: updateError } = await supabase
  .from('staff_tasks')
  .update({ status: newStatus })
  .eq('id', taskId)
  .eq('assigned_to', session.user.id); // extra safety check

    if (!updateError) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    }
    setUpdatingId(null);
  };

  // ── Derived counts ──────────────────────────────────────────────────────────
  const counts = {
    total: tasks.length,
    open: tasks.filter((t) => t.status === 'NotStarted' || t.status === 'InProgress').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    overdue: tasks.filter((t) => isOverdue(t.due_date, t.status)).length,
  };

  // ── Client-side filtering ───────────────────────────────────────────────────
  const filtered = tasks.filter((t) => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.source.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q);
    return matchStatus && matchCat && matchSearch;
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 p-6 md:p-8 text-white shadow-xl mb-6">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-xs font-semibold tracking-widest uppercase mb-1">Staff Portal</p>
            <h1 className="text-2xl text-white  md:text-3xl font-bold tracking-tight">My Tasks</h1>
            <p className="text-indigo-100 text-sm mt-1">Operational tasks &amp; follow-ups assigned to you</p>
          </div>
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-xl px-4 py-2 text-sm font-medium backdrop-blur-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Total Tasks', value: counts.total, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Open', value: counts.open, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: counts.completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Overdue', value: counts.overdue, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-medium">{card.label}</span>
            <span className={`text-2xl font-bold ${card.color}`}>{loading ? '—' : card.value}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 mb-6 flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks, source, category…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | TaskStatus)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="NotStarted">Not Started</option>
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="OnHold">On Hold</option>
          </select>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | TaskCategory)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="all">All Categories</option>
            <option value="Student">Student</option>
            <option value="Exam">Exam</option>
            <option value="Finance">Finance</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 mb-6 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Task List ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* List header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <ClipboardCheck className="h-5 w-5 text-indigo-500" />
          <h2 className="font-semibold text-gray-800">Task List</h2>
          <span className="ml-auto text-xs text-gray-400">
            {loading ? 'Loading…' : `${filtered.length} task${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-gray-50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-50 rounded w-1/3" />
                </div>
                <div className="h-6 w-20 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Task rows */}
        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {filtered.map((task) => {
              const overdue = isOverdue(task.due_date, task.status);
              const cfg = STATUS_CONFIG[task.status];

              return (
                <li
                  key={task.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-gray-50/60 transition-colors"
                >
                  {/* Category icon block */}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${CATEGORY_COLORS[task.category]}`}>
                    <Tag className="h-4 w-4" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                      <span className={`font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[task.category]}`}>
                        {task.category}
                      </span>
                      <span>{task.source}</span>
                      <span className={`flex items-center gap-1 ${overdue ? 'text-rose-500 font-medium' : ''}`}>
                        <Calendar className="h-3 w-3" />
                        {overdue ? 'Overdue · ' : 'Due: '}
                        {formatDate(task.due_date)}
                      </span>
                    </div>
                  </div>

                  {/* Status badge + inline update */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.pill}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>

                    {/* Quick status change */}
                    {task.status !== 'Completed' && (
                      <select
                        disabled={updatingId === task.id}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) handleStatusChange(task.id, e.target.value as TaskStatus);
                          e.target.value = '';
                        }}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 cursor-pointer"
                        title="Update status"
                      >
                        <option value="" disabled>Update</option>
                        {(['NotStarted', 'InProgress', 'OnHold', 'Completed'] as TaskStatus[])
                          .filter((s) => s !== task.status)
                          .map((s) => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                          ))}
                      </select>
                    )}

                    {updatingId === task.id && (
                      <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <ClipboardCheck className="h-7 w-7 text-indigo-400" />
            </div>
            <p className="text-gray-700 font-semibold">No tasks found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'You have no tasks assigned yet.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Footer note ── */}
      <p className="text-center text-xs text-gray-400 mt-6">
        Data is fetched live from Supabase · Filtered by your user session
      </p>
    </div>
  );
}