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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Bell,
  Shield,
  Palette,
  Camera,
  Mail,
  Phone,
  Save,
  Users,
  Lock,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";

export default function ParentSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState({
    childGrades: true,
    childAttendance: true,
    childAssignments: true,
    announcements: true,
    feeReminders: true,
    parentTeacherMeetings: true,
    email: true,
    sms: true,
    push: true,
  });

  // Mock child data - in real app, this would come from API
  const [children, setChildren] = useState([
    {
      id: 1,
      name: "Rahul Sharma",
      grade: "Grade 5",
      school: "Delhi Public School",
    },
    {
      id: 2,
      name: "Priya Sharma",
      grade: "Grade 3",
      school: "Delhi Public School",
    },
  ]);

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibleToTeachers: true,
    profileVisibleToOtherParents: false,
    showChildrenNames: true,
    receiveEventInvites: true,
    allowDirectMessages: false,
  });

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleSave = (section: string) => {
    toast.success(`${section} settings saved successfully!`);
  };

  const handleAddChild = () => {
    toast.info("Child addition feature coming soon!");
  };

  const handleRemoveChild = (childId: number) => {
    setChildren((prev) => prev.filter((child) => child.id !== childId));
    toast.success("Child removed successfully");
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Parent Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your parent account and child monitoring preferences
        </p>
      </div>

      <Tabs defaultValue="children" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="children" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Children
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Children Management */}
        <TabsContent value="children" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                Manage Children
              </CardTitle>
              <CardDescription>
                Add, remove, and manage information for your children
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Children List */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Your Children</h3>
                {children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {child.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{child.name}</p>
                        <p className="text-sm text-gray-500">
                          {child.grade} • {child.school}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChild(child.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Add Child Form */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Add New Child</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="childName">Child's Full Name</Label>
                    <Input id="childName" placeholder="Enter child's name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="father">Father</option>
                      <option value="mother">Mother</option>
                      <option value="guardian">Guardian</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade/Class</Label>
                    <Input id="grade" placeholder="e.g., Grade 5" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input id="studentId" placeholder="Enter student ID" />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleAddChild}>
                    Add Child
                  </Button>
                  <Button onClick={() => handleSave("Children")}>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Child Monitoring Preferences */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Child Monitoring Preferences</CardTitle>
              <CardDescription>
                Control what information you want to monitor for each child
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Real-time Grade Updates</p>
                  <p className="text-sm text-gray-500">
                    Get notified immediately when grades are posted
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Attendance Alerts</p>
                  <p className="text-sm text-gray-500">
                    Notify when child is marked absent
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Assignment Deadlines</p>
                  <p className="text-sm text-gray-500">
                    Reminders for upcoming assignment due dates
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Parent Profile
              </CardTitle>
              <CardDescription>
                Update your personal information as a parent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="text-lg">
                    {user.name
                      .split(" ")
                      .map((n: any[]) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" className="mb-2">
                    <Camera className="mr-2 h-4 w-4" />
                    Change Photo
                  </Button>
                  <p className="text-sm text-gray-500">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Parent Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" defaultValue={user.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue={user.email} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue="+91 98765 43210" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input id="occupation" placeholder="Enter your occupation" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Home Address</Label>
                  <Input id="address" placeholder="Enter your address" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input id="emergencyContact" placeholder="+91 98765 43210" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentCode">Parent ID</Label>
                  <Input id="parentCode" value="PAR-2024-00123" disabled />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("Profile")}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
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
                Parent Alerts & Notifications
              </CardTitle>
              <CardDescription>
                Customize alerts for your children's activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Child Activities</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Grade Updates</p>
                        <p className="text-sm text-gray-500">
                          When your child receives new grades
                        </p>
                      </div>
                      <Switch
                        checked={notifications.childGrades}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            childGrades: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Attendance Alerts</p>
                        <p className="text-sm text-gray-500">
                          Daily attendance reports
                        </p>
                      </div>
                      <Switch
                        checked={notifications.childAttendance}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            childAttendance: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Assignment Deadlines</p>
                        <p className="text-sm text-gray-500">
                          Upcoming assignments and projects
                        </p>
                      </div>
                      <Switch
                        checked={notifications.childAssignments}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            childAssignments: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">School Announcements</p>
                        <p className="text-sm text-gray-500">
                          Important school-wide announcements
                        </p>
                      </div>
                      <Switch
                        checked={notifications.announcements}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            announcements: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Administrative</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Fee Reminders</p>
                        <p className="text-sm text-gray-500">
                          Tuition fee due dates and reminders
                        </p>
                      </div>
                      <Switch
                        checked={notifications.feeReminders}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            feeReminders: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Parent-Teacher Meetings</p>
                        <p className="text-sm text-gray-500">
                          Meeting schedules and reminders
                        </p>
                      </div>
                      <Switch
                        checked={notifications.parentTeacherMeetings}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            parentTeacherMeetings: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Notification Channels
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">Email Notifications</p>
                          <p className="text-sm text-gray-500">
                            Receive detailed reports via email
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            email: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">SMS Alerts</p>
                          <p className="text-sm text-gray-500">
                            Urgent alerts via SMS
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.sms}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            sms: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Bell className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">Push Notifications</p>
                          <p className="text-sm text-gray-500">
                            Instant app notifications
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.push}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            push: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("Notification")}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Parent Privacy Settings
              </CardTitle>
              <CardDescription>
                Control your privacy and visibility as a parent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Visible to Teachers</p>
                    <p className="text-sm text-gray-500">
                      Allow teachers to see your contact information
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.profileVisibleToTeachers}
                    onCheckedChange={(checked) =>
                      setPrivacySettings((prev) => ({
                        ...prev,
                        profileVisibleToTeachers: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Visible to Other Parents</p>
                    <p className="text-sm text-gray-500">
                      Show your profile to parents in same classes
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.profileVisibleToOtherParents}
                    onCheckedChange={(checked) =>
                      setPrivacySettings((prev) => ({
                        ...prev,
                        profileVisibleToOtherParents: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Children's Names</p>
                    <p className="text-sm text-gray-500">
                      Display your children's names in class lists
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.showChildrenNames}
                    onCheckedChange={(checked) =>
                      setPrivacySettings((prev) => ({
                        ...prev,
                        showChildrenNames: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Receive Event Invites</p>
                    <p className="text-sm text-gray-500">
                      Get invited to school events and PTA meetings
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.receiveEventInvites}
                    onCheckedChange={(checked) =>
                      setPrivacySettings((prev) => ({
                        ...prev,
                        receiveEventInvites: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Allow Direct Messages</p>
                    <p className="text-sm text-gray-500">
                      Let teachers and other parents message you
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.allowDirectMessages}
                    onCheckedChange={(checked) =>
                      setPrivacySettings((prev) => ({
                        ...prev,
                        allowDirectMessages: checked,
                      }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Security</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline">
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Two-Factor Authentication
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("Privacy")}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings - Remains similar but can be kept as is */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="mr-2 h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how EduPilot looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-4">Theme</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border-2 border-blue-500 rounded-lg p-4 text-center bg-white">
                      <div className="w-full h-20 bg-gradient-to-br from-blue-50 to-white rounded mb-3"></div>
                      <p className="font-medium">Light</p>
                      <p className="text-sm text-gray-500">Default theme</p>
                    </div>
                    <div className="border-2 border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400">
                      <div className="w-full h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded mb-3"></div>
                      <p className="font-medium">Dark</p>
                      <p className="text-sm text-gray-500">Easy on the eyes</p>
                    </div>
                    <div className="border-2 border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400">
                      <div className="w-full h-20 bg-gradient-to-br from-blue-100 via-white to-gray-100 rounded mb-3"></div>
                      <p className="font-medium">System</p>
                      <p className="text-sm text-gray-500">Follows device</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Display Options</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Compact Mode</p>
                      <p className="text-sm text-gray-500">
                        Reduce spacing for more content
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Animations</p>
                      <p className="text-sm text-gray-500">
                        Enable smooth transitions
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("Appearance")}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
