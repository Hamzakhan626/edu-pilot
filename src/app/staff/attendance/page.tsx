"use client";
import { useEffect, useState, useCallback } from "react";

import {
  Users,
  Bus,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  RefreshCw,
  Clock,
  UserX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/lib/auth";


// ─── Types ────────────────────────────────────────────────────────────────────
type AttendanceStatus = "Present" | "Absent" | "Leave" | "OnDuty";
type AttendanceMode = "On-campus" | "Remote" | "Bus Duty";

interface StaffAttendanceRow {
  id: string;
  user_id: string;
  date: string;
  shift: string;
  status: AttendanceStatus;
  mode: AttendanceMode;
  notes: string | null;
  users: {
    id: string;
    full_name: string | null;
    name: string | null;
    role: string | null;
    employee_id: string | null;
  } | null;
}

interface SummaryStats {
  present: number;
  onDuty: number;
  onLeave: number;
  absent: number;
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function getStatusConfig(s: AttendanceStatus) {
  const map: Record<
    AttendanceStatus,
    { pill: string; dot: string; label: string }
  > = {
    Present: {
      pill: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      dot: "bg-emerald-500",
      label: "Present",
    },
    OnDuty: {
      pill: "bg-sky-50 text-sky-700 border border-sky-200",
      dot: "bg-sky-500",
      label: "On Duty",
    },
    Leave: {
      pill: "bg-amber-50 text-amber-700 border border-amber-200",
      dot: "bg-amber-400",
      label: "Leave",
    },
    Absent: {
      pill: "bg-red-50 text-red-700 border border-red-200",
      dot: "bg-red-500",
      label: "Absent",
    },
  };
  return map[s] ?? map.Absent;
}

function getModeIcon(mode: AttendanceMode) {
  if (mode === "Bus Duty") return <Bus className="h-3.5 w-3.5 text-sky-500" />;
  if (mode === "Remote") return <Wifi className="h-3.5 w-3.5 text-violet-500" />;
  return <Users className="h-3.5 w-3.5 text-slate-400" />;
}

function getDisplayName(row: StaffAttendanceRow): string {
  return (
    row.users?.full_name ||
    row.users?.name ||
    "Unknown Staff"
  );
}

function getEmployeeId(row: StaffAttendanceRow): string {
  return row.users?.employee_id || row.user_id.slice(0, 8).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function StaffAttendancePage() {
  const [records, setRecords] = useState<StaffAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Fetch ──
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      /**
       * QUERY EXPLANATION:
       * - Select all staff_attendance rows for the chosen date
       * - Join users to get name, role, employee_id
       * - RLS on staff_attendance automatically filters to:
       *     • the logged-in staff member's own row, OR
       *     • all rows if the user has admin/hr role
       */
      const { data, error: fetchError } = await supabase
        .from("staff_attendance")
       .select(`
                    id,
                    user_id,
                    date,
                    shift,
                    status,
                    mode,
                    notes,
                    users!staff_attendance_user_id_fkey (
                      id,
                      full_name,
                      role
                      
                    )
                  `)
        .eq("date", selectedDate)
        .order("date", { ascending: false });

      if (fetchError) throw fetchError;

      setRecords(((data as unknown) as StaffAttendanceRow[]) ?? []);
      // setLastRefreshed(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load attendance";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);
     useEffect(() => {
      setLastRefreshed(new Date());
      }, []); 
  // ── Real-time subscription ──
  useEffect(() => {
    const channel = supabase
      .channel("staff_attendance_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff_attendance",
          filter: `date=eq.${selectedDate}`,
        },
        () => {
          fetchAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, fetchAttendance]);

  // ── Derived stats ──
  const stats: SummaryStats = {
    present: records.filter((r) => r.status === "Present").length,
    onDuty: records.filter((r) => r.status === "OnDuty").length,
    onLeave: records.filter((r) => r.status === "Leave").length,
    absent: records.filter((r) => r.status === "Absent").length,
    total: records.length,
  };

  // ── Client-side filter + search ──
  const filtered = records.filter((r) => {
    const matchesStatus =
      statusFilter === "all" || r.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const name = getDisplayName(r).toLowerCase();
    const empId = getEmployeeId(r).toLowerCase();
    const role = (r.users?.role ?? "").toLowerCase();
    const matchesSearch =
      !q ||
      name.includes(q) ||
      empId.includes(q) ||
      role.includes(q);
    return matchesStatus && matchesSearch;
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-5">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 p-6 text-white shadow-xl">
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl text-white  font-bold tracking-tight">
              Staff Attendance
            </h1>
            <p className="mt-0.5 text-sm text-emerald-100">
              Daily overview · presence, leave & bus duties
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Date picker */}
            <input
              type="date"
              value={selectedDate}
              max={todayISO()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white placeholder-white/60 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/40"
            />

            {/* Refresh button */}
            <button
              onClick={fetchAttendance}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* last refreshed */}
        <p className="relative mt-3 text-xs text-emerald-200">
          Last updated:{" "}
           {lastRefreshed
    ? lastRefreshed.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "--:--"}
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Present",
            value: stats.present,
            icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            text: "text-emerald-700",
          },
          {
            label: "On Bus Duty",
            value: stats.onDuty,
            icon: <Bus className="h-5 w-5 text-sky-500" />,
            bg: "bg-sky-50",
            border: "border-sky-100",
            text: "text-sky-700",
          },
          {
            label: "On Leave",
            value: stats.onLeave,
            icon: <Clock className="h-5 w-5 text-amber-500" />,
            bg: "bg-amber-50",
            border: "border-amber-100",
            text: "text-amber-700",
          },
          {
            label: "Absent",
            value: stats.absent,
            icon: <UserX className="h-5 w-5 text-red-400" />,
            bg: "bg-red-50",
            border: "border-red-100",
            text: "text-red-600",
          },
        ].map(({ label, value, icon, bg, border, text }) => (
          <div
            key={label}
            className={`flex items-center justify-between rounded-xl border ${border} ${bg} p-4 shadow-sm`}
          >
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`mt-0.5 text-2xl font-bold ${text}`}>
                {loading ? (
                  <span className="inline-block h-6 w-8 animate-pulse rounded bg-slate-200" />
                ) : (
                  value
                )}
              </p>
            </div>
            {icon}
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID or role…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value === "all"
                    ? "all"
                    : (e.target.value as AttendanceStatus)
                )
              }
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All Statuses</option>
              <option value="Present">Present</option>
              <option value="OnDuty">On Duty</option>
              <option value="Leave">Leave</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        {(statusFilter !== "all" || searchQuery) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Status: {statusFilter}
                <button
                  onClick={() => setStatusFilter("all")}
                  className="ml-0.5 text-emerald-500 hover:text-emerald-800"
                >
                  ×
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                Search: &quot;{searchQuery}&quot;
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-0.5 text-slate-400 hover:text-slate-700"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Attendance list ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* list header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">
              Attendance · {formatDate(selectedDate)}
            </span>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {filtered.length} of {stats.total}
          </span>
        </div>

        <div className="divide-y divide-slate-50 px-5">
          {/* Loading skeleton */}
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3.5">
                <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
                  <div className="h-2.5 w-28 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <WifiOff className="h-8 w-8 text-red-300" />
              <p className="text-sm font-medium text-red-600">
                Failed to load attendance
              </p>
              <p className="text-xs text-slate-500">{error}</p>
              <button
                onClick={fetchAttendance}
                className="mt-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertCircle className="h-7 w-7 text-slate-300" />
              <p className="text-sm text-slate-500">
                {records.length === 0
                  ? "No attendance records for this date."
                  : "No records match your filters."}
              </p>
              {(statusFilter !== "all" || searchQuery) && (
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                  className="mt-1 text-xs text-emerald-600 underline-offset-2 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Records */}
          {!loading &&
            !error &&
            filtered.map((r) => {
              const cfg = getStatusConfig(r.status);
              const name = getDisplayName(r);
              const empId = getEmployeeId(r);
              const initials = name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase();

              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold text-white shadow-sm">
                      {initials}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {name}
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          #{empId}
                        </span>
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span>{r.users?.role ?? "Staff"}</span>
                        <span className="text-slate-300">·</span>
                        <span>{r.shift} shift</span>
                        <span className="text-slate-300">·</span>
                        <span className="flex items-center gap-0.5">
                          {getModeIcon(r.mode)} {r.mode}
                        </span>
                      </div>
                      {r.notes && (
                        <p className="mt-0.5 text-[11px] italic text-slate-400">
                          {r.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status pill */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${cfg.pill}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                      />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Footer note ── */}
      <p className="text-center text-[11px] text-slate-400">
        Data is live · updates in real-time via Supabase Realtime
      </p>
    </div>
  );
}