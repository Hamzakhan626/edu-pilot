/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  DollarSign,
  Check,
  X,
  Clock,
  AlertCircle,
  Users,
  Search,
  Eye,
  Download,
  CheckCircle,
  FileText,
  Phone,
  Mail,
  ChevronRight,
  Lock,
  Plus,
  Receipt,
  CreditCard,
  Calendar,
  TrendingUp,
  TrendingDown,
  Filter,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import supabase from "@/lib/supabase/client"

type FeeStatus = "pending" | "installment" | "paid" | "overdue" | "cancelled"
type InstallmentStatus = "pending" | "approved" | "rejected" | "paid" | "overdue"
type ChallanStatus = "generated" | "issued" | "paid" | "cancelled" | "overdue"

interface User {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string | null
}

interface StudentFee {
  id: string
  student_id: string
  fee_structure_id: string | null
  actual_tuition: number
  actual_hostel: number
  actual_transport: number
  actual_misc: number
  actual_total: number
  discount_type: string
  discount_value: number
  discount_reason: string | null
  payable_total: number
  already_paid: number
  status: FeeStatus
  due_date: string | null
  created_at: string
}

interface FeeInstallment {
  id: string
  student_fee_id: string
  installment_number: number
  amount: number
  due_date: string
  status: InstallmentStatus
  requested_by: string | null
  approved_by: string | null
  approval_notes: string | null
  rejection_reason: string | null
  paid_at: string | null
  payment_reference: string | null
  created_at: string
}

interface FeeChallan {
  id: string
  student_fee_id: string | null
  installment_id: string | null
  challan_number: string
  total_amount: number
  due_date: string
  status: ChallanStatus
  payment_method: string | null
  bank_details: any
  billing_address: string | null
  issued_by: string | null
  issued_at: string | null
  paid_at: string | null
  payment_reference: string | null
  notes: string | null
  created_at: string
}

interface FeePayment {
  id: string
  student_fee_id: string
  installment_id: string | null
  challan_id: string | null
  amount: number
  payment_method: string | null
  payment_date: string
  reference_no: string | null
  received_by: string | null
  status: string
  remarks: string | null
  created_at: string
}

interface FeeStructure {
  id: string
  name: string
  description: string | null
  base_tuition: number
  hostel_fee: number
  transport_fee: number
  misc_fee: number
  currency: string
  is_active: boolean
}

interface FeeCategory {
  id: string
  name: string
  code: string
  description: string | null
  default_amount: number
  is_mandatory: boolean
  display_order: number
}

const getPaymentPercentage = (paid: number, total: number) =>
  total > 0 ? (paid / total) * 100 : 0

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A"
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return "Invalid date"
  }
}

const formatCurrency = (amount: number, currency = "PKR") => {
  return `${currency} ${amount.toLocaleString()}`
}

