/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  User, 
  Lock, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  KeyRound
} from "lucide-react"
import supabase from "@/lib/supabase/client"

interface UserProfile {
  id: string
  email?: string
  full_name?: string
  student_id?: string
  program?: string
  batch?: string
  phone?: string
  avatar_url?: string
}

export default function StudentSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Alert state
  const [alert, setAlert] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Password validation
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUserProfile({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || "",
          student_id: user.user_metadata?.student_id || "",
          program: user.user_metadata?.program || "",
          batch: user.user_metadata?.batch || "",
          phone: user.user_metadata?.phone || "",
          avatar_url: user.user_metadata?.avatar_url || "",
        })
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push("At least 8 characters long")
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("At least one uppercase letter")
    }
    if (!/[a-z]/.test(password)) {
      errors.push("At least one lowercase letter")
    }
    if (!/[0-9]/.test(password)) {
      errors.push("At least one number")
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("At least one special character")
    }
    
    return errors
  }

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value
    setNewPassword(password)
    setPasswordErrors(validatePassword(password))
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlert(null)

    // Validate passwords
    if (!currentPassword) {
      setAlert({ type: "error", message: "Current password is required" })
      return
    }

    if (!newPassword) {
      setAlert({ type: "error", message: "New password is required" })
      return
    }

    if (passwordErrors.length > 0) {
      setAlert({ type: "error", message: "Please fix the password requirements" })
      return
    }

    if (newPassword !== confirmPassword) {
      setAlert({ type: "error", message: "New passwords don't match" })
      return
    }

    if (currentPassword === newPassword) {
      setAlert({ type: "error", message: "New password must be different from current password" })
      return
    }

    setChangingPassword(true)

    try {
      // First, verify the current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile?.email || "",
        password: currentPassword,
      })

      if (signInError) {
        setAlert({ type: "error", message: "Current password is incorrect" })
        return
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      setAlert({ type: "success", message: "Password updated successfully!" })
      
      // Clear password fields
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordErrors([])
      
    } catch (error: any) {
      console.error("Error changing password:", error)
      setAlert({ type: "error", message: error.message || "Failed to change password" })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your account settings and security</p>
        </div>

        {alert && (
          <Alert
            variant={alert.type === "success" ? "default" : "destructive"}
            className={`mb-6 ${
              alert.type === "success" 
                ? "bg-green-50 border-green-200 text-green-800" 
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Profile Information Card */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your account information is managed by the administration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Full Name</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-900 font-medium">
                      {userProfile?.full_name || "Not set"}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Email Address</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <p className="text-gray-900 font-medium">
                      {userProfile?.email || "Not set"}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Student ID</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-900 font-medium">
                      {userProfile?.student_id || "Not set"}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Program</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-900 font-medium">
                      {userProfile?.program || "Not set"}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Batch</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-900 font-medium">
                      {userProfile?.batch || "Not set"}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-900 font-medium">
                      {userProfile?.phone || "Not set"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Lock className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription className="text-gray-600">
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-gray-700">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="pr-10 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={changingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-gray-700">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={handleNewPasswordChange}
                      placeholder="Enter new password"
                      className={`pr-10 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        newPassword && passwordErrors.length > 0
                          ? "border-red-300"
                          : newPassword && passwordErrors.length === 0
                          ? "border-green-300"
                          : ""
                      }`}
                      disabled={changingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Requirements */}
                  {newPassword && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Password Requirements:
                      </p>
                      <ul className="space-y-1">
                        {[
                          "At least 8 characters long",
                          "At least one uppercase letter",
                          "At least one lowercase letter",
                          "At least one number",
                          "At least one special character",
                        ].map((requirement, index) => (
                          <li
                            key={index}
                            className={`text-xs flex items-center gap-1 ${
                              passwordErrors.includes(requirement)
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {passwordErrors.includes(requirement) ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {requirement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={`pr-10 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        confirmPassword && newPassword
                          ? confirmPassword === newPassword
                            ? "border-green-300"
                            : "border-red-300"
                          : ""
                      }`}
                      disabled={changingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && newPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      Passwords don't match
                    </p>
                  )}
                  {confirmPassword && newPassword && confirmPassword === newPassword && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Passwords match
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <Button
                    type="submit"
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword || passwordErrors.length > 0 || newPassword !== confirmPassword}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 mr-2" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Account Security Tips */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Shield className="w-5 h-5" />
                Security Tips
              </CardTitle>
              <CardDescription className="text-gray-600">
                Keep your account safe and secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">Strong Passwords</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use a mix of characters</li>
                    <li>• Avoid personal information</li>
                    <li>• Don't reuse old passwords</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">Best Practices</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Never share your password</li>
                    <li>• Log out from shared devices</li>
                    <li>• Update password regularly</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}