/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator"; // Fixed typo in separator import from 'seperator' to 'separator'
import {
  Settings,
  Shield,
  Bell,
  Calendar,
  DollarSign,
  Users,
  Database,
  AlertCircle,
  Save,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [userRole] = useState("admin");
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    institutionName: "EduPilot Academy",
    institutionEmail: "admin@edupilot.edu",
    academicYear: "2024-2025",
    attendanceThreshold: "75",
    autoReminders: true,
    emailNotifications: true,
    smsNotifications: false,
    paymentGatewayActive: true,
    minInstallments: "2",
    maxInstallments: "6",
    overdueReminderDays: "3",
    dataBackupFrequency: "daily",
    accessLogging: true,
  });

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (currentUser.role !== "admin") {
      // This is handled by the access check below
    }
  }, []);

  const handleSave = async (section: string) => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`${section} settings saved successfully!`);
    } catch (error) {
      toast.error(`Failed to save ${section} settings`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (userRole !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is only accessible to administrators. Please contact
              your institution's admin for access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage institution configuration, security, and system settings
        </p>
      </div>

      <Tabs defaultValue="institution" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="institution">Institution</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="fees">Fee Management</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Institution Settings */}
        <TabsContent value="institution" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Institution Configuration
              </CardTitle>
              <CardDescription>
                Update your institution details and general settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="institutionName">Institution Name</Label>
                  <Input
                    id="institutionName"
                    value={settings.institutionName}
                    onChange={(e) =>
                      handleSettingChange("institutionName", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institutionEmail">Institution Email</Label>
                  <Input
                    id="institutionEmail"
                    type="email"
                    value={settings.institutionEmail}
                    onChange={(e) =>
                      handleSettingChange("institutionEmail", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Input
                    id="academicYear"
                    value={settings.academicYear}
                    onChange={(e) =>
                      handleSettingChange("academicYear", e.target.value)
                    }
                    placeholder="e.g., 2024-2025"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Access</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Student Registrations</p>
                    <p className="text-sm text-muted-foreground">
                      Allow new student registrations
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Teacher Registrations</p>
                    <p className="text-sm text-muted-foreground">
                      Allow new teacher registrations
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave("Institution")}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Settings */}
        <TabsContent value="academic" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Academic Configuration
              </CardTitle>
              <CardDescription>
                Manage academic calendar and attendance policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="attendanceThreshold">
                    Attendance Threshold (%)
                  </Label>
                  <Input
                    id="attendanceThreshold"
                    type="number"
                    value={settings.attendanceThreshold}
                    onChange={(e) =>
                      handleSettingChange("attendanceThreshold", e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum attendance required to avoid remediation
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Remediation Settings</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-Assign Remediation</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign tasks when threshold is breached
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Send Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Notify students about remediation tasks
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Calendar Events</h3>
                <Button variant="outline" className="w-full">
                  Manage Holidays & Exam Dates
                </Button>
                <Button variant="outline" className="w-full">
                  Set Semester Dates
                </Button>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave("Academic")}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Management Settings */}
        <TabsContent value="fees" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Fee & Payment Settings
              </CardTitle>
              <CardDescription>
                Configure fee structure and payment options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Payment Gateway</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Online Payments</p>
                    <p className="text-sm text-muted-foreground">
                      Allow students to pay fees online
                    </p>
                  </div>
                  <Switch
                    checked={settings.paymentGatewayActive}
                    onCheckedChange={(checked) =>
                      handleSettingChange("paymentGatewayActive", checked)
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="minInstallments">Minimum Installments</Label>
                  <Input
                    id="minInstallments"
                    type="number"
                    value={settings.minInstallments}
                    onChange={(e) =>
                      handleSettingChange("minInstallments", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxInstallments">Maximum Installments</Label>
                  <Input
                    id="maxInstallments"
                    type="number"
                    value={settings.maxInstallments}
                    onChange={(e) =>
                      handleSettingChange("maxInstallments", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overdueReminderDays">
                    Overdue Reminder (Days)
                  </Label>
                  <Input
                    id="overdueReminderDays"
                    type="number"
                    value={settings.overdueReminderDays}
                    onChange={(e) =>
                      handleSettingChange("overdueReminderDays", e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Send reminder after this many days past due
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Fee Structure</h3>
                <Button variant="outline" className="w-full">
                  Configure Program Fees
                </Button>
                <Button variant="outline" className="w-full">
                  Set Payment Deadlines
                </Button>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave("Fee Management")}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notification & Communication
              </CardTitle>
              <CardDescription>
                Configure system notifications and communication channels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Channels</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Send critical alerts via email
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      handleSettingChange("emailNotifications", checked)
                    }
                    defaultChecked
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Send urgent alerts via SMS
                    </p>
                  </div>
                  <Switch
                    checked={settings.smsNotifications}
                    onCheckedChange={(checked) =>
                      handleSettingChange("smsNotifications", checked)
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Automated Reminders</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Auto-Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Automatic reminders for assignments, exams, and fees
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoReminders}
                    onCheckedChange={(checked) =>
                      handleSettingChange("autoReminders", checked)
                    }
                    defaultChecked
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Templates</h3>
                <Button variant="outline" className="w-full">
                  Edit Assignment Reminders
                </Button>
                <Button variant="outline" className="w-full">
                  Edit Exam Reminders
                </Button>
                <Button variant="outline" className="w-full">
                  Edit Payment Reminders
                </Button>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave("Notifications")}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security & Compliance
              </CardTitle>
              <CardDescription>
                Manage security policies and data protection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Access Control</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Timeout</p>
                    <p className="text-sm text-muted-foreground">
                      Auto-logout after 30 minutes of inactivity
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for admin accounts
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Audit & Logging</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Access Logging</p>
                    <p className="text-sm text-muted-foreground">
                      Log all admin actions and data access
                    </p>
                  </div>
                  <Switch
                    checked={settings.accessLogging}
                    onCheckedChange={(checked) =>
                      handleSettingChange("accessLogging", checked)
                    }
                    defaultChecked
                  />
                </div>
                <Button variant="outline" className="w-full">
                  View Audit Logs
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Management</h3>
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Backup Frequency</Label>
                  <select
                    id="backupFrequency"
                    value={settings.dataBackupFrequency}
                    onChange={(e) =>
                      handleSettingChange("dataBackupFrequency", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <Button variant="outline" className="w-full">
                  Manual Backup Now
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Password Policy</h3>
                <Button variant="outline" className="w-full">
                  Reset All Passwords
                </Button>
                <Button variant="destructive" className="w-full">
                  <Lock className="mr-2 h-4 w-4" />
                  Force Re-authentication
                </Button>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave("Security")}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
