/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ListOrdered,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Download,
  Calendar,
  RefreshCw,
  Loader2,
  X,
  Eye,
  DollarSign,
} from 'lucide-react';
import supabase from '@/lib/supabase/client';

type TxType = 'Fee' | 'Payroll' | 'Expense' | 'Refund' | 'Other';
type Direction = 'Inflow' | 'Outflow';
type TxStatus = 'Posted' | 'Pending' | 'Failed';

interface TransactionRecord {
  id: string;
  date: string;
  refNo: string;
  description: string;
  type: TxType;
  direction: Direction;
  status: TxStatus;
  amount: number;
  account: string;
  counterparty: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return dateStr;
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function FinanceTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | TxType>('all');
  const [selectedDir, setSelectedDir] = useState<'all' | Direction>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | TxStatus>('all');

  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const allTransactions: TransactionRecord[] = [];

      // 1. Fetch Fee Payments (Inflow)
      const { data: feePayments, error: feePayError } = await supabase
        .from('fee_payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          reference_no,
          status,
          remarks,
          student_fee:student_fee_id (
            student:student_id (
              full_name,
              enrollment_number
            )
          )
        `)
        .order('payment_date', { ascending: false })
        .limit(100);

      if (!feePayError && feePayments) {
        feePayments.forEach((payment: any) => {
          const studentName = payment.student_fee?.student?.full_name || 'Unknown';
          const enrollmentNo = payment.student_fee?.student?.enrollment_number || 'N/A';
          
          allTransactions.push({
            id: `FP-${payment.id?.slice(0, 8)}`,
            date: payment.payment_date || new Date().toISOString(),
            refNo: payment.reference_no || `PAY-${payment.id?.slice(0, 8)}`,
            description: `Fee payment – ${studentName} (${enrollmentNo})`,
            type: 'Fee',
            direction: 'Inflow',
            status: payment.status === 'success' ? 'Posted' : payment.status === 'pending' ? 'Pending' : 'Failed',
            amount: payment.amount || 0,
            account: 'Tuition Fees',
            counterparty: studentName,
          });
        });
      }

      // 2. Fetch Fee Challans (Potential Inflow)
      const { data: challans, error: challanError } = await supabase
        .from('fee_challans')
        .select(`
          id,
          challan_number,
          total_amount,
          due_date,
          status,
          payment_method,
          student_fee:student_fee_id (
            student:student_id (
              full_name,
              enrollment_number
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!challanError && challans) {
        challans.forEach((challan: any) => {
          if (challan.status === 'paid') {
            const studentName = challan.student_fee?.student?.full_name || 'Unknown';
            
            allTransactions.push({
              id: `CH-${challan.id?.slice(0, 8)}`,
              date: challan.paid_at || challan.due_date || new Date().toISOString(),
              refNo: challan.challan_number || `CHL-${challan.id?.slice(0, 8)}`,
              description: `Challan payment – ${studentName}`,
              type: 'Fee',
              direction: 'Inflow',
              status: 'Posted',
              amount: challan.total_amount || 0,
              account: 'Tuition Fees – Challan',
              counterparty: studentName,
            });
          }
        });
      }

      // 3. Fetch Payroll Records (Outflow)
      const { data: payroll, error: payrollError } = await supabase
        .from('payroll_records')
        .select(`
          id,
          period,
          pay_date,
          net_pay,
          gross_pay,
          status,
          pay_type,
          run_type,
          user:user_id (
            full_name,
            enrollment_number
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!payrollError && payroll) {
        // Group payroll by period for summary
        const periodMap = new Map<string, { total: number; count: number; date: string; status: string }>();
        
        payroll.forEach((record: any) => {
          if (!periodMap.has(record.period)) {
            periodMap.set(record.period, {
              total: 0,
              count: 0,
              date: record.pay_date || record.created_at,
              status: record.status,
            });
          }
          const entry = periodMap.get(record.period)!;
          entry.total += record.net_pay || 0;
          entry.count += 1;
        });

        periodMap.forEach((entry, period) => {
          allTransactions.push({
            id: `PR-${period.replace(/\s+/g, '-')}`,
            date: entry.date,
            refNo: `PAYROLL-${period.replace(/\s+/g, '-')}`,
            description: `Payroll disbursement – ${period}`,
            type: 'Payroll',
            direction: 'Outflow',
            status: entry.status === 'Paid' ? 'Posted' : entry.status === 'Approved' ? 'Pending' : 'Pending',
            amount: entry.total,
            account: 'Payroll Clearing',
            counterparty: `Employees (${entry.count})`,
          });
        });
      }

      // 4. Fetch Student Fee Records (For Refunds - Partial/Overdue adjustments)
      const { data: studentFees, error: sfError } = await supabase
        .from('student_fees')
        .select(`
          id,
          discount_type,
          discount_value,
          discount_reason,
          payable_total,
          already_paid,
          status,
          student:student_id (
            full_name,
            enrollment_number
          )
        `)
        .not('discount_type', 'eq', 'none')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (!sfError && studentFees) {
        studentFees.forEach((fee: any) => {
          if (fee.discount_value > 0) {
            allTransactions.push({
              id: `DISC-${fee.id?.slice(0, 8)}`,
              date: fee.updated_at || new Date().toISOString(),
              refNo: `DISC-${fee.id?.slice(0, 8)}`,
              description: `Discount/Scholarship – ${fee.student?.full_name || 'Student'} (${fee.discount_reason || fee.discount_type})`,
              type: 'Refund',
              direction: 'Outflow',
              status: 'Posted',
              amount: fee.discount_value,
              account: 'Scholarship Expense',
              counterparty: fee.student?.full_name || 'Student',
            });
          }
        });
      }

      // 5. Fetch fee_installments for pending amounts
      const { data: installments, error: instError } = await supabase
        .from('fee_installments')
        .select(`
          id,
          amount,
          due_date,
          status,
          student_fee:student_fee_id (
            student:student_id (
              full_name,
              enrollment_number
            )
          )
        `)
        .eq('status', 'overdue')
        .order('due_date', { ascending: false })
        .limit(50);

      if (!instError && installments) {
        installments.forEach((inst: any) => {
          allTransactions.push({
            id: `INST-${inst.id?.slice(0, 8)}`,
            date: inst.due_date || new Date().toISOString(),
            refNo: `OVERDUE-${inst.id?.slice(0, 8)}`,
            description: `Overdue installment – ${inst.student_fee?.student?.full_name || 'Student'}`,
            type: 'Fee',
            direction: 'Inflow',
            status: 'Pending',
            amount: inst.amount || 0,
            account: 'Accounts Receivable',
            counterparty: inst.student_fee?.student?.full_name || 'Student',
          });
        });
      }

      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load transactions. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalInflow = transactions
    .filter((t) => t.direction === 'Inflow')
    .reduce((s, t) => s + t.amount, 0);
  const totalOutflow = transactions
    .filter((t) => t.direction === 'Outflow')
    .reduce((s, t) => s + t.amount, 0);
  const postedCount = transactions.filter((t) => t.status === 'Posted').length;
  const pendingCount = transactions.filter((t) => t.status === 'Pending').length;
  const failedCount = transactions.filter((t) => t.status === 'Failed').length;

  const summaryCards = [
    {
      label: 'Total Inflow',
      value: `Rs ${totalInflow.toLocaleString()}`,
      icon: ArrowDownCircle,
      color: 'green',
      note: `${transactions.filter((t) => t.direction === 'Inflow').length} transactions`,
    },
    {
      label: 'Total Outflow',
      value: `Rs ${totalOutflow.toLocaleString()}`,
      icon: ArrowUpCircle,
      color: 'red',
      note: `${transactions.filter((t) => t.direction === 'Outflow').length} transactions`,
    },
    {
      label: 'Net Position',
      value: `Rs ${(totalInflow - totalOutflow).toLocaleString()}`,
      icon: Wallet,
      color: 'blue',
      note: totalInflow >= totalOutflow ? 'Positive cash flow' : 'Negative cash flow',
    },
    {
      label: 'Posted / Pending',
      value: `${postedCount} / ${pendingCount}`,
      icon: CheckCircle,
      color: 'purple',
      note: failedCount > 0 ? `${failedCount} failed` : 'All good',
    },
  ];

  const getStatusBadge = (status: TxStatus): string => {
    switch (status) {
      case 'Posted':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Failed':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const filteredTx = transactions.filter((t) => {
    const matchesType = selectedType === 'all' || t.type === selectedType;
    const matchesDir = selectedDir === 'all' || t.direction === selectedDir;
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.description.toLowerCase().includes(q) ||
      t.refNo.toLowerCase().includes(q) ||
      t.account.toLowerCase().includes(q) ||
      t.counterparty.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q);

    return matchesType && matchesDir && matchesStatus && matchesSearch;
  });

  const exportCSV = () => {
    const csvData = filteredTx.map((tx) => ({
      ID: tx.id,
      Date: formatDate(tx.date),
      'Ref No': tx.refNo,
      Description: tx.description,
      Type: tx.type,
      Direction: tx.direction,
      Status: tx.status,
      Amount: tx.amount.toString(),
      Account: tx.account,
      Counterparty: tx.counterparty,
    }));

    if (csvData.length === 0) return;

    const headers = Object.keys(csvData[0]) as (keyof typeof csvData[0])[];
    const csv = [
      headers.join(','),
      ...csvData.map((row) => headers.map((h) => row[h]).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6">
          <Skeleton className="h-8 w-48 bg-white/20" />
          <Skeleton className="h-4 w-72 mt-2 bg-white/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={`sk-${i}`} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 rounded-xl mb-3" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Transaction Records</h1>
            <p className="text-sky-100">
              Central ledger of fee, payroll, and expense transactions
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransactions}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={exportCSV} className="bg-white text-sky-700 hover:bg-sky-50">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <Alert
          variant={alert.type === 'error' ? 'destructive' : 'default'}
          className={
            alert.type === 'success'
              ? 'bg-green-50 border-green-200'
              : alert.type === 'error'
              ? 'bg-red-50 border-red-200'
              : 'bg-blue-50 border-blue-200'
          }
        >
          {alert.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{alert.message}</AlertDescription>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAlert(null)}>
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((stat, idx) => {
          const Icon = stat.icon;
          const isNeg = stat.label.includes('Outflow');
          const colorMap: Record<string, string> = {
            green: 'bg-green-100 text-green-600',
            red: 'bg-red-100 text-red-600',
            blue: 'bg-blue-100 text-blue-600',
            purple: 'bg-purple-100 text-purple-600',
          };
          return (
            <Card key={`card-${idx}`} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-xl ${colorMap[stat.color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {isNeg ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="h-4 w-4 text-gray-500" />
              <span>Filter transactions by type, direction, and status</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(e.target.value === 'all' ? 'all' : (e.target.value as TxType))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">All Types</option>
                <option value="Fee">Fee</option>
                <option value="Payroll">Payroll</option>
                <option value="Expense">Expense</option>
                <option value="Refund">Refund</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={selectedDir}
                onChange={(e) =>
                  setSelectedDir(e.target.value === 'all' ? 'all' : (e.target.value as Direction))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">All Directions</option>
                <option value="Inflow">Inflow</option>
                <option value="Outflow">Outflow</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value === 'all' ? 'all' : (e.target.value as TxStatus))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">All Status</option>
                <option value="Posted">Posted</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by description, ref no, account, or counterparty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Transactions list */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ListOrdered className="mr-2 h-5 w-5" />
            Transaction History ({filteredTx.length})
          </CardTitle>
          <CardDescription>
            One row per posting with account and counterparty
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTx.map((tx) => (
              <div
                key={tx.id}
                className="border border-gray-200 rounded-lg px-3 py-3 text-xs md:text-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex flex-col md:grid md:grid-cols-5 md:gap-3">
                  {/* Date & Ref */}
                  <div className="flex items-center gap-2 mb-2 md:mb-0">
                    <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs">{formatDate(tx.date)}</span>
                      <span className="text-[10px] text-gray-400 block">{tx.id}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col mb-2 md:mb-0">
                    <span className="font-semibold text-gray-900 truncate">{tx.description}</span>
                    <span className="text-[11px] text-gray-500">
                      Ref: {tx.refNo}
                    </span>
                  </div>

                  {/* Type & Direction */}
                  <div className="flex items-center gap-2 mb-2 md:mb-0">
                    {tx.direction === 'Inflow' ? (
                      <ArrowDownCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <span className="text-xs">{tx.direction}</span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border text-[10px] ml-1">
                        {tx.type}
                      </span>
                    </div>
                  </div>

                  {/* Amount & Account */}
                  <div className="flex flex-col mb-2 md:mb-0">
                    <span
                      className={`font-semibold text-sm ${
                        tx.direction === 'Inflow' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {tx.direction === 'Inflow' ? '+' : '-'} Rs {tx.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-500">{tx.account}</span>
                  </div>

                  {/* Status & Counterparty */}
                  <div className="flex items-center justify-between md:justify-end gap-2">
                    <div className="flex flex-col items-end">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${getStatusBadge(tx.status)}`}>
                        {tx.status}
                      </span>
                      <span className="text-[10px] text-gray-500 mt-0.5">{tx.counterparty}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredTx.length === 0 && (
              <div className="text-center py-8">
                <ListOrdered className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  No transactions match the selected filters or search query.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('all');
                    setSelectedDir('all');
                    setSelectedStatus('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}