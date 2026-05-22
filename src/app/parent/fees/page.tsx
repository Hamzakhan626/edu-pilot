"use client"
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  CreditCard,
  Calendar,
  Receipt,
  TrendingUp,
  FileText,
  Info,
  BookOpen,
  GraduationCap,
  Building,
  Wallet,
  FileCheck,
  AlertCircleIcon,
  User,
  Phone,
  Mail,
  LucideIcon,
} from "lucide-react";

type InstallmentStatus = "no_request" | "pending" | "approved" | "rejected";
type PaymentStatus = "paid" | "pending" | "upcoming";

const INSTALLMENT_STATUS: InstallmentStatus = "approved";

const studentInfo = {
  name: "Muhammad Ahmed",
  studentId: "CS-2023-0456",
  program: "Bachelor of Science in Computer Science",
  department: "Computer Science",
  semester: "Fall 2024",
  semesterNumber: 5,
  cgpa: 3.45,
  enrollmentStatus: "Active",
  grade: "Semester 5",
  section: "A",
};

const parentInfo = {
  name: "Mr. Ahmed Ali",
  relationship: "Father",
  email: "ahmed.ali@example.com",
  phone: "+92 300 1234567",
};

interface Course {
  id: string;
  name: string;
  creditHours: number;
  instructor: string;
  fee: number;
  type: string;
  schedule: string;
}

const registeredCourses: Course[] = [
  {
    id: "CS401",
    name: "Data Structures & Algorithms",
    creditHours: 3,
    instructor: "Dr. Sarah Ahmed",
    fee: 12000,
    type: "Core",
    schedule: "Mon, Wed 9:00-10:30 AM",
  },
  {
    id: "CS402",
    name: "Database Systems",
    creditHours: 3,
    instructor: "Prof. Ali Hassan",
    fee: 12000,
    type: "Core",
    schedule: "Tue, Thu 11:00-12:30 PM",
  },
  {
    id: "CS403",
    name: "Operating Systems",
    creditHours: 3,
    instructor: "Dr. Fatima Khan",
    fee: 12000,
    type: "Core",
    schedule: "Mon, Wed 2:00-3:30 PM",
  },
  {
    id: "CS404L",
    name: "Database Lab",
    creditHours: 1,
    instructor: "Mr. Usman Ali",
    fee: 4000,
    type: "Lab",
    schedule: "Fri 10:00-1:00 PM",
  },
  {
    id: "ENG301",
    name: "Technical Writing",
    creditHours: 2,
    instructor: "Ms. Ayesha Malik",
    fee: 8000,
    type: "General",
    schedule: "Thu 3:00-4:00 PM",
  },
];

interface FeeItem {
  category: string;
  amount: number;
  description?: string;
  paid?: boolean;
  optional?: boolean;
  dueDate?: string;
}

const feeBreakdown = {
  tuitionFees: [
    {
      category: "Course Registration Fee",
      amount: 48000,
      description: "12 credit hours × PKR 4,000",
    },
  ],
  semesterFees: [
    { category: "Admission Processing Fee", amount: 2000, paid: true },
    { category: "Library Fee", amount: 2500, paid: false },
    { category: "Sports & Recreation Fee", amount: 1500, paid: false },
    { category: "Student Activity Fee", amount: 1000, paid: false },
    { category: "Medical & Health Services", amount: 1500, paid: false },
    { category: "IT & Lab Services", amount: 2500, paid: false },
  ],
  additionalFees: [
    {
      category: "Transportation Fee (Optional)",
      amount: 5000,
      paid: false,
      optional: true,
    },
    {
      category: "Hostel Fee (Optional)",
      amount: 15000,
      paid: false,
      optional: true,
    },
  ],
  examinationFees: [
    {
      category: "Mid-Term Exam Fee",
      amount: 1500,
      paid: false,
      dueDate: "2024-10-15",
    },
    {
      category: "Final Exam Fee",
      amount: 2000,
      paid: false,
      dueDate: "2024-12-15",
    },
  ],
  otherCharges: [
    { category: "Internet & WiFi Access", amount: 1000, paid: false },
    { category: "Student ID Card", amount: 500, paid: true },
    { category: "Development Fund", amount: 3000, paid: false },
  ],
};

interface FinancialAid {
  id: number;
  name: string;
  amount: number;
  type: string;
  semester: string;
  status: string;
  description: string;
}

