/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import {
  Plus,
  Trash2,
  Edit3,
  Briefcase,
  Download,
  Search,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  FileText,
  TrendingUp,
  Calendar,
  X,
  Loader2,
} from "lucide-react"
import supabase from "@/lib/supabase/client"

type HiringStatus = "pending" | "approved" | "rejected" | "on_hold" | "closed"
type RoleType = "faculty" | "staff" | "hod" | "hr" | "finance" | "other"
type EmploymentType = "full_time" | "part_time" | "contract"
type PriorityType = "low" | "normal" | "high" | "critical"

interface Department {
  id: string
  name: string
  code: string
}

interface HiringRequest {
  id: string
  title: string
  role_type: RoleType
  employment_type: EmploymentType
  description?: string
  qualifications?: string
  responsibilities?: string
  department_id?: string
  related_hod_id?: string
  related_faculty_id?: string
  positions_requested: number
  positions_approved: number
  min_salary?: number
  max_salary?: number
  status: HiringStatus
  priority: PriorityType
  requested_by?: string
  approved_by?: string
  approval_notes?: string
  rejection_reason?: string
  expected_joining_from?: string
  expected_joining_to?: string
  created_at?: string
  updated_at?: string
}

interface FormData {
  title: string
  role_type: RoleType
  employment_type: EmploymentType
  department_id: string
  priority: PriorityType
  positions_requested: string
  min_salary: string
  max_salary: string
  expected_joining_from: string
  expected_joining_to: string
  description: string
  qualifications: string
  responsibilities: string
}

const defaultForm: FormData = {
  title: "",
  role_type: "faculty",
  employment_type: "full_time",
  department_id: "",
  priority: "normal",
  positions_requested: "1",
  min_salary: "",
  max_salary: "",
  expected_joining_from: "",
  expected_joining_to: "",
  description: "",
  qualifications: "",
  responsibilities: "",
}

