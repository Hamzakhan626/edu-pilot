/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import supabase from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Check,
  Clock,
  AlertCircle,
  Receipt,
  CreditCard,
  Calendar,
  TrendingUp,
  Eye,
  Download,
  FileText,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";

// ─── Types (mirror admin) ─────────────────────────────────────────────
type FeeStatus = "pending" | "installment" | "paid" | "overdue" | "cancelled";
type InstallmentStatus = "pending" | "approved" | "rejected" | "paid" | "overdue";

interface StudentFee {
  id: string;
  student_id: string;
  fee_structure_id: string | null;
  actual_tuition: number;
  actual_hostel: number;
  actual_transport: number;
  actual_misc: number;
  actual_total: number;
  discount_type: string;
  discount_value: number;
  discount_reason: string | null;
  payable_total: number;
  already_paid: number;
  status: FeeStatus;
  due_date: string | null;
  created_at: string;
}

interface FeeInstallment {
  id: string;
  student_fee_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: InstallmentStatus;
  requested_by: string | null;
  approved_by: string | null;
  approval_notes: string | null;
  rejection_reason: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  created_at: string;
}

interface FeeChallan {
  id: string;
  student_fee_id: string | null;
  installment_id: string | null;
  challan_number: string;
  total_amount: number;
  due_date: string;
  status: string;
  payment_method: string | null;
  bank_details: any;
  billing_address: string | null;
  issued_by: string | null;
  issued_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
}

interface FeePayment {
  id: string;
  student_fee_id: string;
  installment_id: string | null;
  challan_id: string | null;
  amount: number;
  payment_method: string | null;
  payment_date: string;
  reference_no: string | null;
  received_by: string | null;
  status: string;
  remarks: string | null;
  created_at: string;
}