const financialAid: FinancialAid[] = [
  {
    id: 1,
    name: "Merit Scholarship",
    amount: 15000,
    type: "Merit Based",
    semester: "Fall 2024",
    status: "Active",
    description: "Based on CGPA 3.45",
  },
  {
    id: 2,
    name: "Need-Based Grant",
    amount: 8000,
    type: "Need Based",
    semester: "Fall 2024",
    status: "Active",
    description: "Financial assistance program",
  },
  {
    id: 3,
    name: "Sports Excellence Award",
    amount: 5000,
    type: "Sports",
    semester: "Fall 2024",
    status: "Active",
    description: "Cricket team captain",
  },
];

interface SemesterHistory {
  semester: string;
  totalFee: number;
  paid: number;
  status: string;
  cgpa: number;
  credits: number;
}

const semesterHistory: SemesterHistory[] = [
  {
    semester: "Spring 2024",
    totalFee: 68000,
    paid: 68000,
    status: "Cleared",
    cgpa: 3.52,
    credits: 15,
  },
  {
    semester: "Fall 2023",
    totalFee: 65000,
    paid: 65000,
    status: "Cleared",
    cgpa: 3.38,
    credits: 14,
  },
];

interface Installment {
  id: number;
  no: number;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: PaymentStatus;
  lateFee: number;
}

const approvedInstallments: Installment[] = [
  {
    id: 1,
    no: 1,
    amount: 20000,
    dueDate: "2024-08-15",
    paidDate: "2024-08-12",
    status: "paid",
    lateFee: 0,
  },
  {
    id: 2,
    no: 2,
    amount: 20000,
    dueDate: "2024-10-15",
    paidDate: "2024-10-18",
    status: "paid",
    lateFee: 500,
  },
  {
    id: 3,
    no: 3,
    amount: 20000,
    dueDate: "2024-12-15",
    paidDate: null,
    status: "pending",
    lateFee: 0,
  },
  {
    id: 4,
    no: 4,
    amount: 20000,
    dueDate: "2025-01-15",
    paidDate: null,
    status: "upcoming",
    lateFee: 0,
  },
];

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  description: string;
  receiptNo: string;
  challanNo: string;
  bankName: string;
}

const paymentHistory: Payment[] = [
  {
    id: "PAY001",
    date: "2024-10-18",
    amount: 20500,
    method: "Bank Transfer",
    description: "Installment #2 Payment + Late Fee",
    receiptNo: "RCP-2024-1018",
    challanNo: "CH-2024-10-456",
    bankName: "HBL",
  },
  {
    id: "PAY002",
    date: "2024-08-12",
    amount: 20000,
    method: "Debit Card",
    description: "Installment #1 Payment",
    receiptNo: "RCP-2024-0812",
    challanNo: "CH-2024-08-234",
    bankName: "MCB",
  },
];

interface StatusCardProps {
  icon: LucideIcon;
  color: string;
  value: string;
  label: string;
  iconColor: string;
}

