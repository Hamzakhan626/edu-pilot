/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

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
  ArrowLeft,
  Bell,
  Briefcase,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: "hiring" | "attendance" | "quiz";
  message: string;
  link?: string;
  date: string;
  urgent: boolean;
}

export default function HoDNotificationsPage() {
  const router = useRouter();
  const [department, setDepartment] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (currentUser.role !== "hod" && currentUser.role !== "admin") {
      router.push("/login");
      return;
    }

    supabase
      .from("departments")
      .select("id, name, code")
      .eq("hod_id", currentUser.id)
      .maybeSingle()
      .then(({ data: dept, error }) => {
        if (error || !dept) {
          toast.error("No department assigned");
          router.push("/hod/programs");
          return;
        }
        setDepartment(dept);
        fetchNotifications(dept.id);
      });
  }, []);

  const fetchNotifications = async (deptId: string) => {
    setLoading(true);
    const items: NotificationItem[] = [];

    try {
      // Pending hiring requests
      const { data: hiring } = await supabase
        .from("hiring_requests")
        .select("id, title, created_at")
        .eq("department_id", deptId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      (hiring || []).forEach((h: any) => {
        items.push({
          id: h.id,
          type: "hiring",
          message: `Pending hiring request: ${h.title}`,
          link: "/hod/hiring",
          date: h.created_at,
          urgent: false,
        });
      });

      // Courses with low attendance (< 50% last 30 days)
      const { data: courses } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("department_id", deptId);

      if (courses) {
        for (const course of courses) {
          const thirtyDaysAgo = format(addDays(new Date(), -30), "yyyy-MM-dd");
          const { data: attendance } = await supabase
            .from("attendance")
            .select("status")
            .eq("course_id", course.id)
            .gte("attendance_date", thirtyDaysAgo);

          if (attendance && attendance.length > 0) {
            const present = attendance.filter((a) => a.status === "present").length;
            const pct = Math.round((present / attendance.length) * 100);
            if (pct < 50) {
              items.push({
                id: `att-${course.id}`,
                type: "attendance",
                message: `Low attendance: ${course.name} (${pct}%)`,
                link: "/hod/attendance",
                date: new Date().toISOString(),
                urgent: pct < 30,
              });
            }
          }
        }
      }

      // Upcoming quizzes (scheduled within next 7 days)
      const sevenDaysLater = format(addDays(new Date(), 7), "yyyy-MM-dd");
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, title, scheduled_at")
        .gte("scheduled_at", new Date().toISOString())
        .lte("scheduled_at", addDays(new Date(), 7).toISOString())
        .order("scheduled_at")
        .limit(5);

      (quizzes || []).forEach((q: any) => {
        items.push({
          id: q.id,
          type: "quiz",
          message: `Upcoming quiz: ${q.title} on ${format(new Date(q.scheduled_at), "dd MMM")}`,
          link: "/hod/quizzes",
          date: q.scheduled_at,
          urgent: false,
        });
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(items);
    } catch (err: any) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "hiring": return <Briefcase className="h-5 w-5 text-purple-500" />;
      case "attendance": return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "quiz": return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
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
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">
              {department.name} ({department.code})
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => fetchNotifications(department.id)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Alerts
            </CardTitle>
            <CardDescription>
              Important updates for your department
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                No notifications at the moment.
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      item.urgent ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">{getIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(item.date), "dd MMM yyyy, hh:mm a")}
                      </p>
                    </div>
                    {item.link && (
                      <Button variant="ghost" size="sm" onClick={() => router.push(item.link!)}>
                        View
                      </Button>
                    )}
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