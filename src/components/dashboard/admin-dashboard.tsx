/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  BookOpen,
  TrendingUp,
  CreditCard,
  UserCheck,
  Activity,
  DollarSign,
  Target,
  Trash2,
  Eye,
  AlertCircle,
  Loader2,
  Building2,
} from "lucide-react";
import { getAllUsers, deleteUser, getCurrentUser, type User } from "@/lib/auth";
import {
  getDashboardStats,
  getCumulativeEnrollmentTrend,
  getFeeCollectionStatus,
  getRecentActivities,
  type DashboardStats,
  type EnrollmentData,
  type FeeData,
  type Activity as ActivityType,
} from "@/lib/supabase/admin";
import { toast } from "sonner";

type PieFeeDatum = {
  name: string;
  value: number;
  color: string;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: PieFeeDatum;
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
        <p className="font-semibold">{payload[0].name}</p>
        <p className="text-sm text-gray-600">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

export function AdminDashboard() {
  const router = useRouter();

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [showUserList, setShowUserList] = useState(false);

  // Dashboard data state
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalUsers: 0,
  });
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData[]>([]);
  const [feeData, setFeeData] = useState<FeeData[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [feeLoading, setFeeLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const pieFeeData: PieFeeDatum[] = feeData.map((f) => ({
    name: f.name,
    value: f.value,
    color: f.color,
  }));

  const loadDashboardData = async () => {
    try {
      setStatsLoading(true);
      const statsData = await getDashboardStats();
      setStats(statsData);
      setStatsLoading(false);

      setEnrollmentLoading(true);
      const enrollmentTrend = await getCumulativeEnrollmentTrend();
      setEnrollmentData(enrollmentTrend);
      setEnrollmentLoading(false);

      setFeeLoading(true);
      const feeStatus = await getFeeCollectionStatus();
      setFeeData(feeStatus);
      setFeeLoading(false);

      setActivitiesLoading(true);
      const recentActivities = await getRecentActivities(5);
      setActivities(recentActivities);
      setActivitiesLoading(false);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Failed to load some dashboard data");
      setStatsLoading(false);
      setEnrollmentLoading(false);
      setFeeLoading(false);
      setActivitiesLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUserData(user);
    loadUsers();
    loadDashboardData();
  }, []);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${userName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteUser(userId);
      toast.success("User deleted successfully");
      loadUsers();
      loadDashboardData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete user";
      toast.error(message);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "teacher":
        return "bg-blue-100 text-blue-800";
      case "student":
        return "bg-green-100 text-green-800";
      case "parent":
        return "bg-yellow-100 text-yellow-800";
      case "hr":
        return "bg-pink-100 text-pink-800";
      case "hod":
        return "bg-indigo-100 text-indigo-800";
      case "finance":
        return "bg-emerald-100 text-emerald-800";
      case "staff":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "user":
        return <Users className="h-4 w-4 text-green-600" />;
      case "class":
        return <BookOpen className="h-4 w-4 text-orange-600" />;
      case "enrollment":
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case "fee":
        return <DollarSign className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-purple-600" />;
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "user":
        return "bg-green-100";
      case "class":
        return "bg-orange-100";
      case "enrollment":
        return "bg-blue-100";
      case "fee":
        return "bg-purple-100";
      default:
        return "bg-purple-100";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hour${
        Math.floor(diffInSeconds / 3600) > 1 ? "s" : ""
      } ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)} day${
        Math.floor(diffInSeconds / 86400) > 1 ? "s" : ""
      } ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {currentUserData?.name || "Admin"}! 👨‍💼
            </h1>
            <p className="text-purple-100">
              Here&apos;s what&apos;s happening at EduPilot today
            </p>
          </div>
          <Button
            type="button"
            onClick={() => router.push("/admin/users/create")}
            className="bg-white text-purple-600 hover:bg-purple-50"
          >
            <Users className="mr-2 h-4 w-4" />
            Create New User
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                  <p className="text-sm text-gray-500">Total Students</p>
                  <p className="text-xs text-green-600">Active users</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-xl mr-4">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{stats.totalTeachers}</p>
                  <p className="text-sm text-gray-500">Total Teachers</p>
                  <p className="text-xs text-blue-600">Active educators</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-purple-100 rounded-xl mr-4">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{stats.totalParents}</p>
                  <p className="text-sm text-gray-500">Total Parents</p>
                  <p className="text-xs text-purple-600">Guardians</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-orange-100 rounded-xl mr-4">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-xs text-green-600">All roles</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                View and manage all system users
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowUserList(!showUserList)}
              variant="outline"
            >
              <Eye className="mr-2 h-4 w-4" />
              {showUserList ? "Hide Users" : "View All Users"}
            </Button>
          </div>
        </CardHeader>
        {showUserList && (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No users found. Create your first user!
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                {(user.name || "U").charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(
                              user.role
                            )}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {user.id !== currentUserData?.id && (
                            <button
                              onClick={() =>
                                handleDeleteUser(user.id, user.name)
                              }
                              className="text-red-600 hover:text-red-900 flex items-center gap-1"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Enrollment Trend
            </CardTitle>
            <CardDescription>
              Student enrollment over the past 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enrollmentLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : enrollmentData.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
                <AlertCircle className="h-12 w-12 mb-2" />
                <p>No enrollment data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="students"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: "#3B82F6", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Fee Collection Status */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Fee Collection Status
            </CardTitle>
            <CardDescription>Current fee collection breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {feeLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : pieFeeData.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-500">
                <AlertCircle className="h-12 w-12 mb-2" />
                <p>No fee data available</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieFeeData as any[]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label
                      >
                        {pieFeeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center flex-wrap gap-4 mt-4">
                  {feeData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center space-x-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium">
                        {item.name}: {item.value}% ({item.count})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => router.push("/admin/users/create")}
            >
              <Users className="mr-2 h-4 w-4" />
              Add New User
            </Button>

            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => router.push("/admin/departments/create")}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Create Department
            </Button>

            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => setShowUserList(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View All Users
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <BookOpen className="mr-2 h-4 w-4" />
              Create Class
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Generate Fee Report
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => loadDashboardData()}
            >
              <Activity className="mr-2 h-4 w-4" />
              Refresh Dashboard
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Recent Activities
            </CardTitle>
            <CardDescription>
              Latest system activities and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mb-2" />
                <p>No recent activities</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`flex items-center space-x-3 pb-3 ${
                      index < activities.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 ${getActivityBgColor(
                        activity.type
                      )} rounded-lg flex items-center justify-center`}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-gray-500">
                        {activity.description}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {formatTimeAgo(activity.created_at)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