const STATUS_CONFIG: Record<HiringStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "Approved",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  on_hold: {
    label: "On Hold",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  closed: {
    label: "Closed",
    color: "text-slate-600",
    bg: "bg-slate-100 border-slate-200",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
}

const PRIORITY_CONFIG: Record<PriorityType, { label: string; dot: string }> = {
  low: { label: "Low", dot: "bg-slate-400" },
  normal: { label: "Normal", dot: "bg-blue-500" },
  high: { label: "High", dot: "bg-orange-500" },
  critical: { label: "Critical", dot: "bg-red-600" },
}

export default function TeacherHiring() {
  const [requests, setRequests] = useState<HiringRequest[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<"all" | HiringStatus>("all")

  const [showModal, setShowModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState<HiringRequest | null>(null)
  const [formData, setFormData] = useState<FormData>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [detailRequest, setDetailRequest] = useState<HiringRequest | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setCurrentUserId(user.id)

        const [reqRes, depRes] = await Promise.all([
          supabase
            .from("hiring_requests")
            .select("*")
            .or(`requested_by.eq.${user.id},related_faculty_id.eq.${user.id}`)
            .order("created_at", { ascending: false }),
          supabase.from("departments").select("id, name, code").order("name", { ascending: true }),
        ])

        if (reqRes.error) throw reqRes.error
        if (depRes.error) throw depRes.error

        setRequests(reqRes.data || [])
        setDepartments(depRes.data || [])
      } catch (err) {
        console.error("Error loading hiring data:", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const openCreate = () => {
    setEditingRequest(null)
    setFormData(defaultForm)
    setFormError(null)
    setShowModal(true)
  }

  const openEdit = (req: HiringRequest) => {
    // Teachers can only edit their own pending requests
    if (req.requested_by !== currentUserId) return
    if (req.status !== "pending" && req.status !== "on_hold") return
    setEditingRequest(req)
    setFormData({
      title: req.title,
      role_type: req.role_type,
      employment_type: req.employment_type,
      department_id: req.department_id || "",
      priority: req.priority,
      positions_requested: req.positions_requested.toString(),
      min_salary: req.min_salary != null ? req.min_salary.toString() : "",
      max_salary: req.max_salary != null ? req.max_salary.toString() : "",
      expected_joining_from: req.expected_joining_from ? req.expected_joining_from.slice(0, 10) : "",
      expected_joining_to: req.expected_joining_to ? req.expected_joining_to.slice(0, 10) : "",
      description: req.description || "",
      qualifications: req.qualifications || "",
      responsibilities: req.responsibilities || "",
    })
    setFormError(null)
    setShowModal(true)
    setDetailRequest(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)

    try {
      const posReq = parseInt(formData.positions_requested || "0")
      if (isNaN(posReq) || posReq <= 0) {
        setFormError("Positions requested must be a positive number")
        return
      }

      const payload = {
        title: formData.title.trim(),
        role_type: formData.role_type,
        employment_type: formData.employment_type,
        department_id: formData.department_id || null,
        priority: formData.priority,
        positions_requested: posReq,
        positions_approved: 0,
        min_salary: formData.min_salary ? parseFloat(formData.min_salary) : null,
        max_salary: formData.max_salary ? parseFloat(formData.max_salary) : null,
        expected_joining_from: formData.expected_joining_from || null,
        expected_joining_to: formData.expected_joining_to || null,
        description: formData.description.trim() || null,
        qualifications: formData.qualifications.trim() || null,
        responsibilities: formData.responsibilities.trim() || null,
        requested_by: currentUserId,
        related_faculty_id: currentUserId,
        status: "pending" as HiringStatus,
      }

      if (editingRequest) {
        const { error } = await supabase
          .from("hiring_requests")
          .update(payload)
          .eq("id", editingRequest.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("hiring_requests")
          .insert([payload])
        if (error) throw error
      }

      // Refresh
      const { data, error } = await supabase
        .from("hiring_requests")
        .select("*")
        .or(`requested_by.eq.${currentUserId},related_faculty_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false })
      if (error) throw error

      setRequests(data || [])
      setShowModal(false)
      setEditingRequest(null)
    } catch (err: any) {
      setFormError(err.message || "Failed to save request")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to withdraw this request?")) return
    try {
      const { error } = await supabase.from("hiring_requests").delete().eq("id", id)
      if (error) throw error
      setRequests(prev => prev.filter(r => r.id !== id))
      if (detailRequest?.id === id) setDetailRequest(null)
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`)
    }
  }

  const handleExport = async () => {
    const csvRows = [
      ["Title", "Role", "Employment", "Department", "Positions", "Status", "Priority", "Created"],
      ...filteredRequests.map(r => {
        const dep = departments.find(d => d.id === r.department_id)
        return [
          `"${r.title}"`,
          r.role_type,
          r.employment_type,
          dep?.name || "",
          r.positions_requested,
          r.status,
          r.priority,
          r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
        ]
      }),
    ]
    const csv = csvRows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `my-hiring-requests-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredRequests = requests.filter(r => {
    if (selectedStatus !== "all" && r.status !== selectedStatus) return false
    if (!searchQuery.trim()) return true
    const dep = departments.find(d => d.id === r.department_id)
    const hay = `${r.title} ${r.role_type} ${r.employment_type} ${dep?.name || ""}`.toLowerCase()
    return hay.includes(searchQuery.toLowerCase())
  })

  const counts = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    on_hold: requests.filter(r => r.status === "on_hold").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  }

  const canEdit = (req: HiringRequest) =>
    req.requested_by === currentUserId && (req.status === "pending" || req.status === "on_hold")

  const canDelete = (req: HiringRequest) =>
    req.requested_by === currentUserId && req.status === "pending"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-500 text-sm font-medium">Loading your hiring requests…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top header bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <Briefcase className="w-4.5 h-4.5 text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 leading-tight">My Hiring Requests</h1>
              <p className="text-xs text-slate-500">Submit and track your staffing requests</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Request
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Submitted", value: counts.total, color: "text-slate-900", bg: "bg-white" },
            { label: "Pending Review", value: counts.pending, color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Approved", value: counts.approved, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "On Hold / Rejected", value: counts.on_hold + counts.rejected, color: "text-slate-600", bg: "bg-white" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-slate-200 rounded-xl p-4 shadow-sm`}>
              <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color} leading-none`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, role, department…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "pending", "approved", "on_hold", "rejected", "closed"] as const).map(s => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors capitalize whitespace-nowrap
                  ${selectedStatus === s
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Main list */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-700 font-semibold">No requests found</p>
              <p className="text-slate-400 text-sm mt-1 max-w-xs">
                {searchQuery || selectedStatus !== "all"
                  ? "Try adjusting your search or filters."
                  : "You haven't submitted any hiring requests yet. Create one to get started."}
              </p>
              {!searchQuery && selectedStatus === "all" && (
                <button
                  onClick={openCreate}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create First Request
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRequests.map((req, idx) => {
                const dep = departments.find(d => d.id === req.department_id)
                const statusCfg = STATUS_CONFIG[req.status]
                const priorityCfg = PRIORITY_CONFIG[req.priority]
                const isOwn = req.requested_by === currentUserId

                return (
                  <div
                    key={req.id}
                    className="group flex items-start gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => setDetailRequest(detailRequest?.id === req.id ? null : req)}
                  >
                    {/* Left: index indicator */}
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                    </div>

                    {/* Middle: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-semibold text-slate-900 text-sm truncate">{req.title}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                        {!isOwn && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 border border-purple-200 text-purple-700">
                            Assigned to me
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="capitalize font-medium text-slate-700">{req.role_type.toUpperCase()}</span>
                        <span>·</span>
                        <span className="capitalize">{req.employment_type.replace("_", " ")}</span>
                        {dep && (
                          <>
                            <span>·</span>
                            <span>{dep.name}</span>
                          </>
                        )}
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                          {priorityCfg.label} priority
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {req.positions_approved}/{req.positions_requested} positions
                        </span>
                        {req.created_at && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(req.created_at).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Expanded detail */}
                      {detailRequest?.id === req.id && (
                        <div className="mt-3 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3" onClick={e => e.stopPropagation()}>
                          {req.description && (
                            <div>
                              <span className="font-semibold text-slate-700">Description: </span>
                              {req.description}
                            </div>
                          )}
                          {req.qualifications && (
                            <div>
                              <span className="font-semibold text-slate-700">Qualifications: </span>
                              {req.qualifications}
                            </div>
                          )}
                          {req.responsibilities && (
                            <div>
                              <span className="font-semibold text-slate-700">Responsibilities: </span>
                              {req.responsibilities}
                            </div>
                          )}
                          {(req.min_salary != null || req.max_salary != null) && (
                            <div>
                              <span className="font-semibold text-slate-700">Salary Range: </span>
                              {req.min_salary} – {req.max_salary}
                            </div>
                          )}
                          {(req.expected_joining_from || req.expected_joining_to) && (
                            <div>
                              <span className="font-semibold text-slate-700">Expected Joining: </span>
                              {req.expected_joining_from && new Date(req.expected_joining_from).toLocaleDateString()}
                              {req.expected_joining_to && ` – ${new Date(req.expected_joining_to).toLocaleDateString()}`}
                            </div>
                          )}
                          {req.status === "approved" && req.approval_notes && (
                            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <span className="font-semibold text-emerald-700">Approval Notes: </span>
                              <span className="text-emerald-700">{req.approval_notes}</span>
                            </div>
                          )}
                          {req.status === "rejected" && req.rejection_reason && (
                            <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                              <span className="font-semibold text-red-700">Rejection Reason: </span>
                              <span className="text-red-700">{req.rejection_reason}</span>
                            </div>
                          )}
                          {req.status === "on_hold" && req.approval_notes && (
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <span className="font-semibold text-blue-700">Hold Notes: </span>
                              <span className="text-blue-700">{req.approval_notes}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      {canEdit(req) && (
                        <button
                          onClick={() => openEdit(req)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit request"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete(req) && (
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Withdraw request"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${detailRequest?.id === req.id ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom hint */}
        <p className="text-center text-xs text-slate-400 pb-2">
          You can edit or withdraw requests while they are in <span className="font-medium">Pending</span> status. Approved or rejected requests are managed by HR/Admin.
        </p>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {editingRequest ? "Edit Hiring Request" : "New Hiring Request"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingRequest ? "Update your existing request" : "Submit a new staffing request to HR"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Position Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Assistant Professor – Computer Science"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role Type</label>
                  <select
                    value={formData.role_type}
                    onChange={e => setFormData({ ...formData, role_type: e.target.value as RoleType })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                  >
                    <option value="faculty">Faculty</option>
                    <option value="staff">Staff</option>
                    <option value="hod">HOD</option>
                    <option value="hr">HR</option>
                    <option value="finance">Finance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Employment Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Employment Type</label>
                  <select
                    value={formData.employment_type}
                    onChange={e => setFormData({ ...formData, employment_type: e.target.value as EmploymentType })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department</label>
                  <select
                    value={formData.department_id}
                    onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                  >
                    <option value="">No department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as PriorityType })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Positions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Positions Requested <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.positions_requested}
                    onChange={e => setFormData({ ...formData, positions_requested: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                  />
                </div>

                {/* Salary min */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Min Salary (optional)</label>
                  <input
                    type="number"
                    value={formData.min_salary}
                    onChange={e => setFormData({ ...formData, min_salary: e.target.value })}
                    placeholder="e.g. 60000"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                  />
                </div>

                {/* Salary max */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Salary (optional)</label>
                  <input
                    type="number"
                    value={formData.max_salary}
                    onChange={e => setFormData({ ...formData, max_salary: e.target.value })}
                    placeholder="e.g. 100000"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                  />
                </div>

                {/* Joining from */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expected Joining From</label>
                  <input
                    type="date"
                    value={formData.expected_joining_from}
                    onChange={e => setFormData({ ...formData, expected_joining_from: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                  />
                </div>

                {/* Joining to */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expected Joining To</label>
                  <input
                    type="date"
                    value={formData.expected_joining_to}
                    onChange={e => setFormData({ ...formData, expected_joining_to: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief overview of the role and its importance…"
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition resize-none"
                />
              </div>

              {/* Qualifications */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Required Qualifications</label>
                <textarea
                  value={formData.qualifications}
                  onChange={e => setFormData({ ...formData, qualifications: e.target.value })}
                  placeholder="e.g. PhD in relevant field, 3+ years experience…"
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition resize-none"
                />
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Key Responsibilities</label>
                <textarea
                  value={formData.responsibilities}
                  onChange={e => setFormData({ ...formData, responsibilities: e.target.value })}
                  placeholder="Outline the main duties and expectations…"
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingRequest ? "Update Request" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}