interface FeeStructure {
  id: string;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────
const formatCurrency = (amount: number, currency = "PKR") =>
  `${currency} ${amount.toLocaleString()}`;

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "approved":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "rejected":
    case "overdue":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

// ─── Component ────────────────────────────────────────────────────────
export default function StudentFeesPage() {
  const user = getCurrentUser();
  const studentId = user?.id;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "installments" | "challans" | "payments">("overview");

  // Data
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [installments, setInstallments] = useState<FeeInstallment[]>([]);
  const [challans, setChallans] = useState<FeeChallan[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);

  // Fetch all data for current student
  useEffect(() => {
    if (!studentId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch student fees
        const { data: feeData, error: feeErr } = await supabase
          .from("student_fees")
          .select("*")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false });

        if (feeErr) throw feeErr;

        const studentFees = (feeData || []) as StudentFee[];
        setFees(studentFees);

        if (studentFees.length === 0) {
          setLoading(false);
          return;
        }

        const feeIds = studentFees.map((f) => f.id);

        // Fetch related data in parallel
        const [instRes, challanRes, paymentRes, structRes] = await Promise.all([
          supabase
            .from("fee_installments")
            .select("*")
            .in("student_fee_id", feeIds)
            .order("installment_number", { ascending: true }),
          supabase
            .from("fee_challans")
            .select("*")
            .in("student_fee_id", feeIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("fee_payments")
            .select("*")
            .in("student_fee_id", feeIds)
            .order("payment_date", { ascending: false }),
          supabase
            .from("fee_structures")
            .select("id, name")
            .in("id", studentFees.map((f) => f.fee_structure_id).filter(Boolean)),
        ]);

        if (instRes.error) console.error("Installments fetch error:", instRes.error);
        if (challanRes.error) console.error("Challans fetch error:", challanRes.error);
        if (paymentRes.error) console.error("Payments fetch error:", paymentRes.error);
        if (structRes.error) console.error("Structures fetch error:", structRes.error);

        setInstallments((instRes.data || []) as FeeInstallment[]);
        setChallans((challanRes.data || []) as FeeChallan[]);
        setPayments((paymentRes.data || []) as FeePayment[]);
        setStructures((structRes.data || []) as FeeStructure[]);
      } catch (err: any) {
        console.error("Error loading student fees:", err);
        toast.error("Failed to load fee data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  // Compute aggregated stats for the current student
  const stats = useMemo(() => {
    const totalPayable = fees.reduce((sum, f) => sum + f.payable_total, 0);
    const totalPaid = fees.reduce((sum, f) => sum + f.already_paid, 0);
    const remaining = totalPayable - totalPaid;
    const collectionPercent = totalPayable > 0 ? (totalPaid / totalPayable) * 100 : 0;

    const pendingCount = fees.filter((f) => f.status === "pending" || f.status === "installment").length;
    const overdueCount = fees.filter((f) => f.status === "overdue").length;
    const paidCount = fees.filter((f) => f.status === "paid").length;

    return {
      totalPayable,
      totalPaid,
      remaining,
      collectionPercent,
      pendingCount,
      overdueCount,
      paidCount,
    };
  }, [fees]);

  // Group installments by fee for the installments tab
  const groupedInstallments = useMemo(() => {
    return fees.map((fee) => ({
      fee,
      structure: structures.find((s) => s.id === fee.fee_structure_id),
      installments: installments.filter((i) => i.student_fee_id === fee.id),
      challans: challans.filter((c) => c.student_fee_id === fee.id),
      payments: payments.filter((p) => p.student_fee_id === fee.id),
    }));
  }, [fees, installments, challans, payments, structures]);

  // Loading state
  if (!studentId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-3 text-slate-500">Loading your profile...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-blue-600" />
            My Fees & Installments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your fee status, installments, challans, and payments
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <span className="ml-3 text-slate-500">Loading fee data...</span>
          </div>
        ) : fees.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center py-16">
              <DollarSign className="h-16 w-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Fee Records Found</h3>
              <p className="text-slate-500 text-center max-w-md">
                You have no fee records yet. Contact the finance department if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Payable</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.totalPayable)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Paid</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.totalPaid)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Remaining</p>
                    <p className="text-xl font-bold">{formatCurrency(stats.remaining)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Collection</p>
                    <p className="text-xl font-bold">{stats.collectionPercent.toFixed(0)}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b bg-white rounded-t-lg p-2 shadow-sm">
              {[
                { key: "overview", label: "Overview", icon: Eye },
                { key: "installments", label: "Installments", icon: Calendar },
                { key: "challans", label: "Challans", icon: Receipt },
                { key: "payments", label: "Payments", icon: CreditCard },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-blue-500 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  } rounded-t`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b-lg shadow-lg p-6 space-y-6">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <>
                  {fees.map((fee) => {
                    const struct = structures.find((s) => s.id === fee.fee_structure_id);
                    const percent = (fee.already_paid / fee.payable_total) * 100;

                    return (
                      <Card key={fee.id} className="border-2 hover:shadow-md transition-shadow">
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">
                                {struct?.name || "Fee Record"} {struct && `(${struct.name})`}
                              </h3>
                              <p className="text-sm text-slate-500">Created: {formatDate(fee.created_at)}</p>
                            </div>
                            <Badge className={getStatusColor(fee.status)}>{fee.status.toUpperCase()}</Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-xs text-gray-500">Actual Total</p>
                              <p className="font-bold">{formatCurrency(fee.actual_total)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Discount</p>
                              <p className="font-bold text-green-600">
                                {fee.discount_type === "percentage"
                                  ? `${fee.discount_value}%`
                                  : formatCurrency(fee.discount_value)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Payable</p>
                              <p className="font-bold text-blue-600">{formatCurrency(fee.payable_total)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Paid</p>
                              <p className="font-bold text-green-600">{formatCurrency(fee.already_paid)}</p>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Payment Progress</span>
                              <span className="font-medium">{percent.toFixed(0)}%</span>
                            </div>
                            <Progress value={percent} className="h-2" />
                            <p className="text-sm text-slate-600 mt-1">
                              Remaining: <span className="font-semibold text-red-600">{formatCurrency(fee.payable_total - fee.already_paid)}</span>
                            </p>
                          </div>

                          {fee.due_date && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="h-4 w-4" />
                              Due Date: {formatDate(fee.due_date)}
                              {new Date(fee.due_date) < new Date() && fee.status !== "paid" && (
                                <Badge variant="destructive" className="ml-2">Overdue</Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}

              {/* Installments Tab */}
              {activeTab === "installments" && (
                <>
                  {groupedInstallments.map(({ fee, installments, structure }) => (
                    <Card key={fee.id} className="border-2">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-lg">
                            {structure?.name || "Fee"} – Installments
                          </h3>
                          <Badge className={getStatusColor(fee.status)}>{fee.status}</Badge>
                        </div>

                        {installments.length === 0 ? (
                          <p className="text-sm text-slate-500">No installments for this fee.</p>
                        ) : (
                          <div className="space-y-3">
                            {installments.map((inst) => (
                              <div
                                key={inst.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex-1 flex flex-wrap items-center gap-4 text-sm">
                                  <span className="font-medium">#{inst.installment_number}</span>
                                  <span className="font-bold text-blue-600">{formatCurrency(inst.amount)}</span>
                                  <span className="text-gray-500">
                                    Due: {formatDate(inst.due_date)}
                                  </span>
                                  {inst.status === "approved" && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                      <Check className="h-3 w-3" /> Approved
                                    </span>
                                  )}
                                  {inst.rejection_reason && (
                                    <span className="text-xs text-red-600">Rejected: {inst.rejection_reason}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={getStatusColor(inst.status)}>{inst.status}</Badge>
                                  {inst.status === "paid" && inst.paid_at && (
                                    <span className="text-xs text-gray-500">Paid: {formatDate(inst.paid_at)}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {installments.length === 0 && (
                    <p className="text-center py-10 text-slate-500">No installments found for any fee.</p>
                  )}
                </>
              )}

              {/* Challans Tab */}
              {activeTab === "challans" && (
                <>
                  {challans.length === 0 ? (
                    <div className="text-center py-16">
                      <Receipt className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">No challans issued yet.</p>
                    </div>
                  ) : (
                    challans.map((challan) => (
                      <Card key={challan.id} className="border-2 hover:shadow-md transition-shadow">
                        <CardContent className="p-6 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-lg">Challan #{challan.challan_number}</h3>
                              <p className="text-sm text-slate-500">Issued: {formatDate(challan.issued_at)}</p>
                            </div>
                            <Badge className={getStatusColor(challan.status)}>{challan.status}</Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Amount:</span>
                              <p className="font-bold">{formatCurrency(challan.total_amount)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Due Date:</span>
                              <p>{formatDate(challan.due_date)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Method:</span>
                              <p className="capitalize">{challan.payment_method || "N/A"}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Paid:</span>
                              <p>{challan.paid_at ? formatDate(challan.paid_at) : "Not paid"}</p>
                            </div>
                          </div>

                          {challan.notes && (
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">Note: {challan.notes}</p>
                          )}

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled>
                              <Download className="h-4 w-4 mr-1" /> Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </>
              )}

              {/* Payments Tab */}
              {activeTab === "payments" && (
                <>
                  {payments.length === 0 ? (
                    <div className="text-center py-16">
                      <CreditCard className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">No payments recorded yet.</p>
                    </div>
                  ) : (
                    payments.map((payment) => {
                      const challan = challans.find((c) => c.id === payment.challan_id);
                      return (
                        <Card key={payment.id} className="border-2">
                          <CardContent className="p-6 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-bold text-lg">
                                  Payment – {formatCurrency(payment.amount)}
                                </h3>
                                <p className="text-sm text-slate-500">
                                  Date: {formatDate(payment.payment_date)}
                                </p>
                              </div>
                              <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Method:</span>
                                <p className="capitalize">{payment.payment_method || "N/A"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Reference:</span>
                                <p>{payment.reference_no || "N/A"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Challan:</span>
                                <p>{challan?.challan_number || "N/A"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Remarks:</span>
                                <p>{payment.remarks || "—"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}