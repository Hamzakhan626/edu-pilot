/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";

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
import { Separator } from "@/components/ui/separator";

import {
  ArrowLeft,
  User,
  Lock,
  Bell,
  Loader2,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
}

export default function HoDSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);           // custom user row
  const [authUser, setAuthUser] = useState<any>(null);   // Supabase Auth user
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }
        if (currentUser.role !== "hod" && currentUser.role !== "admin") {
          router.push("/login");
          return;
        }
        setUser(currentUser);

        // Get the Auth user (for metadata)
        const { data: { user: authUserData }, error: authError } = await supabase.auth.getUser();
        if (!authError && authUserData) {
          setAuthUser(authUserData);
          const metadata = (authUserData.user_metadata as Record<string, any>) || {};
          setEmailNotifications(metadata.email_notifications ?? true);
          setPushNotifications(metadata.push_notifications ?? false);
        }

        // Get department
        const { data: dept, error: deptError } = await supabase
          .from("departments")
          .select("id, name, code")
          .eq("hod_id", currentUser.id)
          .maybeSingle();

        if (deptError || !dept) {
          toast.error("No department assigned");
          router.push("/hod/programs");
          return;
        }
        setDepartment(dept);

        // Get profile data
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("full_name, email, phone")
          .eq("id", currentUser.id)
          .single();

        if (!profileError && profileData) {
          setProfile({
            full_name: profileData.full_name || "",
            email: profileData.email || "",
            phone: profileData.phone || "",
          });
        }
      } catch (err: any) {
        toast.error("Failed to load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      setSavingProfile(true);
      const { error } = await supabase
        .from("users")
        .update({
          full_name: profile.full_name.trim(),
          email: profile.email.trim().toLowerCase(),
          phone: profile.phone.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setSavingPassword(true);
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw new Error("Current password is incorrect");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password changed successfully");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleEmailNotifications = async () => {
    const newVal = !emailNotifications;
    setEmailNotifications(newVal);
    await supabase.auth.updateUser({
      data: { email_notifications: newVal },
    });
    toast.success("Preference updated");
  };

  const togglePushNotifications = async () => {
    const newVal = !pushNotifications;
    setPushNotifications(newVal);
    await supabase.auth.updateUser({
      data: { push_notifications: newVal },
    });
    toast.success("Preference updated");
  };

  if (loading || !department) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/hod/dashboard")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">{department.name} ({department.code})</p>
        </div>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <Button onClick={handleUpdateProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Ensure your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
              />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Control how you receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive alerts via email</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={toggleEmailNotifications} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-500">Receive real-time browser notifications</p>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={togglePushNotifications} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}