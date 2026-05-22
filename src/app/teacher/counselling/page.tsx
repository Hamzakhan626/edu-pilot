/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock,
  Plus,
  Trash2,
  Edit3,
  MapPin,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  X,
  BookOpen,
  TrendingUp,
  Video,
  Building2,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import supabase from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type SlotDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
type SlotMode = "on_campus" | "online";
type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

interface CounsellingSlot {
  id: string;
  teacher_id: string;
  day_of_week: SlotDay;
  start_time: string; // "HH:MM"
  end_time: string;
  location: string;
  mode: SlotMode;
  capacity: number;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

interface SlotBooking {
  id: string;
  slot_id: string;
  student_id: string;
  status: BookingStatus;
  topic?: string;
  booked_at?: string;
  student?: {
    full_name: string;
    email: string;
    enrollment_number?: string;
  };
}

interface SlotWithBookings extends CounsellingSlot {
  bookings: SlotBooking[];
  booked_count: number;
}

interface SlotFormData {
  day_of_week: SlotDay;
  start_time: string;
  end_time: string;
  location: string;
  mode: SlotMode;
  capacity: string;
  notes: string;
}

const DEFAULT_FORM: SlotFormData = {
  day_of_week: "Monday",
  start_time: "10:00",
  end_time: "11:00",
  location: "",
  mode: "on_campus",
  capacity: "8",
  notes: "",
};

const DAYS: SlotDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DAY_SHORT: Record<SlotDay, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
};