export default function AdminFeesAndInstallmentsPage() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Data states
  const [students, setStudents] = useState<User[]>([])
  const [fees, setFees] = useState<StudentFee[]>([])
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [installments, setInstallments] = useState<FeeInstallment[]>([])
  const [challans, setChallans] = useState<FeeChallan[]>([])
  const [payments, setPayments] = useState<FeePayment[]>([])
  const [categories, setCategories] = useState<FeeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Filter states
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<"fees" | "installments" | "challans" | "payments">("fees")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFeeStatus, setSelectedFeeStatus] = useState<"all" | FeeStatus>("all")
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  })

  // Dialog states
  const [challanDialog, setChallanDialog] = useState(false)
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [selectedFeeForChallan, setSelectedFeeForChallan] = useState<StudentFee | null>(null)
  const [selectedInstallmentForChallan, setSelectedInstallmentForChallan] = useState<FeeInstallment | null>(null)
  const [selectedChallanForPayment, setSelectedChallanForPayment] = useState<FeeChallan | null>(null)
  const [detailDialog, setDetailDialog] = useState(false)
  const [selectedFeeDetail, setSelectedFeeDetail] = useState<StudentFee | null>(null)

  // Form states
  const [challanForm, setChallanForm] = useState({
    dueDate: "",
    paymentMethod: "bank_transfer",
    billingAddress: "",
    notes: "",
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "bank_transfer",
    referenceNo: "",
    remarks: "",
  })

  useEffect(() => {
    const init = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser()
        const userId = authData.user?.id
        if (!userId) {
          setIsAuthorized(false)
          setLoading(false)
          return
        }

        const { data: userRow } = await supabase
          .from("users")
          .select("id, full_name, email, phone, role")
          .eq("id", userId)
          .single()

        const role = userRow?.role
        if (!role || !["admin", "finance", "hr"].includes(role)) {
          setIsAuthorized(false)
          setLoading(false)
          return
        }
        setIsAuthorized(true)
        setCurrentUser(userRow as User)

        // Load all data
        const [
          studentsRes,
          structuresRes,
          feesRes,
          instRes,
          challansRes,
          paymentsRes,
          categoriesRes,
        ] = await Promise.all([
          supabase
            .from("users")
            .select("id, full_name, email, phone, role")
            .eq("role", "student"),
          supabase
            .from("fee_structures")
            .select("*")
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("student_fees")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("fee_installments")
            .select("*")
            .order("installment_number", { ascending: true }),
          supabase
            .from("fee_challans")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("fee_payments")
            .select("*")
            .order("payment_date", { ascending: false }),
          supabase
            .from("fee_categories")
            .select("*")
            .order("display_order"),
        ])

        // Debug logging
        console.log("Students query result:", studentsRes)
        console.log("Students data:", studentsRes.data)
        console.log("Students count:", studentsRes.data?.length || 0)

        if (studentsRes.error) {
          console.error("Students query error:", studentsRes.error)
          setDebugInfo(`Error loading students: ${studentsRes.error.message}`)
        } else if (!studentsRes.data || studentsRes.data.length === 0) {
          setDebugInfo("No students found in database. Check if users with role='student' exist.")
        }

        if (structuresRes.error) throw structuresRes.error
        if (feesRes.error) throw feesRes.error
        if (instRes.error) throw instRes.error
        if (challansRes.error) throw challansRes.error
        if (paymentsRes.error) throw paymentsRes.error
        if (categoriesRes.error) throw categoriesRes.error

        setStudents((studentsRes.data || []) as User[])
        setStructures((structuresRes.data || []) as FeeStructure[])
        setFees((feesRes.data || []) as StudentFee[])
        setInstallments((instRes.data || []) as FeeInstallment[])
        setChallans((challansRes.data || []) as FeeChallan[])
        setPayments((paymentsRes.data || []) as FeePayment[])
        setCategories((categoriesRes.data || []) as FeeCategory[])

        setLoading(false)
      } catch (err) {
        console.error("Error loading finance data:", err)
        setDebugInfo(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
        setLoading(false)
      }
    }

    init()
  }, [])

  const mergedFeeRows = useMemo(() => {
    return fees.map((fee) => {
      const student = students.find((s) => s.id === fee.student_id)
      const struct = structures.find((fs) => fs.id === fee.fee_structure_id)
      const studentInstallments = installments.filter((i) => i.student_fee_id === fee.id)
      const studentChallans = challans.filter((c) => c.student_fee_id === fee.id)
      const studentPayments = payments.filter((p) => p.student_fee_id === fee.id)

      return {
        fee,
        student,
        structure: struct,
        installments: studentInstallments,
        challans: studentChallans,
        payments: studentPayments,
      }
    })
  }, [fees, students, structures, installments, challans, payments])

  const filteredFeeRows = useMemo(() => {
    return mergedFeeRows.filter(({ fee, student }) => {
      if (selectedStructure && fee.fee_structure_id !== selectedStructure) return false
      if (selectedFeeStatus !== "all" && fee.status !== selectedFeeStatus) return false

      const q = searchQuery.trim().toLowerCase()
      if (q) {
        const haystack = `${student?.full_name || ""} ${student?.email || ""}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }

      if (dateRange.from && new Date(fee.created_at) < new Date(dateRange.from)) return false
      if (dateRange.to && new Date(fee.created_at) > new Date(dateRange.to)) return false

      return true
    })
  }, [mergedFeeRows, selectedStructure, selectedFeeStatus, searchQuery, dateRange])

  // Statistics
  const stats = useMemo(() => {
    const totalFeeAmount = filteredFeeRows.reduce((sum, r) => sum + r.fee.payable_total, 0)
    const totalPaidAmount = filteredFeeRows.reduce((sum, r) => sum + r.fee.already_paid, 0)
    const collectionRate = totalFeeAmount > 0 ? (totalPaidAmount / totalFeeAmount) * 100 : 0

    const paidCount = filteredFeeRows.filter((r) => r.fee.status === "paid").length
    const installmentCount = filteredFeeRows.filter((r) => r.fee.status === "installment").length
    const pendingCount = filteredFeeRows.filter((r) => r.fee.status === "pending").length
    const overdueCount = filteredFeeRows.filter((r) => r.fee.status === "overdue").length

    const totalChallans = challans.length
    const paidChallans = challans.filter((c) => c.status === "paid").length
    const overdueChallans = challans.filter((c) => c.status === "overdue").length

    const totalPaymentsAmount = payments.reduce((sum, p) => sum + p.amount, 0)
    const successfulPayments = payments.filter((p) => p.status === "success").length

    return {
      totalFeeAmount,
      totalPaidAmount,
      collectionRate,
      paidCount,
      installmentCount,
      pendingCount,
      overdueCount,
      totalChallans,
      paidChallans,
      overdueChallans,
      totalPaymentsAmount,
      successfulPayments,
    }
  }, [filteredFeeRows, challans, payments])

  const groupedPlans = useMemo(() => {
    const byFeeId: Record<string, {
      fee: StudentFee
      student: User | undefined
      installments: FeeInstallment[]
    }> = {}

    for (const fee of fees) {
      const relatedInstallments = installments.filter((i) => i.student_fee_id === fee.id)
      if (relatedInstallments.length === 0) continue
      byFeeId[fee.id] = {
        fee,
        student: students.find((s) => s.id === fee.student_id),
        installments: relatedInstallments,
      }
    }

    return Object.values(byFeeId)
  }, [fees, installments, students])

  const handleGenerateChallan = async () => {
    if (!selectedFeeForChallan && !selectedInstallmentForChallan) {
      alert("Please select a fee or installment")
      return
    }

    if (!challanForm.dueDate) {
      alert("Please enter a due date")
      return
    }

    try {
      const amount = selectedInstallmentForChallan
        ? selectedInstallmentForChallan.amount
        : selectedFeeForChallan
        ? selectedFeeForChallan.payable_total - selectedFeeForChallan.already_paid
        : 0

      const { data, error } = await supabase
        .from("fee_challans")
        .insert({
          student_fee_id: selectedFeeForChallan?.id || null,
          installment_id: selectedInstallmentForChallan?.id || null,
          total_amount: amount,
          due_date: challanForm.dueDate,
          status: "issued",
          payment_method: challanForm.paymentMethod,
          billing_address: challanForm.billingAddress,
          notes: challanForm.notes,
          issued_by: currentUser?.id,
          issued_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error

      // Reload challans
      const { data: newChallans } = await supabase
        .from("fee_challans")
        .select("*")
        .order("created_at", { ascending: false })

      if (newChallans) setChallans(newChallans as FeeChallan[])

      alert("Challan generated successfully!")
      setChallanDialog(false)
      setChallanForm({ dueDate: "", paymentMethod: "bank_transfer", billingAddress: "", notes: "" })
      setSelectedFeeForChallan(null)
      setSelectedInstallmentForChallan(null)
    } catch (err: any) {
      console.error("Generate challan error:", err)
      alert(`Failed to generate challan: ${err.message || "Unknown error"}`)
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedChallanForPayment) {
      alert("Please select a challan")
      return
    }

    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      alert("Please enter a valid payment amount")
      return
    }

    try {
      const amount = parseFloat(paymentForm.amount)

      // Insert payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from("fee_payments")
        .insert({
          student_fee_id: selectedChallanForPayment.student_fee_id!,
          installment_id: selectedChallanForPayment.installment_id,
          challan_id: selectedChallanForPayment.id,
          amount,
          payment_method: paymentForm.paymentMethod,
          payment_date: new Date().toISOString(),
          reference_no: paymentForm.referenceNo,
          received_by: currentUser?.id,
          status: "success",
          remarks: paymentForm.remarks,
        })
        .select()

      if (paymentError) throw paymentError

      // Update challan status
      await supabase
        .from("fee_challans")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_reference: paymentForm.referenceNo,
        })
        .eq("id", selectedChallanForPayment.id)

      // Update student fee
      const { data: feeRow } = await supabase
        .from("student_fees")
        .select("*")
        .eq("id", selectedChallanForPayment.student_fee_id!)
        .single()

      if (feeRow) {
        const newPaid = (feeRow.already_paid || 0) + amount
        const newStatus: FeeStatus = newPaid >= feeRow.payable_total ? "paid" : "installment"

        await supabase
          .from("student_fees")
          .update({
            already_paid: newPaid,
            status: newStatus,
          })
          .eq("id", selectedChallanForPayment.student_fee_id!)
      }

      // If installment, update it
      if (selectedChallanForPayment.installment_id) {
        await supabase
          .from("fee_installments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_reference: paymentForm.referenceNo,
          })
          .eq("id", selectedChallanForPayment.installment_id)
      }

      // Reload data
      const [newChallans, newPayments, newFees, newInstallments] = await Promise.all([
        supabase.from("fee_challans").select("*").order("created_at", { ascending: false }),
        supabase.from("fee_payments").select("*").order("payment_date", { ascending: false }),
        supabase.from("student_fees").select("*").order("created_at", { ascending: false }),
        supabase.from("fee_installments").select("*").order("installment_number", { ascending: true }),
      ])

      if (newChallans.data) setChallans(newChallans.data as FeeChallan[])
      if (newPayments.data) setPayments(newPayments.data as FeePayment[])
      if (newFees.data) setFees(newFees.data as StudentFee[])
      if (newInstallments.data) setInstallments(newInstallments.data as FeeInstallment[])

      alert("Payment recorded successfully!")
      setPaymentDialog(false)
      setPaymentForm({ amount: "", paymentMethod: "bank_transfer", referenceNo: "", remarks: "" })
      setSelectedChallanForPayment(null)
    } catch (err: any) {
      console.error("Record payment error:", err)
      alert(`Failed to record payment: ${err.message || "Unknown error"}`)
    }
  }

  const updateInstallmentStatus = async (
    inst: FeeInstallment,
    status: InstallmentStatus,
    note?: string,
  ) => {
    try {
      const payload: any = { status }
      if (status === "approved") payload.approval_notes = note || null
      if (status === "rejected") payload.rejection_reason = note || null
      if (currentUser?.id) payload.approved_by = currentUser.id

      const { error } = await supabase
        .from("fee_installments")
        .update(payload)
        .eq("id", inst.id)

      if (error) throw error

      const { data: newInst } = await supabase
        .from("fee_installments")
        .select("*")
        .order("installment_number", { ascending: true })

      setInstallments((newInst || []) as FeeInstallment[])
      alert(`Installment ${status} successfully!`)
    } catch (err: any) {
      console.error("Update installment error:", err)
      alert(`Failed to update installment: ${err.message || "Unknown error"}`)
    }
  }

  const handleExportFees = async () => {
    try {
      const csvContent = [
        [
          "Fee ID",
          "Student Name",
          "Email",
          "Structure",
          "Actual Total",
          "Discount",
          "Payable Total",
          "Already Paid",
          "Remaining",
          "Status",
          "Due Date",
        ].join(","),
        ...filteredFeeRows.map(({ fee, student, structure }) =>
          [
            fee.id,
            (student?.full_name || "").replace(/"/g, '""'),
            student?.email || "",
            (structure?.name || "").replace(/"/g, '""'),
            fee.actual_total,
            fee.discount_value,
            fee.payable_total,
            fee.already_paid,
            fee.payable_total - fee.already_paid,
            fee.status,
            formatDate(fee.due_date),
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fee-report-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error("Export error:", err)
      alert(`Failed to export: ${err.message || "Unknown error"}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading fee management system...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="flex flex-col items-center p-8">
            <div className="p-4 bg-red-100 rounded-full mb-4">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 text-center">
              You do not have permission to access this page. Admin or finance role is required.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Fee Management System</h1>
            <p className="text-gray-600">
              Comprehensive fee tracking, installment management, and payment processing
            </p>
          </div>
          <Button onClick={handleExportFees} className="mt-4 md:mt-0">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Debug Info Alert */}
        {debugInfo && (
          <Card className="border-yellow-500 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900">Debug Information</h3>
                  <p className="text-sm text-yellow-800 mt-1">{debugInfo}</p>
                  <p className="text-xs text-yellow-700 mt-2">
                    Students found: {students.length} | Fees: {fees.length} | Structures: {structures.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Collection Rate</p>
                  <p className="text-3xl font-bold mt-2">{stats.collectionRate.toFixed(1)}%</p>
                  <p className="text-blue-100 text-xs mt-1">
                    {formatCurrency(stats.totalPaidAmount)} / {formatCurrency(stats.totalFeeAmount)}
                  </p>
                </div>
                <TrendingUp className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{filteredFeeRows.length}</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="text-green-600 font-medium">{stats.paidCount} paid</span>
                    <span className="text-red-600 font-medium">{stats.overdueCount} overdue</span>
                  </div>
                </div>
                <Users className="h-12 w-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Challans</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalChallans}</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="text-green-600 font-medium">{stats.paidChallans} paid</span>
                    <span className="text-orange-600 font-medium">{stats.overdueChallans} overdue</span>
                  </div>
                </div>
                <Receipt className="h-12 w-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Payments</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.successfulPayments}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {formatCurrency(stats.totalPaymentsAmount)}
                  </p>
                </div>
                <CreditCard className="h-12 w-12 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedStructure || "all"} onValueChange={(val) => setSelectedStructure(val === "all" ? null : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Fee Structure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Structures</SelectItem>
                  {structures.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedFeeStatus} onValueChange={(val) => setSelectedFeeStatus(val as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="installment">Installment</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                placeholder="From Date"
              />

              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                placeholder="To Date"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 border-b bg-white rounded-t-lg p-2">
          {[
            { key: "fees", label: "Fee Collection", icon: DollarSign },
            { key: "installments", label: "Installments", icon: Calendar, badge: groupedPlans.filter(p => p.installments.some(i => i.status === "pending")).length },
            { key: "challans", label: "Challans", icon: Receipt },
            { key: "payments", label: "Payments", icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
                selectedTab === tab.key
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              } rounded-t`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <Badge variant="destructive" className="ml-1">{tab.badge}</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg shadow-lg">
          {/* Fee Collection Tab */}
          {selectedTab === "fees" && (
            <div className="p-6 space-y-4">
              {filteredFeeRows.map(({ fee, student, structure, challans: studentChallans, payments: studentPayments }) => {
                const percentage = getPaymentPercentage(fee.already_paid, fee.payable_total)
                const remaining = fee.payable_total - fee.already_paid

                return (
                  <Card key={fee.id} className="border-2 hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">
                                {student?.full_name || "Unknown Student"}
                              </h3>
                              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  {student?.email}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  {student?.phone || "N/A"}
                                </div>
                              </div>
                              {structure && (
                                <Badge variant="outline" className="mt-2">{structure.name}</Badge>
                              )}
                            </div>
                            <Badge
                              variant={
                                fee.status === "paid"
                                  ? "default"
                                  : fee.status === "overdue"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-sm px-3 py-1"
                            >
                              {fee.status.toUpperCase()}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-xs text-gray-500">Actual Total</p>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(fee.actual_total)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Discount</p>
                              <p className="text-lg font-bold text-green-600">
                                {fee.discount_type === "percentage"
                                  ? `-${fee.discount_value}%`
                                  : `-${formatCurrency(fee.discount_value)}`}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Payable Total</p>
                              <p className="text-lg font-bold text-blue-600">{formatCurrency(fee.payable_total)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Paid</p>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(fee.already_paid)}</p>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-medium text-gray-700">Payment Progress</span>
                              <span className="font-bold text-gray-900">{percentage.toFixed(0)}%</span>
                            </div>
                            <Progress value={percentage} className="h-3" />
                            <p className="text-sm text-gray-600 mt-2">
                              Remaining: <span className="font-bold text-red-600">{formatCurrency(remaining)}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline">
                              <Receipt className="h-3 w-3 mr-1" />
                              {studentChallans.length} Challans
                            </Badge>
                            <Badge variant="outline">
                              <CreditCard className="h-3 w-3 mr-1" />
                              {studentPayments.length} Payments
                            </Badge>
                            {fee.due_date && (
                              <Badge variant={new Date(fee.due_date) < new Date() && fee.status !== "paid" ? "destructive" : "outline"}>
                                <Calendar className="h-3 w-3 mr-1" />
                                Due: {formatDate(fee.due_date)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex lg:flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedFeeDetail(fee)
                              setDetailDialog(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedFeeForChallan(fee)
                              setChallanDialog(true)
                            }}
                            disabled={remaining <= 0}
                          >
                            <Receipt className="h-4 w-4 mr-1" />
                            Generate Challan
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {filteredFeeRows.length === 0 && (
                <div className="text-center py-16">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No fee records found</h3>
                  <p className="text-gray-500">
                    {students.length === 0 
                      ? "No students found in the database. Please add students with role='student' to the users table."
                      : "Try adjusting your filters or ensure student fees have been created."
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Installments Tab */}
          {selectedTab === "installments" && (
            <div className="p-6 space-y-4">
              {groupedPlans.map(({ fee, student, installments: insts }) => {
                const paidInstallments = insts.filter((i) => i.status === "paid").length
                const totalInstallments = insts.length

                return (
                  <Card key={fee.id} className="border-2">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                {student?.full_name || "Unknown"}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Total: {formatCurrency(fee.payable_total)} • Paid: {formatCurrency(fee.already_paid)}
                              </p>
                            </div>
                            <Badge>{paidInstallments}/{totalInstallments} Paid</Badge>
                          </div>

                          <div className="space-y-2">
                            {insts.map((inst) => (
                              <div key={inst.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">Installment {inst.installment_number}</span>
                                    <span className="font-bold text-blue-600">{formatCurrency(inst.amount)}</span>
                                    <span className="text-sm text-gray-500">Due: {formatDate(inst.due_date)}</span>
                                  </div>
                                  {inst.approval_notes && (
                                    <p className="text-xs text-gray-600 mt-1">Note: {inst.approval_notes}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      inst.status === "paid"
                                        ? "default"
                                        : inst.status === "approved"
                                        ? "secondary"
                                        : inst.status === "pending"
                                        ? "outline"
                                        : "destructive"
                                    }
                                  >
                                    {inst.status}
                                  </Badge>
                                  {inst.status === "pending" && (
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const note = window.prompt("Approval notes (optional):") || ""
                                          updateInstallmentStatus(inst, "approved", note)
                                        }}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                          const reason = window.prompt("Rejection reason:") || "Rejected"
                                          updateInstallmentStatus(inst, "rejected", reason)
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  {inst.status === "approved" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedInstallmentForChallan(inst)
                                        setChallanDialog(true)
                                      }}
                                    >
                                      <Receipt className="h-3 w-3 mr-1" />
                                      Challan
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <Progress value={(paidInstallments / totalInstallments) * 100} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {groupedPlans.length === 0 && (
                <div className="text-center py-16">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No installment plans</h3>
                  <p className="text-gray-500">Students will appear here when they request installment plans</p>
                </div>
              )}
            </div>
          )}

          {/* Challans Tab */}
          {selectedTab === "challans" && (
            <div className="p-6 space-y-4">
              {challans.map((challan) => {
                const student = students.find((s) => {
                  const fee = fees.find((f) => f.id === challan.student_fee_id)
                  return fee && s.id === fee.student_id
                })

                return (
                  <Card key={challan.id} className="border-2">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                Challan #{challan.challan_number}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {student?.full_name || "Unknown Student"}
                              </p>
                            </div>
                            <Badge
                              variant={
                                challan.status === "paid"
                                  ? "default"
                                  : challan.status === "overdue"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {challan.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Amount</p>
                              <p className="font-bold text-gray-900">{formatCurrency(challan.total_amount)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Due Date</p>
                              <p className="font-medium">{formatDate(challan.due_date)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Issued</p>
                              <p className="font-medium">{formatDate(challan.issued_at)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Payment Method</p>
                              <p className="font-medium capitalize">{challan.payment_method || "N/A"}</p>
                            </div>
                          </div>

                          {challan.notes && (
                            <p className="text-sm text-gray-600 mt-3 p-2 bg-gray-50 rounded">
                              Note: {challan.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex lg:flex-col gap-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          {challan.status !== "paid" && challan.status !== "cancelled" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedChallanForPayment(challan)
                                setPaymentForm({ ...paymentForm, amount: challan.total_amount.toString() })
                                setPaymentDialog(true)
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Record Payment
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {challans.length === 0 && (
                <div className="text-center py-16">
                  <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No challans generated</h3>
                  <p className="text-gray-500">Challans will appear here once generated</p>
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {selectedTab === "payments" && (
            <div className="p-6 space-y-4">
              {payments.map((payment) => {
                const student = students.find((s) => {
                  const fee = fees.find((f) => f.id === payment.student_fee_id)
                  return fee && s.id === fee.student_id
                })
                const challan = challans.find((c) => c.id === payment.challan_id)

                return (
                  <Card key={payment.id} className="border-2">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                Payment - {formatCurrency(payment.amount)}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {student?.full_name || "Unknown Student"}
                              </p>
                            </div>
                            <Badge
                              variant={
                                payment.status === "success"
                                  ? "default"
                                  : payment.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {payment.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Payment Date</p>
                              <p className="font-medium">{formatDate(payment.payment_date)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Method</p>
                              <p className="font-medium capitalize">{payment.payment_method || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Reference</p>
                              <p className="font-medium">{payment.reference_no || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Challan</p>
                              <p className="font-medium">{challan?.challan_number || "N/A"}</p>
                            </div>
                          </div>

                          {payment.remarks && (
                            <p className="text-sm text-gray-600 mt-3 p-2 bg-gray-50 rounded">
                              Remarks: {payment.remarks}
                            </p>
                          )}
                        </div>

                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {payments.length === 0 && (
                <div className="text-center py-16">
                  <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No payments recorded</h3>
                  <p className="text-gray-500">Payment history will appear here</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generate Challan Dialog */}
        <Dialog open={challanDialog} onOpenChange={setChallanDialog}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>Generate Challan</DialogTitle>
              <DialogDescription>
                Create a new fee challan for payment collection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Amount</Label>
                <Input
                  value={
                    selectedInstallmentForChallan
                      ? formatCurrency(selectedInstallmentForChallan.amount)
                      : selectedFeeForChallan
                      ? formatCurrency(selectedFeeForChallan.payable_total - selectedFeeForChallan.already_paid)
                      : ""
                  }
                  disabled
                />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={challanForm.dueDate}
                  onChange={(e) => setChallanForm({ ...challanForm, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={challanForm.paymentMethod}
                  onValueChange={(val) => setChallanForm({ ...challanForm, paymentMethod: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Address</Label>
                <Textarea
                  value={challanForm.billingAddress}
                  onChange={(e) => setChallanForm({ ...challanForm, billingAddress: e.target.value })}
                  placeholder="Enter billing address..."
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={challanForm.notes}
                  onChange={(e) => setChallanForm({ ...challanForm, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChallanDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateChallan}>
                Generate Challan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Record Payment Dialog */}
        <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record payment received for challan #{selectedChallanForPayment?.challan_number}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="Enter amount..."
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={(val) => setPaymentForm({ ...paymentForm, paymentMethod: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference Number</Label>
                <Input
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  placeholder="Transaction reference..."
                />
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  placeholder="Additional remarks..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordPayment}>
                Record Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}