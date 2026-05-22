/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Receipt,
} from 'lucide-react';
import { mockFees } from '@/lib/mock-data';
import { getCurrentUser } from '@/lib/auth';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function FeesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser(); // should be User | null
    setUser(currentUser);
  }, []);

  if (!user) return <div>Loading...</div>;

  const paymentProgress = (mockFees.paid / mockFees.total) * 100;
  const pendingInstallments = mockFees.installments.filter(
    i => i.status === 'pending',
  );
  const paidInstallments = mockFees.installments.filter(
    i => i.status === 'paid',
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Fees &amp; Payments
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your fee payments and view receipts
          </p>
        </div>
        <Button>
          <CreditCard className="mr-2 h-4 w-4" />
          Make Payment
        </Button>
      </div>

      {/* Fee Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                Rs{mockFees.total.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Total Fees</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                Rs{mockFees.paid.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Paid Amount</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-red-100 rounded-xl mr-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                Rs{mockFees.pending.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Progress</CardTitle>
              <CardDescription>
                Your fee payment status for this academic year
              </CardDescription>
            </div>
            <Badge
              variant={
                pendingInstallments.length > 0 ? 'destructive' : 'default'
              }
            >
              {paymentProgress.toFixed(0)}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={paymentProgress} className="h-3 mb-4" />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Rs{mockFees.paid.toLocaleString()} paid</span>
            <span>Rs{mockFees.pending.toLocaleString()} remaining</span>
          </div>
          {pendingInstallments.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">Payment Due</p>
                  <p className="text-sm text-yellow-700">
                    Next installment of Rs
                    {pendingInstallments[0].amount.toLocaleString()} due by{' '}
                    {new Date(
                      pendingInstallments[0].dueDate,
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Tabs */}
      <Tabs defaultValue="installments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="installments">Installments</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
        </TabsList>

        {/* Installments */}
        <TabsContent value="installments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Fee Installments</h2>
            <Dialog
              open={installmentDialogOpen}
              onOpenChange={setInstallmentDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  Request Installment Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Installment Plan</DialogTitle>
                  <DialogDescription>
                    Request a custom installment plan for your remaining
                    fees
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Number of Installments</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select installments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 installments</SelectItem>
                        <SelectItem value="3">3 installments</SelectItem>
                        <SelectItem value="4">4 installments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Preferred Start Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Reason (Optional)</Label>
                    <Input placeholder="Brief reason for installment request" />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setInstallmentDialogOpen(false)}
                  >
                    Submit Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {mockFees.installments.map(installment => (
              <Card key={installment.id} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-3 rounded-xl ${
                          installment.status === 'paid'
                            ? 'bg-green-100'
                            : 'bg-orange-100'
                        }`}
                      >
                        {installment.status === 'paid' ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <Clock className="h-6 w-6 text-orange-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          Installment {installment.id}
                        </h3>
                        <p className="text-gray-500">
                          Due:{' '}
                          {new Date(
                            installment.dueDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        Rs{installment.amount.toLocaleString()}
                      </div>
                      <Badge
                        variant={
                          installment.status === 'paid'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {installment.status}
                      </Badge>
                    </div>
                  </div>
                  {installment.status === 'pending' && (
                    <div className="mt-4 pt-4 border-t">
                      <Button className="w-full">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Payment History */}
        <TabsContent value="history" className="space-y-4">
          <h2 className="text-xl font-semibold">Payment History</h2>
          <div className="space-y-4">
            {paidInstallments.map(payment => (
              <Card key={payment.id} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Payment Received</h3>
                        <p className="text-gray-500">
                          Paid on:{' '}
                          {new Date(
                            payment.dueDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        Rs{payment.amount.toLocaleString()}
                      </div>
                      <Button variant="outline" size="sm" className="mt-1">
                        <Download className="h-4 w-4 mr-1" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Receipts */}
        <TabsContent value="receipts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Fee Receipts</h2>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paidInstallments.map(payment => (
              <Card
                key={payment.id}
                className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              >
                <CardContent className="p-6 text-center">
                  <div className="p-4 bg-blue-100 rounded-xl w-fit mx-auto mb-4">
                    <Receipt className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">
                    Receipt #{payment.id.padStart(4, '0')}
                  </h3>
                  <p className="text-gray-500 text-sm mb-2">
                    {new Date(payment.dueDate).toLocaleDateString()}
                  </p>
                  <p className="text-xl font-bold text-green-600 mb-4">
                    Rs{payment.amount.toLocaleString()}
                  </p>
                  <Button size="sm" className="w-full">
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