const DAY_COLOR: Record<SlotDay, { bg: string; text: string; border: string; accent: string }> = {
  Monday:    { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200", accent: "bg-violet-500" },
  Tuesday:   { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200",    accent: "bg-sky-500"    },
  Wednesday: { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",   accent: "bg-teal-500"   },
  Thursday:  { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",  accent: "bg-amber-500"  },
  Friday:    { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",   accent: "bg-rose-500"   },
  Saturday:  { bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200",  accent: "bg-slate-400"  },
};

const BOOKING_STATUS: Record<BookingStatus, { label: string; color: string; dot: string }> = {
  pending:   { label: "Pending",   color: "text-amber-700 bg-amber-50 border-amber-200",   dot: "bg-amber-400"  },
  confirmed: { label: "Confirmed", color: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "text-slate-500 bg-slate-100 border-slate-200",  dot: "bg-slate-400"  },
  completed: { label: "Completed", color: "text-blue-700 bg-blue-50 border-blue-200",      dot: "bg-blue-500"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt12(time: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function utilColour(pct: number) {
  if (pct >= 90) return "text-red-600";
  if (pct >= 70) return "text-amber-600";
  return "text-emerald-600";
}

function utilBarColour(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-400";
  return "bg-emerald-500";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeacherCounsellingHours() {
  const [userId, setUserId] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotWithBookings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<CounsellingSlot | null>(null);
  const [form, setForm] = useState<SlotFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [filterDay, setFilterDay] = useState<"all" | SlotDay>("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadSlots = useCallback(async (uid: string) => {
    try {
      const { data: slotData, error: slotErr } = await supabase
        .from("counselling_slots")
        .select("*")
        .eq("teacher_id", uid)
        .order("day_of_week")
        .order("start_time");

      if (slotErr) throw slotErr;

      if (!slotData || slotData.length === 0) {
        setSlots([]);
        return;
      }

      const slotIds = slotData.map((s: CounsellingSlot) => s.id);

      const { data: bookingData, error: bookErr } = await supabase
        .from("counselling_bookings")
        .select(`
          id, slot_id, student_id, status, topic, booked_at,
          users!counselling_bookings_student_id_fkey(full_name, email, enrollment_number)
        `)
        .in("slot_id", slotIds)
        .in("status", ["pending", "confirmed"]);

      if (bookErr) throw bookErr;

      const bookingsMap: Record<string, SlotBooking[]> = {};
      (bookingData || []).forEach((b: any) => {
        const booking: SlotBooking = {
          id: b.id,
          slot_id: b.slot_id,
          student_id: b.student_id,
          status: b.status,
          topic: b.topic,
          booked_at: b.booked_at,
          student: b.users
            ? {
                full_name: b.users.full_name,
                email: b.users.email,
                enrollment_number: b.users.enrollment_number,
              }
            : undefined,
        };
        if (!bookingsMap[b.slot_id]) bookingsMap[b.slot_id] = [];
        bookingsMap[b.slot_id].push(booking);
      });

      const enriched: SlotWithBookings[] = slotData.map((s: CounsellingSlot) => ({
        ...s,
        bookings: bookingsMap[s.id] || [],
        booked_count: (bookingsMap[s.id] || []).length,
      }));

      setSlots(enriched);
    } catch (err: any) {
      setError(err.message || "Failed to load counselling slots");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Not authenticated"); return; }
        setUserId(user.id);
        await loadSlots(user.id);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadSlots]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingSlot(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (slot: CounsellingSlot) => {
    setEditingSlot(slot);
    setForm({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      location: slot.location,
      mode: slot.mode,
      capacity: slot.capacity.toString(),
      notes: slot.notes || "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setFormError(null);
    setSaving(true);

    try {
      const cap = parseInt(form.capacity);
      if (isNaN(cap) || cap < 1) { setFormError("Capacity must be at least 1"); return; }
      if (form.start_time >= form.end_time) { setFormError("End time must be after start time"); return; }
      if (!form.location.trim()) { setFormError("Location is required"); return; }

      const payload = {
        teacher_id: userId,
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        location: form.location.trim(),
        mode: form.mode,
        capacity: cap,
        notes: form.notes.trim() || null,
        is_active: true,
      };

      if (editingSlot) {
        const { error } = await supabase
          .from("counselling_slots")
          .update(payload)
          .eq("id", editingSlot.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("counselling_slots")
          .insert([payload]);
        if (error) throw error;
      }

      await loadSlots(userId);
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to save slot");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (slot: CounsellingSlot) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("counselling_slots")
        .update({ is_active: !slot.is_active })
        .eq("id", slot.id);
      if (error) throw error;
      await loadSlots(userId);
    } catch (err: any) {
      alert(`Failed to update slot: ${err.message}`);
    }
  };

  const handleDelete = async (slotId: string) => {
    if (!userId) return;
    if (!confirm("Delete this counselling slot? Students with bookings will be notified.")) return;
    try {
      const { error } = await supabase
        .from("counselling_slots")
        .delete()
        .eq("id", slotId);
      if (error) throw error;
      setSlots(prev => prev.filter(s => s.id !== slotId));
      if (expandedSlot === slotId) setExpandedSlot(null);
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleBookingStatus = async (bookingId: string, newStatus: BookingStatus) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("counselling_bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);
      if (error) throw error;
      await loadSlots(userId);
    } catch (err: any) {
      alert(`Failed to update booking: ${err.message}`);
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────

  const activeSlots = slots.filter(s => s.is_active);
  const totalCapacity = activeSlots.reduce((s, sl) => s + sl.capacity, 0);
  const totalBooked = activeSlots.reduce((s, sl) => s + sl.booked_count, 0);
  const overallUtil = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;
  const totalWeeklyHours = activeSlots.reduce((s, sl) => {
    const [sh, sm] = sl.start_time.split(":").map(Number);
    const [eh, em] = sl.end_time.split(":").map(Number);
    return s + (eh * 60 + em - sh * 60 - sm) / 60;
  }, 0);

  const filtered = slots.filter(s => {
    if (filterDay !== "all" && s.day_of_week !== filterDay) return false;
    if (filterActive === "active" && !s.is_active) return false;
    if (filterActive === "inactive" && s.is_active) return false;
    return true;
  });

  // ── Group by day for the weekly overview ──────────────────────────────────
  const byDay: Partial<Record<SlotDay, SlotWithBookings[]>> = {};
  filtered.forEach(s => {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = [];
    byDay[s.day_of_week]!.push(s);
  });
  const orderedDays = DAYS.filter(d => byDay[d]);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface-bg, #f8f7f4)" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500 font-medium">Loading your counselling schedule…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-800 mb-1">Something went wrong</p>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen  font-[system-ui]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-slate-900 tracking-tight leading-tight">Counselling Hours</h1>
              <p className="text-[11px] text-slate-400">Manage your student consultation schedule</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-600 rounded-xl hover:opacity-90 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Slot
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Active Slots",
              value: activeSlots.length,
              sub: `${slots.length} total defined`,
              icon: <Calendar className="w-4 h-4" />,
              accent: "from-violet-500 to-indigo-500",
            },
            {
              label: "Weekly Hours",
              value: `${totalWeeklyHours % 1 === 0 ? totalWeeklyHours : totalWeeklyHours.toFixed(1)}h`,
              sub: "available each week",
              icon: <Clock className="w-4 h-4" />,
              accent: "from-sky-400 to-blue-500",
            },
            {
              label: "Booked / Capacity",
              value: `${totalBooked}/${totalCapacity}`,
              sub: `${overallUtil}% utilisation`,
              icon: <Users className="w-4 h-4" />,
              accent: "from-teal-400 to-emerald-500",
            },
            {
              label: "Utilisation",
              value: `${overallUtil}%`,
              sub: overallUtil >= 85 ? "⚠ High demand" : overallUtil >= 60 ? "Moderate" : "Comfortable",
              icon: <TrendingUp className="w-4 h-4" />,
              accent: overallUtil >= 85 ? "from-red-400 to-rose-500" : "from-amber-400 to-orange-400",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm overflow-hidden relative">
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${stat.accent}`} />
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${stat.accent} flex items-center justify-center text-white mb-3`}>
                {stat.icon}
              </div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 leading-none mb-1">{stat.value}</p>
              <p className="text-[11px] text-slate-500">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">Day:</span>
          {(["all", ...DAYS] as const).map(d => (
            <button
              key={d}
              onClick={() => setFilterDay(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all
                ${filterDay === d
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
            >
              {d === "all" ? "All Days" : DAY_SHORT[d]}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            {(["all", "active", "inactive"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterActive(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize
                  ${filterActive === s
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Empty state ── */}
        {slots.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No counselling slots yet</h3>
            <p className="text-sm text-slate-400 max-w-xs mb-5">
              Set up your weekly availability so students can book time with you.
            </p>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-600 rounded-xl hover:opacity-90 transition shadow"
            >
              <Plus className="w-4 h-4" /> Create First Slot
            </button>
          </div>
        )}

        {/* ── Slots grouped by day ── */}
        {orderedDays.map(day => {
          const daySlots = byDay[day]!;
          const cfg = DAY_COLOR[day];
          return (
            <div key={day}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                  {day}
                </div>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">{daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="space-y-3">
                {daySlots.map(slot => {
                  const util = slot.capacity > 0 ? Math.round((slot.booked_count / slot.capacity) * 100) : 0;
                  const isExpanded = expandedSlot === slot.id;

                  return (
                    <div
                      key={slot.id}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
                        ${!slot.is_active ? "opacity-60 border-slate-100" : "border-slate-100 hover:shadow-md"}`}
                    >
                      {/* Left accent bar */}
                      <div className="flex">
                        <div className={`w-1 flex-shrink-0 ${cfg.accent}`} />
                        <div className="flex-1 p-4">

                          {/* Slot header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                {/* Time */}
                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {fmt12(slot.start_time)} – {fmt12(slot.end_time)}
                                </div>
                                {/* Mode badge */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border
                                  ${slot.mode === "online"
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}>
                                  {slot.mode === "online"
                                    ? <Video className="w-3 h-3" />
                                    : <Building2 className="w-3 h-3" />
                                  }
                                  {slot.mode === "online" ? "Online" : "On-campus"}
                                </span>
                                {/* Active/Inactive */}
                                {slot.is_active ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle className="w-3 h-3" /> Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                    <XCircle className="w-3 h-3" /> Inactive
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {slot.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {slot.booked_count}/{slot.capacity} booked
                                </span>
                                {slot.notes && (
                                  <span className="italic truncate max-w-[200px]">{slot.notes}</span>
                                )}
                              </div>

                              {/* Utilisation bar */}
                              <div className="mt-3 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${utilBarColour(util)}`}
                                    style={{ width: `${util}%` }}
                                  />
                                </div>
                                <span className={`text-[11px] font-bold w-8 text-right ${utilColour(util)}`}>
                                  {util}%
                                </span>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => openEdit(slot)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit slot"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(slot)}
                                className={`p-1.5 rounded-lg transition-colors
                                  ${slot.is_active
                                    ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                    : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                title={slot.is_active ? "Deactivate slot" : "Activate slot"}
                              >
                                {slot.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleDelete(slot.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1"
                                title="View bookings"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* ── Expanded bookings panel ── */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                                Student Bookings ({slot.bookings.length})
                              </p>
                              {slot.bookings.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No active bookings for this slot.</p>
                              ) : (
                                <div className="space-y-2">
                                  {slot.bookings.map(b => {
                                    const statusCfg = BOOKING_STATUS[b.status];
                                    return (
                                      <div
                                        key={b.id}
                                        className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[10px] font-black text-indigo-600">
                                              {b.student?.full_name?.charAt(0) || "S"}
                                            </span>
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-800 truncate">
                                              {b.student?.full_name || "Student"}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate">
                                              {b.student?.enrollment_number
                                                ? `#${b.student.enrollment_number} · `
                                                : ""}
                                              {b.topic || "No topic specified"}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                            {statusCfg.label}
                                          </span>
                                          {b.status === "pending" && (
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => handleBookingStatus(b.id, "confirmed")}
                                                className="px-2 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                                              >
                                                Confirm
                                              </button>
                                              <button
                                                onClick={() => handleBookingStatus(b.id, "cancelled")}
                                                className="px-2 py-1 text-[10px] font-bold bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition"
                                              >
                                                Decline
                                              </button>
                                            </div>
                                          )}
                                          {b.status === "confirmed" && (
                                            <button
                                              onClick={() => handleBookingStatus(b.id, "completed")}
                                              className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                            >
                                              Mark Done
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* No results after filter */}
        {slots.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <p className="text-slate-500 text-sm">No slots match the selected filters.</p>
          </div>
        )}

        {/* Bottom note */}
        <p className="text-center text-[11px] text-slate-400 pb-2">
          Inactive slots are hidden from students. Delete only if no upcoming bookings exist.
        </p>
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal gradient top */}
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-indigo-500" />

            <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {editingSlot ? "Edit Counselling Slot" : "New Counselling Slot"}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {editingSlot ? "Update your slot details" : "Add a new weekly availability slot"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Day */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Day of Week</label>
                <div className="grid grid-cols-3 gap-2">
                  {DAYS.map(d => {
                    const cfg = DAY_COLOR[d];
                    const active = form.day_of_week === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setForm({ ...form, day_of_week: d })}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all
                          ${active
                            ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        {DAY_SHORT[d]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={e => setForm({ ...form, start_time: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={e => setForm({ ...form, end_time: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Room CS-205 or Zoom link"
                  required
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
                />
              </div>

              {/* Mode + Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mode</label>
                  <select
                    value={form.mode}
                    onChange={e => setForm({ ...form, mode: e.target.value as SlotMode })}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
                  >
                    <option value="on_campus">On-campus</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Max Students</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={form.capacity}
                    onChange={e => setForm({ ...form, capacity: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Bring your assignment draft, preferred topics…"
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-600 rounded-xl hover:opacity-90 disabled:opacity-60 transition shadow"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {editingSlot ? "Update Slot" : "Create Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}