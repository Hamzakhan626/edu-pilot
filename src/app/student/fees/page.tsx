/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Download,
  FileText,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Receipt,
  Eye,
  Send,
  ChevronRight,
  Lock,
  TrendingUp,
  Wallet,
  X,
  Check,
  Info,
  AlertTriangle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import supabase from "@/lib/supabase/client";

type FeeStatus = "pending" | "installment" | "paid" | "overdue" | "cancelled";
type InstallmentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "overdue";
type ChallanStatus = "generated" | "issued" | "paid" | "cancelled" | "overdue";

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
}

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
  status: ChallanStatus;
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
  description: string | null;
  base_tuition: number;
  hostel_fee: number;
  transport_fee: number;
  misc_fee: number;
  currency: string;
  is_active: boolean;
}

const getPaymentPercentage = (paid: number, total: number) =>
  total > 0 ? (paid / total) * 100 : 0;

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

const formatCurrency = (amount: number, currency = "PKR") => {
  return `${currency} ${amount.toLocaleString()}`;
};

const getDaysRemaining = (dateString: string | null) => {
  if (!dateString) return null;
  const due = new Date(dateString);
  const today = new Date();
  const diff = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
};

export default function StudentFeePortal() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [myFee, setMyFee] = useState<StudentFee | null>(null);
  const [feeStructure, setFeeStructure] = useState<FeeStructure | null>(null);
  const [installments, setInstallments] = useState<FeeInstallment[]>([]);
  const [challans, setChallans] = useState<FeeChallan[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);

  // Dialog states
  const [installmentDialog, setInstallmentDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [challanDetailDialog, setChallanDetailDialog] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<FeeChallan | null>(
    null,
  );

  // Tab state
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "installments" | "challans" | "payments"
  >("overview");

  // Installment form
  const [installmentForm, setInstallmentForm] = useState({
    numberOfInstallments: "3",
    reason: "",
  });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    challanId: "",
    amount: "",
    paymentMethod: "bank_transfer",
    referenceNo: "",
    remarks: "",
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        if (!userId) {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        const { data: userRow } = await supabase
          .from("users")
          .select("id, full_name, email, phone, role")
          .eq("id", userId)
          .single();

        const role = userRow?.role;
        if (role !== "student") {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }
        setIsAuthorized(true);
        setCurrentUser(userRow as User);

        // Load student's fee data
        const { data: feeData, error: feeError } = await supabase
          .from("student_fees")
          .select("*")
          .eq("student_id", userId)
          .single();

        if (feeError && feeError.code !== "PGRST116") throw feeError;

        if (feeData) {
          setMyFee(feeData as StudentFee);

          // Load fee structure
          if (feeData.fee_structure_id) {
            const { data: structData } = await supabase
              .from("fee_structures")
              .select("*")
              .eq("id", feeData.fee_structure_id)
              .single();
            if (structData) setFeeStructure(structData as FeeStructure);
          }

          // Load installments
          const { data: instData } = await supabase
            .from("fee_installments")
            .select("*")
            .eq("student_fee_id", feeData.id)
            .order("installment_number", { ascending: true });
          if (instData) setInstallments(instData as FeeInstallment[]);

          // Load challans
          const { data: challanData } = await supabase
            .from("fee_challans")
            .select("*")
            .eq("student_fee_id", feeData.id)
            .order("created_at", { ascending: false });
          if (challanData) setChallans(challanData as FeeChallan[]);

          // Load payments
          const { data: paymentData } = await supabase
            .from("fee_payments")
            .select("*")
            .eq("student_fee_id", feeData.id)
            .order("payment_date", { ascending: false });
          if (paymentData) setPayments(paymentData as FeePayment[]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading student fee data:", err);
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleRequestInstallment = async () => {
    if (!myFee || !currentUser) return;

    const numInstallments = parseInt(installmentForm.numberOfInstallments);
    if (numInstallments < 2 || numInstallments > 12) {
      alert("Please enter a valid number of installments (2-12)");
      return;
    }

    if (!installmentForm.reason.trim()) {
      alert("Please provide a reason for requesting installment plan");
      return;
    }

    try {
      const remaining = myFee.payable_total - myFee.already_paid;
      const installmentAmount = Math.ceil(remaining / numInstallments);

      const installmentsToCreate = [];
      for (let i = 1; i <= numInstallments; i++) {
        const isLast = i === numInstallments;
        const amount = isLast
          ? remaining - installmentAmount * (numInstallments - 1)
          : installmentAmount;

        installmentsToCreate.push({
          student_fee_id: myFee.id,
          installment_number: i,
          amount: amount,
          due_date: new Date(
            Date.now() + i * 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "pending",
          requested_by: currentUser.id,
        });
      }

      const { error } = await supabase
        .from("fee_installments")
        .insert(installmentsToCreate);

      if (error) throw error;

      // Reload installments
      const { data: newInst } = await supabase
        .from("fee_installments")
        .select("*")
        .eq("student_fee_id", myFee.id)
        .order("installment_number", { ascending: true });

      if (newInst) setInstallments(newInst as FeeInstallment[]);

      // Update fee status
      await supabase
        .from("student_fees")
        .update({ status: "installment" })
        .eq("id", myFee.id);

      const { data: updatedFee } = await supabase
        .from("student_fees")
        .select("*")
        .eq("id", myFee.id)
        .single();

      if (updatedFee) setMyFee(updatedFee as StudentFee);

      alert(
        "Installment plan request submitted successfully! Awaiting admin approval.",
      );
      setInstallmentDialog(false);
      setInstallmentForm({ numberOfInstallments: "3", reason: "" });
    } catch (err: any) {
      console.error("Request installment error:", err);
      alert(`Failed to request installment: ${err.message || "Unknown error"}`);
    }
  };

  const handleSubmitPayment = async () => {
    if (
      !paymentForm.challanId ||
      !paymentForm.amount ||
      !paymentForm.referenceNo
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      // This would typically integrate with a payment gateway
      // For now, we'll just record the payment details
      alert(
        `Payment Initiated:\n\nAmount: ${formatCurrency(amount)}\nMethod: ${paymentForm.paymentMethod}\nReference: ${paymentForm.referenceNo}\n\nPlease complete the payment through your bank and the admin will verify and confirm your payment.`,
      );

      setPaymentDialog(false);
      setPaymentForm({
        challanId: "",
        amount: "",
        paymentMethod: "bank_transfer",
        referenceNo: "",
        remarks: "",
      });
    } catch (err: any) {
      console.error("Payment error:", err);
      alert(`Payment failed: ${err.message || "Unknown error"}`);
    }
  };

  const stats = useMemo(() => {
    if (!myFee) return null;

    const totalDue = myFee.payable_total;
    const totalPaid = myFee.already_paid;
    const remaining = totalDue - totalPaid;
    const percentage = getPaymentPercentage(totalPaid, totalDue);

    const pendingChallans = challans.filter(
      (c) => c.status === "issued" || c.status === "generated",
    ).length;
    const paidChallans = challans.filter((c) => c.status === "paid").length;

    const daysRemaining = getDaysRemaining(myFee.due_date);

    return {
      totalDue,
      totalPaid,
      remaining,
      percentage,
      pendingChallans,
      paidChallans,
      daysRemaining,
    };
  }, [myFee, challans]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your fee information...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="flex flex-col items-center p-8">
            <div className="p-4 bg-red-100 rounded-full mb-4">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 text-center">
              This page is only accessible to students. Please log in with a
              student account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!myFee) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="flex flex-col items-center p-8">
            <div className="p-4 bg-yellow-100 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Fee Record Found
            </h2>
            <p className="text-gray-600 text-center">
              Your fee record has not been created yet. Please contact the
              finance office.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              My Fee Portal
            </h1>
            <p className="text-gray-600">
              Welcome back, {currentUser?.full_name || "Student"}! Manage your
              fees and payments.
            </p>
          </div>
          <Badge variant="outline" className="mt-4 md:mt-0 text-lg px-4 py-2">
            {feeStructure?.name || "Standard Fee"}
          </Badge>
        </div>

        {/* Alert for overdue */}
        {myFee.status === "overdue" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Payment Overdue</AlertTitle>
            <AlertDescription>
              Your fee payment is overdue. Please make a payment as soon as
              possible to avoid penalties.
            </AlertDescription>
          </Alert>
        )}

        {/* Alert for pending due date */}
        {stats &&
          stats.daysRemaining !== null &&
          stats.daysRemaining > 0 &&
          stats.daysRemaining <= 7 &&
          myFee.status !== "paid" && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Payment Due Soon</AlertTitle>
              <AlertDescription>
                Your fee payment is due in {stats.daysRemaining} day
                {stats.daysRemaining !== 1 ? "s" : ""}. Please make a payment
                before {formatDate(myFee.due_date)}.
              </AlertDescription>
            </Alert>
          )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Fee</p>
                  <p className="text-3xl font-bold mt-2">
                    {formatCurrency(stats!.totalDue)}
                  </p>
                  {myFee.discount_value > 0 && (
                    <p className="text-blue-100 text-xs mt-1">
                      {myFee.discount_type === "percentage"
                        ? `${myFee.discount_value}% discount`
                        : `${formatCurrency(myFee.discount_value)} discount`}
                    </p>
                  )}
                </div>
                <DollarSign className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Amount Paid
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {formatCurrency(stats!.totalPaid)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {stats!.percentage.toFixed(0)}% completed
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Remaining</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {formatCurrency(stats!.remaining)}
                  </p>
                  {myFee.due_date && (
                    <p className="text-gray-500 text-xs mt-1">
                      Due: {formatDate(myFee.due_date)}
                    </p>
                  )}
                </div>
                <Wallet className="h-12 w-12 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Status</p>
                  <Badge
                    variant={
                      myFee.status === "paid"
                        ? "default"
                        : myFee.status === "overdue"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-lg mt-2"
                  >
                    {myFee.status.toUpperCase()}
                  </Badge>
                  <p className="text-gray-500 text-xs mt-2">
                    {payments.length} payment{payments.length !== 1 ? "s" : ""}{" "}
                    made
                  </p>
                </div>
                <Receipt className="h-12 w-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Progress */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">
                  Payment Progress
                </h3>
                <span className="text-2xl font-bold text-blue-600">
                  {stats!.percentage.toFixed(0)}%
                </span>
              </div>
              <Progress value={stats!.percentage} className="h-4" />
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total Due</p>
                  <p className="font-bold text-gray-900">
                    {formatCurrency(stats!.totalDue)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Paid</p>
                  <p className="font-bold text-green-600">
                    {formatCurrency(stats!.totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Remaining</p>
                  <p className="font-bold text-red-600">
                    {formatCurrency(stats!.remaining)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            size="lg"
            className="h-auto py-6"
            disabled={myFee.status === "paid" || installments.length > 0}
            onClick={() => setInstallmentDialog(true)}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Request Installment Plan
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-auto py-6"
            disabled={challans.filter((c) => c.status !== "paid").length === 0}
            onClick={() => {
              const unpaidChallan = challans.find((c) => c.status !== "paid");
              if (unpaidChallan) {
                setPaymentForm({
                  ...paymentForm,
                  challanId: unpaidChallan.id,
                  amount: unpaidChallan.total_amount.toString(),
                });
                setPaymentDialog(true);
              }
            }}
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Make Payment
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-auto py-6"
            onClick={() => setSelectedTab("challans")}
          >
            <Receipt className="mr-2 h-5 w-5" />
            View Challans ({challans.length})
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b bg-white rounded-t-lg p-2">
          {[
            { key: "overview", label: "Fee Breakdown", icon: Info },
            {
              key: "installments",
              label: "Installments",
              icon: Calendar,
              count: installments.length,
            },
            {
              key: "challans",
              label: "Challans",
              icon: Receipt,
              count: challans.length,
            },
            {
              key: "payments",
              label: "Payment History",
              icon: CreditCard,
              count: payments.length,
            },
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
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg shadow-lg">
          {/* Overview Tab */}
          {selectedTab === "overview" && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Fee Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-2">
                    <CardContent className="p-6">
                      <h4 className="font-semibold text-gray-700 mb-4">
                        Original Charges
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tuition Fee</span>
                          <span className="font-bold">
                            {formatCurrency(myFee.actual_tuition)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hostel Fee</span>
                          <span className="font-bold">
                            {formatCurrency(myFee.actual_hostel)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transport Fee</span>
                          <span className="font-bold">
                            {formatCurrency(myFee.actual_transport)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Miscellaneous</span>
                          <span className="font-bold">
                            {formatCurrency(myFee.actual_misc)}
                          </span>
                        </div>
                        <div className="border-t pt-3 flex justify-between">
                          <span className="font-semibold text-gray-900">
                            Subtotal
                          </span>
                          <span className="font-bold text-lg">
                            {formatCurrency(myFee.actual_total)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardContent className="p-6">
                      <h4 className="font-semibold text-gray-700 mb-4">
                        After Discount
                      </h4>
                      <div className="space-y-3">
                        {myFee.discount_value > 0 ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Subtotal</span>
                              <span className="font-bold">
                                {formatCurrency(myFee.actual_total)}
                              </span>
                            </div>
                            <div className="flex justify-between text-green-600">
                              <span>
                                Discount (
                                {myFee.discount_type === "percentage"
                                  ? `${myFee.discount_value}%`
                                  : "Fixed"}
                                )
                              </span>
                              <span className="font-bold">
                                -
                                {myFee.discount_type === "percentage"
                                  ? formatCurrency(
                                      (myFee.actual_total *
                                        myFee.discount_value) /
                                        100,
                                    )
                                  : formatCurrency(myFee.discount_value)}
                              </span>
                            </div>
                            {myFee.discount_reason && (
                              <p className="text-xs text-gray-500 italic">
                                Reason: {myFee.discount_reason}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-500 italic">
                            No discount applied
                          </p>
                        )}
                        <div className="border-t pt-3 flex justify-between">
                          <span className="font-semibold text-gray-900">
                            Total Payable
                          </span>
                          <span className="font-bold text-2xl text-blue-600">
                            {formatCurrency(myFee.payable_total)}
                          </span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span className="font-semibold">Already Paid</span>
                          <span className="font-bold text-lg">
                            {formatCurrency(myFee.already_paid)}
                          </span>
                        </div>
                        <div className="border-t pt-3 flex justify-between">
                          <span className="font-semibold text-gray-900">
                            Balance Due
                          </span>
                          <span className="font-bold text-2xl text-red-600">
                            {formatCurrency(stats!.remaining)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {myFee.due_date && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Payment Deadline</AlertTitle>
                  <AlertDescription>
                    Full payment is due by{" "}
                    <strong>{formatDate(myFee.due_date)}</strong>
                    {stats!.daysRemaining !== null && (
                      <>
                        {" "}
                        (
                        {stats!.daysRemaining > 0
                          ? `${stats!.daysRemaining} days remaining`
                          : `${Math.abs(stats!.daysRemaining)} days overdue`}
                        )
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Installments Tab */}
          {selectedTab === "installments" && (
            <div className="p-6 space-y-4">
              {installments.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No Installment Plan
                  </h3>
                  <p className="text-gray-500 mb-4">
                    You haven't requested an installment plan yet. Would you
                    like to split your payment into installments?
                  </p>
                  <Button
                    onClick={() => setInstallmentDialog(true)}
                    disabled={myFee.status === "paid"}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Request Installment Plan
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">
                      Your Installment Plan
                    </h3>
                    <Badge variant="outline">
                      {installments.filter((i) => i.status === "paid").length} /{" "}
                      {installments.length} Paid
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {installments.map((inst) => (
                      <Card key={inst.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-bold text-lg">
                                  Installment {inst.installment_number}
                                </span>
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
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Amount</p>
                                  <p className="font-bold text-blue-600">
                                    {formatCurrency(inst.amount)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Due Date</p>
                                  <p className="font-medium">
                                    {formatDate(inst.due_date)}
                                  </p>
                                </div>
                                {inst.paid_at && (
                                  <div>
                                    <p className="text-gray-500">Paid On</p>
                                    <p className="font-medium text-green-600">
                                      {formatDate(inst.paid_at)}
                                    </p>
                                  </div>
                                )}
                                {inst.payment_reference && (
                                  <div>
                                    <p className="text-gray-500">Reference</p>
                                    <p className="font-medium">
                                      {inst.payment_reference}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {inst.approval_notes && (
                                <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                  Admin note: {inst.approval_notes}
                                </p>
                              )}
                              {inst.rejection_reason && (
                                <Alert variant="destructive" className="mt-2">
                                  <X className="h-4 w-4" />
                                  <AlertTitle>Rejected</AlertTitle>
                                  <AlertDescription>
                                    {inst.rejection_reason}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                            <div className="ml-4">
                              {inst.status === "paid" ? (
                                <CheckCircle className="h-8 w-8 text-green-500" />
                              ) : inst.status === "pending" ? (
                                <Clock className="h-8 w-8 text-yellow-500" />
                              ) : inst.status === "rejected" ? (
                                <X className="h-8 w-8 text-red-500" />
                              ) : (
                                <Check className="h-8 w-8 text-blue-500" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-4">
                    <Progress
                      value={
                        (installments.filter((i) => i.status === "paid")
                          .length /
                          installments.length) *
                        100
                      }
                      className="h-3"
                    />
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      {installments.filter((i) => i.status === "paid").length}{" "}
                      of {installments.length} installments paid
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Challans Tab */}
          {selectedTab === "challans" && (
            <div className="p-6 space-y-4">
              {challans.length === 0 ? (
                <div className="text-center py-16">
                  <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No Challans Generated
                  </h3>
                  <p className="text-gray-500">
                    Fee challans will appear here once generated by the finance
                    office.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {challans.map((challan) => (
                    <Card key={challan.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-lg">
                                Challan #{challan.challan_number}
                              </h4>
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
                                <p className="font-bold text-blue-600">
                                  {formatCurrency(challan.total_amount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Due Date</p>
                                <p className="font-medium">
                                  {formatDate(challan.due_date)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Issued On</p>
                                <p className="font-medium">
                                  {formatDate(challan.issued_at)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Payment Method</p>
                                <p className="font-medium capitalize">
                                  {challan.payment_method || "Any"}
                                </p>
                              </div>
                            </div>
                            {challan.notes && (
                              <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                Note: {challan.notes}
                              </p>
                            )}
                          </div>
                          <div className="ml-4 flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedChallan(challan);
                                setChallanDetailDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                            {challan.status !== "paid" &&
                              challan.status !== "cancelled" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setPaymentForm({
                                      ...paymentForm,
                                      challanId: challan.id,
                                      amount: challan.total_amount.toString(),
                                    });
                                    setPaymentDialog(true);
                                  }}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Pay Now
                                </Button>
                              )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {selectedTab === "payments" && (
            <div className="p-6 space-y-4">
              {payments.length === 0 ? (
                <div className="text-center py-16">
                  <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No Payment History
                  </h3>
                  <p className="text-gray-500">
                    Your payment history will appear here once you make
                    payments.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => {
                    const relatedChallan = challans.find(
                      (c) => c.id === payment.challan_id,
                    );
                    return (
                      <Card key={payment.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-bold text-lg">
                                  {formatCurrency(payment.amount)}
                                </h4>
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
                                  <p className="font-medium">
                                    {formatDate(payment.payment_date)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Method</p>
                                  <p className="font-medium capitalize">
                                    {payment.payment_method || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Reference No.</p>
                                  <p className="font-medium">
                                    {payment.reference_no || "N/A"}
                                  </p>
                                </div>
                                {relatedChallan && (
                                  <div>
                                    <p className="text-gray-500">Challan</p>
                                    <p className="font-medium">
                                      #{relatedChallan.challan_number}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {payment.remarks && (
                                <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                  Remarks: {payment.remarks}
                                </p>
                              )}
                            </div>
                            <div className="ml-4">
                              <Button size="sm" variant="outline">
                                <FileText className="h-4 w-4 mr-1" />
                                Receipt
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Request Installment Dialog */}
        <Dialog open={installmentDialog} onOpenChange={setInstallmentDialog}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>Request Installment Plan</DialogTitle>
              <DialogDescription>
                Split your fee payment into multiple installments. Subject to
                admin approval.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Remaining Balance</AlertTitle>
                <AlertDescription>
                  You need to pay {formatCurrency(stats!.remaining)}. Choose how
                  many installments you'd like.
                </AlertDescription>
              </Alert>
              <div>
                <Label>Number of Installments (2-12)</Label>
                <Input
                  type="number"
                  min="2"
                  max="12"
                  value={installmentForm.numberOfInstallments}
                  onChange={(e) =>
                    setInstallmentForm({
                      ...installmentForm,
                      numberOfInstallments: e.target.value,
                    })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  Approx.{" "}
                  {formatCurrency(
                    Math.ceil(
                      stats!.remaining /
                        parseInt(installmentForm.numberOfInstallments || "3"),
                    ),
                  )}{" "}
                  per installment
                </p>
              </div>
              <div>
                <Label>Reason for Request</Label>
                <Textarea
                  value={installmentForm.reason}
                  onChange={(e) =>
                    setInstallmentForm({
                      ...installmentForm,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Please explain why you need an installment plan..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setInstallmentDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleRequestInstallment}>
                <Send className="mr-2 h-4 w-4" />
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>Make Payment</DialogTitle>
              <DialogDescription>
                Submit your payment details. Payment will be verified by the
                finance office.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Payment Instructions</AlertTitle>
                <AlertDescription>
                  Make the payment through your bank, then enter the transaction
                  details here for verification.
                </AlertDescription>
              </Alert>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={(val) =>
                    setPaymentForm({ ...paymentForm, paymentMethod: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="online">Online Payment</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Transaction Reference Number *</Label>
                <Input
                  value={paymentForm.referenceNo}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      referenceNo: e.target.value,
                    })
                  }
                  placeholder="Enter transaction ID..."
                />
              </div>
              <div>
                <Label>Remarks (Optional)</Label>
                <Textarea
                  value={paymentForm.remarks}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, remarks: e.target.value })
                  }
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitPayment}>
                <CreditCard className="mr-2 h-4 w-4" />
                Submit Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Challan Detail Dialog */}
        <Dialog
          open={challanDetailDialog}
          onOpenChange={setChallanDetailDialog}
        >
          <DialogContent className="sm:max-w-[600px] bg-white">
            <DialogHeader>
              <DialogTitle>Challan Details</DialogTitle>
              <DialogDescription>
                Challan #{selectedChallan?.challan_number}
              </DialogDescription>
            </DialogHeader>
            {selectedChallan && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Amount</Label>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(selectedChallan.total_amount)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Status</Label>
                    <Badge
                      variant={
                        selectedChallan.status === "paid"
                          ? "default"
                          : selectedChallan.status === "overdue"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-lg mt-1"
                    >
                      {selectedChallan.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-500">Due Date</Label>
                    <p className="font-medium">
                      {formatDate(selectedChallan.due_date)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Issued Date</Label>
                    <p className="font-medium">
                      {formatDate(selectedChallan.issued_at)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Payment Method</Label>
                    <p className="font-medium capitalize">
                      {selectedChallan.payment_method || "Any"}
                    </p>
                  </div>
                  {selectedChallan.paid_at && (
                    <div>
                      <Label className="text-gray-500">Paid On</Label>
                      <p className="font-medium text-green-600">
                        {formatDate(selectedChallan.paid_at)}
                      </p>
                    </div>
                  )}
                </div>
                {selectedChallan.billing_address && (
                  <div>
                    <Label className="text-gray-500">Billing Address</Label>
                    <p className="text-sm mt-1 p-2 bg-gray-50 rounded">
                      {selectedChallan.billing_address}
                    </p>
                  </div>
                )}
                {selectedChallan.notes && (
                  <div>
                    <Label className="text-gray-500">Notes</Label>
                    <p className="text-sm mt-1 p-2 bg-gray-50 rounded">
                      {selectedChallan.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setChallanDetailDialog(false)}
              >
                Close
              </Button>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
