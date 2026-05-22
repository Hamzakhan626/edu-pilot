/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Trash2,
  Edit,
  Briefcase,
  Filter,
  Download,
  UserCheck,
  Search,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import supabase from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/auth"
import CreateUserFromHiringModal from "@/components/auth/createhiringuser"
import { toast } from "sonner"

// Types (same as admin)
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
  positions_approved: string
  min_salary: string
  max_salary: string
  expected_joining_from: string
  expected_joining_to: string
  description: string
  qualifications: string
  responsibilities: string
  related_hod_id: string
  related_faculty_id: string
  status: HiringStatus
  approval_notes: string
  rejection_reason: string
}

export default function HoDHiringPage() {
  const router = useRouter()

  // Auth & department
  const [user, setUser] = useState<any>(null)
  const [department, setDepartment] = useState<Department | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [requests, setRequests] = useState<HiringRequest[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<"all" | HiringStatus>("all")
  const [selectedRoleType, setSelectedRoleType] = useState<"all" | RoleType>("all")

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState<HiringRequest | null>(null)

  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [selectedRequestForUser, setSelectedRequestForUser] = useState<HiringRequest | null>(null)

  const [formData, setFormData] = useState<FormData>({
    title: "",
    role_type: "staff",
    employment_type: "full_time",
    department_id: "",
    priority: "normal",
    positions_requested: "1",
    positions_approved: "0",
    min_salary: "",
    max_salary: "",
    expected_joining_from: "",
    expected_joining_to: "",
    description: "",
    qualifications: "",
    responsibilities: "",
    related_hod_id: "",
    related_faculty_id: "",
    status: "pending",
    approval_notes: "",
    rejection_reason: "",
  })

  // Initial auth & department load
  useEffect(() => {
    const init = async () => {
      const currentUser = getCurrentUser()
      if (!currentUser) {
        router.push("/login")
        return
      }
      if (currentUser.role !== "hod" && currentUser.role !== "admin") {
        router.push("/login")
        return
      }

      setUser(currentUser)

      // Get HoD's department
      const { data: dept, error: deptError } = await supabase
        .from("departments")
        .select("id, name, code")
        .eq("hod_id", currentUser.id)
        .maybeSingle()

      if (deptError || !dept) {
        toast.error("No department assigned to your HoD account")
        router.push("/hod/programs")
        return
      }

      setDepartment(dept)
      setFormData(prev => ({ ...prev, department_id: dept.id })) // pre‑select department
      setAuthLoading(false)
    }
    init()
  }, [])

  // Load requests after department is known
  useEffect(() => {
    if (!department) return
    loadRequests()
  }, [department])

  const loadRequests = async () => {
    if (!department) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("hiring_requests")
        .select("*")
        .eq("department_id", department.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (err: any) {
      toast.error("Failed to load hiring requests")
    } finally {
      setLoading(false)
    }
  }

  // Reset form (keeping department locked)
  const resetForm = () => {
    setFormData({
      title: "",
      role_type: "staff",
      employment_type: "full_time",
      department_id: department?.id || "",
      priority: "normal",
      positions_requested: "1",
      positions_approved: "0",
      min_salary: "",
      max_salary: "",
      expected_joining_from: "",
      expected_joining_to: "",
      description: "",
      qualifications: "",
      responsibilities: "",
      related_hod_id: "",
      related_faculty_id: "",
      status: "pending",
      approval_notes: "",
      rejection_reason: "",
    })
  }

  // ---- Handlers (same logic as admin, but scoped to department) ----
  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!department) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!formData.title.trim()) {
        toast.error("Title is required")
        return
      }

      const positionsRequested = Number.parseInt(formData.positions_requested || "0")
      const positionsApproved = Number.parseInt(formData.positions_approved || "0")

      if (Number.isNaN(positionsRequested) || positionsRequested <= 0) {
        toast.error("Positions requested must be a positive number")
        return
      }

      if (positionsApproved < 0 || positionsApproved > positionsRequested) {
        toast.error("Positions approved must be between 0 and positions requested")
        return
      }

      const newRequest = {
        title: formData.title.trim(),
        role_type: formData.role_type,
        employment_type: formData.employment_type,
        department_id: department.id, // always HoD's department
        priority: formData.priority,
        positions_requested: positionsRequested,
        positions_approved: positionsApproved,
        min_salary: formData.min_salary ? Number.parseFloat(formData.min_salary) : null,
        max_salary: formData.max_salary ? Number.parseFloat(formData.max_salary) : null,
        expected_joining_from: formData.expected_joining_from || null,
        expected_joining_to: formData.expected_joining_to || null,
        description: formData.description.trim() || null,
        qualifications: formData.qualifications.trim() || null,
        responsibilities: formData.responsibilities.trim() || null,
        related_hod_id: formData.related_hod_id || null,
        related_faculty_id: formData.related_faculty_id || null,
        status: "pending" as HiringStatus,
        approval_notes: formData.approval_notes.trim() || null,
        rejection_reason: formData.rejection_reason.trim() || null,
        requested_by: user?.id || null,
        approved_by: null,
      }

      const { data, error } = await supabase
        .from("hiring_requests")
        .insert([newRequest])
        .select()

      if (error) throw error

      setRequests((prev) => (data ? [...data, ...prev] : prev))
      resetForm()
      setShowAddModal(false)
      toast.success("Hiring request created")
    } catch (err: any) {
      toast.error(err.message || "Failed to create request")
    }
  }

  const handleEditRequest = (req: HiringRequest) => {
    setEditingRequest(req)
    setFormData({
      title: req.title,
      role_type: req.role_type,
      employment_type: req.employment_type,
      department_id: req.department_id || department?.id || "",
      priority: req.priority,
      positions_requested: req.positions_requested.toString(),
      positions_approved: req.positions_approved.toString(),
      min_salary: req.min_salary != null ? req.min_salary.toString() : "",
      max_salary: req.max_salary != null ? req.max_salary.toString() : "",
      expected_joining_from: req.expected_joining_from ? req.expected_joining_from.slice(0, 10) : "",
      expected_joining_to: req.expected_joining_to ? req.expected_joining_to.slice(0, 10) : "",
      description: req.description || "",
      qualifications: req.qualifications || "",
      responsibilities: req.responsibilities || "",
      related_hod_id: req.related_hod_id || "",
      related_faculty_id: req.related_faculty_id || "",
      status: req.status,
      approval_notes: req.approval_notes || "",
      rejection_reason: req.rejection_reason || "",
    })
    setShowEditModal(true)
  }

  const handleUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRequest || !department) return

    try {
      const positionsRequested = Number.parseInt(formData.positions_requested || "0")
      const positionsApproved = Number.parseInt(formData.positions_approved || "0")

      if (Number.isNaN(positionsRequested) || positionsRequested <= 0) {
        toast.error("Positions requested must be a positive number")
        return
      }

      if (positionsApproved < 0 || positionsApproved > positionsRequested) {
        toast.error("Positions approved must be between 0 and positions requested")
        return
      }

      const updated = {
        title: formData.title.trim(),
        role_type: formData.role_type,
        employment_type: formData.employment_type,
        department_id: department.id, // keep department locked
        priority: formData.priority,
        positions_requested: positionsRequested,
        positions_approved: positionsApproved,
        min_salary: formData.min_salary ? Number.parseFloat(formData.min_salary) : null,
        max_salary: formData.max_salary ? Number.parseFloat(formData.max_salary) : null,
        expected_joining_from: formData.expected_joining_from || null,
        expected_joining_to: formData.expected_joining_to || null,
        description: formData.description.trim() || null,
        qualifications: formData.qualifications.trim() || null,
        responsibilities: formData.responsibilities.trim() || null,
        related_hod_id: formData.related_hod_id || null,
        related_faculty_id: formData.related_faculty_id || null,
        status: formData.status,
        approval_notes: formData.approval_notes.trim() || null,
        rejection_reason: formData.rejection_reason.trim() || null,
      }

      const { error } = await supabase
        .from("hiring_requests")
        .update(updated)
        .eq("id", editingRequest.id)

      if (error) throw error

      await loadRequests()
      setShowEditModal(false)
      setEditingRequest(null)
      toast.success("Request updated")
    } catch (err: any) {
      toast.error(err.message || "Failed to update request")
    }
  }

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this hiring request?")) return

    try {
      const { error } = await supabase
        .from("hiring_requests")
        .delete()
        .eq("id", id)

      if (error) throw error
      setRequests((prev) => prev.filter((r) => r.id !== id))
      toast.success("Request deleted")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete")
    }
  }

  const handleApproveRequest = async (req: HiringRequest) => {
    setSelectedRequestForUser(req)
    setShowCreateUserModal(true)
  }

  const handleUserCreated = async (userId: string) => {
    if (!selectedRequestForUser) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const positionsApproved =
        selectedRequestForUser.positions_approved > 0
          ? selectedRequestForUser.positions_approved
          : selectedRequestForUser.positions_requested

      const { error } = await supabase
        .from("hiring_requests")
        .update({
          status: "approved",
          positions_approved: positionsApproved,
          approved_by: user?.id || selectedRequestForUser.approved_by || null,
          approval_notes: selectedRequestForUser.approval_notes || "Approved after user account creation",
          rejection_reason: null,
        })
        .eq("id", selectedRequestForUser.id)

      if (error) throw error

      await loadRequests()
      setShowCreateUserModal(false)
      setSelectedRequestForUser(null)
      toast.success("Request approved & user created")
    } catch (err: any) {
      toast.error(err.message || "Failed to finalise approval")
    }
  }

  const handleCancelUserCreation = () => {
    // Just close modal; request stays pending
    console.log("User creation cancelled, request remains pending")
  }

  const handleRejectRequest = async (req: HiringRequest, reason: string) => {
    if (!reason.trim()) {
      toast.error("Rejection reason is required")
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase
        .from("hiring_requests")
        .update({
          status: "rejected",
          approved_by: user?.id || req.approved_by || null,
          rejection_reason: reason.trim(),
        })
        .eq("id", req.id)

      if (error) throw error

      await loadRequests()
      toast.success("Request rejected")
    } catch (err: any) {
      toast.error(err.message || "Failed to reject")
    }
  }

  const handleChangeStatus = async (req: HiringRequest, newStatus: HiringStatus, reason?: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const updateData: any = {
        status: newStatus,
        approved_by: user?.id || req.approved_by || null,
      }

      if (newStatus === "rejected") {
        updateData.rejection_reason = reason || "Status changed by HoD"
        updateData.approval_notes = null
      } else if (newStatus === "approved") {
        updateData.approval_notes = reason || "Approved by HoD"
        updateData.rejection_reason = null
      } else {
        updateData.approval_notes = null
        updateData.rejection_reason = null
      }

      const { error } = await supabase
        .from("hiring_requests")
        .update(updateData)
        .eq("id", req.id)

      if (error) throw error

      await loadRequests()
      toast.success("Status updated")
    } catch (err: any) {
      toast.error(err.message || "Failed to change status")
    }
  }

  const handleExportRequests = async () => {
    if (!department) return
    try {
      const { data } = await supabase
        .from("hiring_requests")
        .select("*")
        .eq("department_id", department.id)
        .order("created_at", { ascending: false })

      if (!data) return

      const csvContent = [
        ["ID", "Title", "Role Type", "Employment Type", "Positions Requested", "Positions Approved", "Status", "Priority", "Min Salary", "Max Salary", "Expected From", "Expected To", "Description", "Qualifications", "Responsibilities"].join(","),
        ...data.map((r) =>
          [
            r.id,
            `"${r.title.replace(/"/g, '""')}"`,
            r.role_type,
            r.employment_type,
            r.positions_requested,
            r.positions_approved,
            r.status,
            r.priority,
            r.min_salary ?? "",
            r.max_salary ?? "",
            r.expected_joining_from || "",
            r.expected_joining_to || "",
            `"${(r.description || "").replace(/"/g, '""')}"`,
            `"${(r.qualifications || "").replace(/"/g, '""')}"`,
            `"${(r.responsibilities || "").replace(/"/g, '""')}"`,
          ].join(",")
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `hiring-requests-${department.code}-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success("Exported")
    } catch (err: any) {
      toast.error(err.message || "Export failed")
    }
  }

  // Filtering (only by status, role, search)
  const filteredRequests = requests.filter((r) => {
    if (selectedStatus !== "all" && r.status !== selectedStatus) return false
    if (selectedRoleType !== "all" && r.role_type !== selectedRoleType) return false

    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      r.title.toLowerCase().includes(q) ||
      r.role_type.toLowerCase().includes(q) ||
      r.employment_type.toLowerCase().includes(q)
    )
  })

  const statusCounts: Record<HiringStatus, number> = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    on_hold: requests.filter((r) => r.status === "on_hold").length,
    closed: requests.filter((r) => r.status === "closed").length,
  }

  const getStatusIcon = (status: HiringStatus) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-3 h-3" />
      case "rejected": return <XCircle className="w-3 h-3" />
      case "pending": return <Clock className="w-3 h-3" />
      case "on_hold": return <AlertCircle className="w-3 h-3" />
      case "closed": return <CheckCircle className="w-3 h-3" />
    }
  }

  const getStatusColor = (status: HiringStatus) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800"
      case "rejected": return "bg-red-100 text-red-800"
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "on_hold": return "bg-blue-100 text-blue-800"
      case "closed": return "bg-gray-100 text-gray-800"
    }
  }

  if (authLoading || !department) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <ShieldAlert className="h-6 w-6 mx-auto text-amber-500 mb-2" />
          <p className="text-gray-600">Loading department information…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/hod/programs")} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Programs
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Hiring Management
              </h1>
              <p className="text-gray-600">
                Manage hiring requests for {department.name} ({department.code})
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExportRequests} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Requests
              </Button>
              <Button
                onClick={() => {
                  resetForm()
                  setShowAddModal(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Hiring Request
              </Button>
            </div>
          </div>
        </div>

        {/* Filters row (simplified: no department filter) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Search */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by title, role, type"
              />
            </CardContent>
          </Card>

          {/* Status filter */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as "all" | HiringStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="on_hold">On Hold</option>
                <option value="closed">Closed</option>
              </select>
            </CardContent>
          </Card>

          {/* Role type filter */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Role Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedRoleType}
                onChange={(e) => setSelectedRoleType(e.target.value as "all" | RoleType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All roles</option>
                <option value="faculty">Faculty</option>
                <option value="staff">Staff</option>
                <option value="hod">HOD</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
                <option value="other">Other</option>
              </select>
            </CardContent>
          </Card>
        </div>

        {/* Main content: list + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requests list */}
          <Card className="lg:col-span-2 bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Briefcase className="w-5 h-5" />
                Hiring Requests
                <Badge variant="secondary" className="ml-2">
                  {filteredRequests.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Review, approve or reject hiring requests for your department
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-12">
                  <p className="text-gray-600">Loading requests…</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <p className="text-gray-600 text-sm">No hiring requests found for your department.</p>
              ) : (
                filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="border-l-4 border-blue-500 pl-4 py-3 group hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 cursor-pointer" onClick={() => handleEditRequest(req)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-gray-900 hover:text-blue-600">
                            {req.title}
                          </div>
                          <Badge variant="secondary" className={`capitalize ${getStatusColor(req.status)} flex items-center gap-1`}>
                            {getStatusIcon(req.status)}
                            {req.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize text-xs">
                            {req.role_type} • {req.employment_type.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant={
                              req.priority === "high" || req.priority === "critical" ? "destructive" : "outline"
                            }
                            className="capitalize text-xs"
                          >
                            {req.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Positions:</span>
                            <span>
                              {req.positions_approved}/{req.positions_requested} approved
                            </span>
                            {req.min_salary != null && req.max_salary != null && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="font-medium">Salary:</span>
                                <span>{req.min_salary} - {req.max_salary}</span>
                              </>
                            )}
                          </div>
                          {(req.expected_joining_from || req.expected_joining_to) && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">Expected joining:</span>
                              <span>
                                {req.expected_joining_from && new Date(req.expected_joining_from).toLocaleDateString()}
                                {req.expected_joining_to && <>{" - "}{new Date(req.expected_joining_to).toLocaleDateString()}</>}
                              </span>
                            </div>
                          )}
                          {req.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{req.description}</p>
                          )}
                          {(req.approval_notes || req.rejection_reason) && (
                            <p className="text-xs text-gray-500">
                              {req.status === "rejected"
                                ? `Rejection: ${req.rejection_reason}`
                                : `Notes: ${req.approval_notes}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 ml-2 items-end">
                        <div className="flex gap-1">
                          {(req.status === "pending" || req.status === "on_hold") && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleApproveRequest(req) }}
                                className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const reason = window.prompt("Enter rejection reason:")
                                  if (reason) handleRejectRequest(req, reason)
                                }}
                                className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {(req.status === "approved" || req.status === "rejected") && (
                            <div className="flex flex-col gap-1">
                              <select
                                onChange={(e) => {
                                  e.stopPropagation()
                                  const newStatus = e.target.value as HiringStatus
                                  if (newStatus === "rejected") {
                                    const reason = window.prompt("Enter reason for rejection:")
                                    if (reason) handleChangeStatus(req, newStatus, reason)
                                  } else if (newStatus === "approved") {
                                    const reason = window.prompt("Enter approval notes (optional):")
                                    handleChangeStatus(req, newStatus, reason || "")
                                  } else {
                                    handleChangeStatus(req, newStatus)
                                  }
                                  e.target.value = ""
                                }}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">Change Status...</option>
                                <option value="pending">Mark as Pending</option>
                                <option value="on_hold">Mark as On Hold</option>
                                {req.status === "approved" && <option value="rejected">Mark as Rejected</option>}
                                {req.status === "rejected" && <option value="approved">Mark as Approved</option>}
                                <option value="closed">Mark as Closed</option>
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditRequest(req) }}
                            className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit request"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteRequest(req.id) }}
                            className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete request"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Dashboard stats */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <UserCheck className="w-5 h-5" />
                Hiring Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                  <p className="text-xs text-gray-500 mt-1">All requests in {department.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{statusCounts.pending}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Approved</p>
                    <p className="text-2xl font-bold text-gray-900">{statusCounts.approved}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">On Hold</p>
                    <p className="text-2xl font-bold text-gray-900">{statusCounts.on_hold}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Rejected/Closed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statusCounts.rejected + statusCounts.closed}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-3">Quick Actions</p>
                <div className="space-y-2">
                  <Button
                    onClick={() => { resetForm(); setShowAddModal(true) }}
                    variant="default"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Hiring Request
                  </Button>
                  <Button onClick={handleExportRequests} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export Requests
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create User from Hiring Modal */}
        {showCreateUserModal && selectedRequestForUser && (
          <CreateUserFromHiringModal
            isOpen={showCreateUserModal}
            onClose={() => {
              setShowCreateUserModal(false)
              setSelectedRequestForUser(null)
            }}
            onCancel={handleCancelUserCreation}
            hiringRequest={selectedRequestForUser}
            departments={[department]}
            onUserCreated={handleUserCreated}
          />
        )}

        {/* Add/Edit modals (identical to admin, but department pre‑selected & locked) */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">New Hiring Request</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Create a new hiring request for {department.name}
                </p>
              </div>
              <div className="p-6">
                <form onSubmit={handleAddRequest} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Assistant Professor CS"
                      />
                    </div>
                    {/* Role Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Role Type</label>
                      <select
                        value={formData.role_type}
                        onChange={(e) => setFormData({ ...formData, role_type: e.target.value as RoleType })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      <label className="block text-sm font-medium text-gray-900 mb-1">Employment Type</label>
                      <select
                        value={formData.employment_type}
                        onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as EmploymentType })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                        <option value="contract">Contract</option>
                      </select>
                    </div>
                    {/* Department - locked */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Department</label>
                      <input
                        type="text"
                        value={`${department.name} (${department.code})`}
                        disabled
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm"
                      />
                    </div>
                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as PriorityType })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    {/* Positions Requested */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Positions Requested *</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formData.positions_requested}
                        onChange={(e) => setFormData({ ...formData, positions_requested: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {/* Positions Approved */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Positions Approved</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.positions_approved}
                        onChange={(e) => setFormData({ ...formData, positions_approved: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {/* Min/Max Salary */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Min Salary</label>
                      <input
                        type="number"
                        value={formData.min_salary}
                        onChange={(e) => setFormData({ ...formData, min_salary: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. 80000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Max Salary</label>
                      <input
                        type="number"
                        value={formData.max_salary}
                        onChange={(e) => setFormData({ ...formData, max_salary: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. 120000"
                      />
                    </div>
                    {/* Expected Joining */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Expected Joining From</label>
                      <input
                        type="date"
                        value={formData.expected_joining_from}
                        onChange={(e) => setFormData({ ...formData, expected_joining_from: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Expected Joining To</label>
                      <input
                        type="date"
                        value={formData.expected_joining_to}
                        onChange={(e) => setFormData({ ...formData, expected_joining_to: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief description of the role"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Qualifications</label>
                    <textarea
                      value={formData.qualifications}
                      onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Required qualifications"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => { setShowAddModal(false); resetForm() }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Create Request
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showEditModal && editingRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Edit Hiring Request</h2>
                <p className="text-gray-600 text-sm mt-1">Update or approve this hiring request</p>
              </div>
              <div className="p-6">
                <form onSubmit={handleUpdateRequest} className="space-y-4">
                  {/* same fields as add, with Status dropdown added */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Role Type</label>
                      <select
                        value={formData.role_type}
                        onChange={(e) => setFormData({ ...formData, role_type: e.target.value as RoleType })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="faculty">Faculty</option>
                        <option value="staff">Staff</option>
                        <option value="hod">HOD</option>
                        <option value="hr">HR</option>
                        <option value="finance">Finance</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Employment Type</label>
                      <select
                        value={formData.employment_type}
                        onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as EmploymentType })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="full_time">Full Time</option>
                        <option value="part_time">Part Time</option>
                        <option value="contract">Contract</option>
                      </select>
                    </div>
                    {/* Department (locked) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Department</label>
                      <input
                        type="text"
                        value={`${department.name} (${department.code})`}
                        disabled
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as PriorityType })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Positions Requested *</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formData.positions_requested}
                        onChange={(e) => setFormData({ ...formData, positions_requested: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Positions Approved</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.positions_approved}
                        onChange={(e) => setFormData({ ...formData, positions_approved: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Min Salary</label>
                      <input
                        type="number"
                        value={formData.min_salary}
                        onChange={(e) => setFormData({ ...formData, min_salary: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Max Salary</label>
                      <input
                        type="number"
                        value={formData.max_salary}
                        onChange={(e) => setFormData({ ...formData, max_salary: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Expected Joining From</label>
                      <input
                        type="date"
                        value={formData.expected_joining_from}
                        onChange={(e) => setFormData({ ...formData, expected_joining_from: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Expected Joining To</label>
                      <input
                        type="date"
                        value={formData.expected_joining_to}
                        onChange={(e) => setFormData({ ...formData, expected_joining_to: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as HiringStatus })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="on_hold">On Hold</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Qualifications</label>
                    <textarea
                      value={formData.qualifications}
                      onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => { setShowEditModal(false); setEditingRequest(null) }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (editingRequest) {
                          handleDeleteRequest(editingRequest.id)
                          setShowEditModal(false)
                          setEditingRequest(null)
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Update Request
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}