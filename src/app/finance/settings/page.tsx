/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import supabase from "@/lib/supabase/client";
import { toast } from "sonner";

export default function EmployeeSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar
    };
  };

  const passwordValidation = validatePassword(newPassword);

  const handleChangePassword = async () => {
    try {
      setLoading(true);

      // Validate passwords
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast.error("Please fill in all password fields");
        return;
      }

      if (newPassword.length < 8) {
        toast.error("New password must be at least 8 characters long");
        return;
      }

      if (!passwordValidation.isValid) {
        toast.error("Password does not meet all requirements");
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match");
        return;
      }

      if (currentPassword === newPassword) {
        toast.error("New password must be different from current password");
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to change password");
        return;
      }

      // First, verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error("Error updating password:", updateError);
        toast.error("Failed to update password. Please try again.");
        return;
      }

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      toast.success("Password changed successfully! Please use your new password next time you log in.");
    } catch (err) {
      console.error("Error in handleChangePassword:", err);
      toast.error("An error occurred while changing password");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (!newPassword) return "bg-gray-200";
    const strength = Object.values(passwordValidation).filter(Boolean).length - 1; // minus isValid
    if (strength <= 2) return "bg-red-500";
    if (strength <= 3) return "bg-yellow-500";
    if (strength <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (!newPassword) return "";
    const strength = Object.values(passwordValidation).filter(Boolean).length - 1;
    if (strength <= 2) return "Weak";
    if (strength <= 3) return "Fair";
    if (strength <= 4) return "Good";
    return "Strong";
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-indigo-700 rounded-2xl p-6 text-white">
        <div>
          <h1 className="text-2xl font-bold mb-1">Account Settings</h1>
          <p className="text-indigo-100">
            Manage your account security and password
          </p>
        </div>
      </div>

      {/* Change Password */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <Lock className="mr-2 h-5 w-5 text-indigo-600" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i < Object.values(passwordValidation).filter(Boolean).length - 1
                          ? getPasswordStrengthColor()
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-600">
                  Password strength:{" "}
                  <span className="font-medium">{getPasswordStrengthText()}</span>
                </p>
              </div>
            )}

            {/* Password Requirements */}
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-gray-700">Password requirements:</p>
              <div className="grid grid-cols-2 gap-1">
                <div className="flex items-center gap-1">
                  {passwordValidation.minLength ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-gray-300" />
                  )}
                  <span className="text-xs text-gray-600">At least 8 characters</span>
                </div>
                <div className="flex items-center gap-1">
                  {passwordValidation.hasUpperCase ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-gray-300" />
                  )}
                  <span className="text-xs text-gray-600">Uppercase letter</span>
                </div>
                <div className="flex items-center gap-1">
                  {passwordValidation.hasLowerCase ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-gray-300" />
                  )}
                  <span className="text-xs text-gray-600">Lowercase letter</span>
                </div>
                <div className="flex items-center gap-1">
                  {passwordValidation.hasNumber ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-gray-300" />
                  )}
                  <span className="text-xs text-gray-600">Number</span>
                </div>
                <div className="flex items-center gap-1">
                  {passwordValidation.hasSpecialChar ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-gray-300" />
                  )}
                  <span className="text-xs text-gray-600">Special character</span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={`pr-10 ${
                  confirmPassword && newPassword !== confirmPassword
                    ? "border-red-300 focus:border-red-500"
                    : confirmPassword && newPassword === confirmPassword
                    ? "border-green-300 focus:border-green-500"
                    : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <p className="text-xs text-green-500 mt-1">Passwords match</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={loading}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <Settings className="mr-2 h-5 w-5 text-indigo-600" />
            Password Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Use a unique password that you don't use for other accounts
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Make it at least 8 characters with a mix of letters, numbers, and symbols
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Avoid using personal information like your name or birthdate
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              After changing your password, you'll need to use the new password for your next login
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}