export default function ParentFeeManagement() {
  const [selectedInst, setSelectedInst] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const tuitionTotal = feeBreakdown.tuitionFees.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const semesterTotal = feeBreakdown.semesterFees.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const examTotal = feeBreakdown.examinationFees.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const otherTotal = feeBreakdown.otherCharges.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const grossTotal = tuitionTotal + semesterTotal + examTotal + otherTotal;
  const scholarshipTotal = financialAid.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const netPayable = grossTotal - scholarshipTotal;

  const totalCreditHours = registeredCourses.reduce(
    (sum, course) => sum + course.creditHours,
    0
  );

  let totalPaid = 0;
  let totalDue = netPayable;
  let progress = 0;

  if (INSTALLMENT_STATUS === "approved") {
    const paid = approvedInstallments.filter((i) => i.status === "paid");
    totalPaid = paid.reduce((sum, i) => sum + i.amount + i.lateFee, 0);
    totalDue = netPayable - totalPaid;
    progress = (totalPaid / netPayable) * 100;
  }

  const today = new Date();
  const fmt = (amt: number): string => `PKR ${amt.toLocaleString()}`;
  const fmtDate = (d: string): string =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const StatusCard = ({
    icon: Icon,
    color,
    value,
    label,
    iconColor,
  }: StatusCardProps) => (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
      <CardContent className="flex items-center p-6">
        <div className={`p-3 ${color} rounded-xl mr-4`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Student Fee Management
          </h1>
          <p className="text-gray-500 mt-1">
            Monitor and manage your child's fee payments and financial details
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-900">
                <GraduationCap className="mr-2 h-5 w-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-white bg-opacity-70 rounded-xl">
                  <span className="text-sm font-medium text-blue-800">Name</span>
                  <span className="font-semibold text-blue-900">{studentInfo.name}</span>
                </div>
                <div className="flex justify-between p-3 bg-white bg-opacity-70 rounded-xl">
                  <span className="text-sm font-medium text-blue-800">Student ID</span>
                  <span className="font-semibold text-blue-900">{studentInfo.studentId}</span>
                </div>
                <div className="flex justify-between p-3 bg-white bg-opacity-70 rounded-xl">
                  <span className="text-sm font-medium text-blue-800">Program</span>
                  <span className="font-semibold text-blue-900">{studentInfo.department}</span>
                </div>
                <div className="flex justify-between p-3 bg-white bg-opacity-70 rounded-xl">
                  <span className="text-sm font-medium text-blue-800">Current Semester</span>
                  <span className="font-semibold text-blue-900">{studentInfo.semester}</span>
                </div>
                <div className="flex justify-between p-3 bg-white bg-opacity-70 rounded-xl">
                  <span className="text-sm font-medium text-blue-800">CGPA</span>
                  <Badge className="bg-blue-600">{studentInfo.cgpa}</Badge>
                </div>
                <div className="flex justify-between p-3 bg-white bg-opacity-70 rounded-xl">
                  <span className="text-sm font-medium text-blue-800">Status</span>
                  <Badge className="bg-green-600">{studentInfo.enrollmentStatus}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-900">
                <User className="mr-2 h-5 w-5" />
                Parent/Guardian Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-white bg-opacity-70 rounded-xl">
                  <span className="text-sm font-medium text-purple-800">Name</span>
                  <span className="font-semibold text-purple-900">{parentInfo.name}</span>
                </div>
                <div className="flex justify-between p-3 bg-white bg-opacity-70 rounded-xl">
                  <span className="text-sm font-medium text-purple-800">Relationship</span>
                  <span className="font-semibold text-purple-900">{parentInfo.relationship}</span>
                </div>
                <div className="flex justify-between p-3 bg-white bg-opacity-70 rounded-xl">
                  <span className="text-sm font-medium text-purple-800 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </span>
                  <span className="font-semibold text-purple-900 text-sm">{parentInfo.email}</span>
                </div>
                <div className="flex justify-between p-3 bg-white bg-opacity-70 rounded-xl">
                  <span className="text-sm font-medium text-purple-800 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </span>
                  <span className="font-semibold text-purple-900">{parentInfo.phone}</span>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl border-2 border-purple-200">
                  <p className="text-xs text-purple-800 text-center">
                    All fee-related notifications will be sent to the registered email and phone number
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {INSTALLMENT_STATUS === "approved" && (
          <>
            {approvedInstallments.filter(
              (i) => i.status === "pending" && new Date(i.dueDate) < today
            ).length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertTitle className="text-red-900 font-semibold">
                  Payment Overdue - Immediate Action Required!
                </AlertTitle>
                <AlertDescription className="text-red-800">
                  Your child&apos;s fee installment is overdue. Late fees are being applied. Please ensure payment is made immediately to avoid additional penalties and potential academic holds.
                </AlertDescription>
              </Alert>
            )}
            {approvedInstallments.filter(
              (i) =>
                i.status === "pending" &&
                new Date(i.dueDate) >= today &&
                new Date(i.dueDate).getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000
            ).length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Clock className="h-5 w-5 text-yellow-600" />
                <AlertTitle className="text-yellow-900 font-semibold">
                  Upcoming Payment Due
                </AlertTitle>
                <AlertDescription className="text-yellow-800">
                  An installment payment is due within the next 7 days. Please arrange payment to avoid late fees.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatusCard
            icon={Wallet}
            color="bg-blue-100"
            iconColor="text-blue-600"
            value={fmt(netPayable)}
            label="Total Fee Amount"
          />
          <StatusCard
            icon={CheckCircle}
            color="bg-green-100"
            iconColor="text-green-600"
            value={fmt(totalPaid)}
            label="Amount Paid"
          />
          <StatusCard
            icon={AlertCircleIcon}
            color="bg-red-100"
            iconColor="text-red-600"
            value={fmt(totalDue)}
            label="Amount Outstanding"
          />
          <StatusCard
            icon={TrendingUp}
            color="bg-purple-100"
            iconColor="text-purple-600"
            value={fmt(scholarshipTotal)}
            label="Scholarships & Aid"
          />
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="flex border-b overflow-x-auto">
              {["overview", "courses", "installments", "history"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-6 py-4 font-medium capitalize transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab === "overview" && <FileText className="h-4 w-4 inline mr-2" />}
                  {tab === "courses" && <BookOpen className="h-4 w-4 inline mr-2" />}
                  {tab === "installments" && <Calendar className="h-4 w-4 inline mr-2" />}
                  {tab === "history" && <Receipt className="h-4 w-4 inline mr-2" />}
                  {tab}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {activeTab === "overview" && (
          <div className="space-y-6">
            {INSTALLMENT_STATUS === "approved" && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                      Payment Progress
                    </span>
                    <span className="text-lg font-normal text-gray-600">
                      {progress.toFixed(1)}% Completed
                    </span>
                  </CardTitle>
                  <CardDescription>Track the payment status for current semester</CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={progress} className="h-3 mb-4" />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Paid: {fmt(totalPaid)}</span>
                    <span>Remaining: {fmt(totalDue)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="flex items-center text-blue-900">
                    <BookOpen className="mr-2 h-5 w-5" />
                    Tuition Fees
                  </CardTitle>
                  <CardDescription>Based on {totalCreditHours} registered credit hours</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  {feeBreakdown.tuitionFees.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start p-3 bg-blue-50 rounded-xl">
                      <div>
                        <p className="font-medium text-blue-900">{item.category}</p>
                        <p className="text-xs text-blue-600">{item.description}</p>
                      </div>
                      <p className="font-bold text-blue-900">{fmt(item.amount)}</p>
                    </div>
                  ))}
                  <div className="pt-3 border-t-2 border-blue-200">
                    <div className="flex justify-between p-3 bg-blue-100 rounded-xl">
                      <span className="font-bold text-blue-900">Tuition Total</span>
                      <span className="font-bold text-blue-900">{fmt(tuitionTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="flex items-center text-green-900">
                    <Building className="mr-2 h-5 w-5" />
                    Semester Fees
                  </CardTitle>
                  <CardDescription>University facilities & services charges</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-2">
                  {feeBreakdown.semesterFees.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        {item.paid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className="font-medium text-sm">{item.category}</span>
                      </div>
                      <span className="font-semibold">{fmt(item.amount)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t-2">
                    <div className="flex justify-between p-3 bg-green-100 rounded-xl">
                      <span className="font-bold text-green-900">Semester Total</span>
                      <span className="font-bold text-green-900">{fmt(semesterTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                  <CardTitle className="flex items-center text-orange-900">
                    <FileCheck className="mr-2 h-5 w-5" />
                    Examination Fees
                  </CardTitle>
                  <CardDescription>Mid-term & final exam charges</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-2">
                  {feeBreakdown.examinationFees.map((item, idx) => (
                    <div key={idx} className="p-3 bg-orange-50 rounded-xl">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{item.category}</span>
                        <span className="font-semibold">{fmt(item.amount)}</span>
                      </div>
                      {item.dueDate && (
                        <p className="text-xs text-orange-600">Due by: {fmtDate(item.dueDate)}</p>
                      )}
                    </div>
                  ))}
                  <div className="pt-3 border-t-2">
                    <div className="flex justify-between p-3 bg-orange-100 rounded-xl">
                      <span className="font-bold text-orange-900">Exam Total</span>
                      <span className="font-bold text-orange-900">{fmt(examTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="flex items-center text-purple-900">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Other Charges
                  </CardTitle>
                  <CardDescription>Additional university fees</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-2">
                  {feeBreakdown.otherCharges.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        {item.paid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className="font-medium text-sm">{item.category}</span>
                      </div>
                      <span className="font-semibold">{fmt(item.amount)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t-2">
                    <div className="flex justify-between p-3 bg-purple-100 rounded-xl">
                      <span className="font-bold text-purple-900">Other Total</span>
                      <span className="font-bold text-purple-900">{fmt(otherTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center text-green-900">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Active Scholarships & Financial Aid
                </CardTitle>
                <CardDescription>Your child&apos;s scholarships and grants for {studentInfo.semester}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {financialAid.map((aid) => (
                    <div key={aid.id} className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-green-900">{aid.name}</h4>
                          <Badge className="bg-green-600 mt-1">{aid.type}</Badge>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold text-green-700 mb-1">{fmt(aid.amount)}</p>
                      <p className="text-xs text-green-600">{aid.description}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-green-100 rounded-xl border-2 border-green-300">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-green-900 text-lg">Total Financial Aid</span>
                    <span className="font-bold text-green-900 text-2xl">{fmt(scholarshipTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center text-blue-900">
                  <Receipt className="mr-2 h-5 w-5" />
                  Fee Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="font-medium">Gross Total</span>
                  <span className="font-semibold">{fmt(grossTotal)}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-50 rounded-xl">
                  <span className="font-medium text-green-700">Less: Scholarships & Aid</span>
                  <span className="font-semibold text-green-700">- {fmt(scholarshipTotal)}</span>
                </div>
                <div className="flex justify-between p-4 bg-blue-100 rounded-xl border-2 border-blue-300">
                  <span className="font-bold text-blue-900 text-lg">Net Payable Amount</span>
                  <span className="font-bold text-blue-900 text-2xl">{fmt(netPayable)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "courses" && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center text-blue-900">
                <BookOpen className="mr-2 h-5 w-5" />
                Registered Courses - {studentInfo.semester}
              </CardTitle>
              <CardDescription>Total: {totalCreditHours} Credit Hours</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {registeredCourses.map((course) => (
                  <div
                    key={course.id}
                    className={`p-4 border-2 rounded-xl transition-all cursor-pointer ${
                      selectedCourse === course.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                    onClick={() => setSelectedCourse(selectedCourse === course.id ? null : course.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{course.name}</h3>
                          <Badge className={
                            course.type === "Core" ? "bg-blue-600" :
                            course.type === "Lab" ? "bg-purple-600" :
                            "bg-gray-600"
                          }>
                            {course.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{course.id} • {course.creditHours} Credit Hours</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-900">{fmt(course.fee)}</p>
                      </div>
                    </div>
                    {selectedCourse === course.id && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="flex items-center text-sm">
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-gray-700">Instructor: {course.instructor}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-gray-700">Schedule: {course.schedule}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-100 rounded-xl border-2 border-blue-300">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-900">Total Course Fees</span>
                  <span className="font-bold text-blue-900 text-2xl">{fmt(tuitionTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "installments" && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center text-purple-900">
                  <Calendar className="mr-2 h-5 w-5" />
                  Installment Plan
                </CardTitle>
                <CardDescription>4 installments of PKR 20,000 each</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {approvedInstallments.map((inst) => (
                    <div
                      key={inst.id}
                      className={`p-5 border-2 rounded-xl ${
                        inst.status === "paid"
                          ? "border-green-300 bg-green-50"
                          : inst.status === "pending"
                          ? "border-orange-300 bg-orange-50"
                          : "border-gray-300 bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg">Installment #{inst.no}</h3>
                          <p className="text-sm text-gray-600">Due: {fmtDate(inst.dueDate)}</p>
                        </div>
                        <div className="text-right">
                          {inst.status === "paid" && (
                            <Badge className="bg-green-600 mb-2">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          )}
                          {inst.status === "pending" && (
                            <Badge className="bg-orange-600 mb-2">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {inst.status === "upcoming" && (
                            <Badge className="bg-gray-600 mb-2">
                              <Calendar className="h-3 w-3 mr-1" />
                              Upcoming
                            </Badge>
                          )}
                          <p className="text-xl font-bold">{fmt(inst.amount)}</p>
                          {inst.lateFee > 0 && (
                            <p className="text-sm text-red-600">+ {fmt(inst.lateFee)} late fee</p>
                          )}
                        </div>
                      </div>
                      {inst.paidDate && (
                        <div className="flex items-center text-sm text-green-700 mt-2">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Paid on {fmtDate(inst.paidDate)}
                        </div>
                      )}
                      {inst.status === "pending" && (
                        <Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center text-green-900">
                  <Receipt className="mr-2 h-5 w-5" />
                  Payment History
                </CardTitle>
                <CardDescription>Recent transactions and receipts</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="p-4 border-2 border-gray-200 rounded-xl bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold">{payment.description}</h3>
                          <p className="text-sm text-gray-600">{fmtDate(payment.date)}</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-gray-600">Receipt: {payment.receiptNo}</span>
                            <span className="text-gray-600">Challan: {payment.challanNo}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-700">{fmt(payment.amount)}</p>
                          <Badge className="mt-1">{payment.method}</Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        <Download className="h-4 w-4 mr-2" />
                        Download Receipt
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center text-blue-900">
                  <FileText className="mr-2 h-5 w-5" />
                  Previous Semesters
                </CardTitle>
                <CardDescription>Fee payment history by semester</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {semesterHistory.map((sem, idx) => (
                    <div key={idx} className="p-4 border-2 border-green-200 rounded-xl bg-green-50">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h3 className="font-bold">{sem.semester}</h3>
                          <p className="text-sm text-gray-600">{sem.credits} Credit Hours • CGPA: {sem.cgpa}</p>
                        </div>
                        <Badge className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {sem.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-green-200">
                        <span className="text-sm font-medium">Total Fee:</span>
                        <span className="font-bold">{fmt(sem.totalFee)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm font-medium">Amount Paid:</span>
                        <span className="font-bold text-green-700">{fmt(sem.paid)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}