/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Brain,
  Users,
  MessageSquare,
  CreditCard,
  Bell,
  Settings,
  Menu,
  X,
  ChevronLeft,
  LucideIcon,
  CheckSquare,
  CalendarDays,
  BarChart3,
  Library,
  HeadphonesIcon,
  MessagesSquare,
  UserPlus,
  Wallet,
  Building2,
  ClipboardCheck,
  Video,
  GraduationCap,
  Book,
} from "lucide-react";
import { UserRole } from "@/lib/auth";

interface SidebarProps {
  userRole: UserRole;
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navigation: Record<UserRole, NavItem[]> = {
  student: [
    { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "Programs / Courses", href: "/student/programs", icon: BookOpen },
    { name: "Lectures", href: "/student/lessons", icon: Video },
    { name: "Quizzes", href: "/student/quizzes", icon: Brain },
    { name: "Assignments", href: "/student/assignments", icon: ClipboardList },
    { name: "Attendance", href: "/student/attendance", icon: CheckSquare },
    { name: "Fees & Installments", href: "/student/fees", icon: CreditCard },
    { name: "Library & Resources", href: "/student/library", icon: Library },
    { name: "Q&A / Discussions", href: "/student/qna", icon: MessagesSquare },
    {
      name: "Chat & Announcements",
      href: "/student/chat",
      icon: MessageSquare,
    },
    {
      name: "Calendar / Events",
      href: "/student/calendar",
      icon: CalendarDays,
    },
    { name: "Notifications", href: "/student/notifications", icon: Bell },
    { name: "Settings", href: "/student/settings", icon: Settings },
  ],
  teacher: [
    { name: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    { name: "Programs / Courses", href: "/teacher/programs", icon: BookOpen },
    // { name: "Lectures", href: "/teacher/lectures", icon: Video },
    { name: "Quizzes", href: "/teacher/quizzes", icon: Brain },
    { name: "Assignments", href: "/teacher/assignments", icon: ClipboardList },
    { name: "Attendance", href: "/teacher/attendance", icon: CheckSquare },
    { name: "Hiring Requests", href: "/teacher/hiring", icon: UserPlus },
    {
      name: "Counselling Hours",
      href: "/teacher/counselling",
      icon: HeadphonesIcon,
    },
    { name: "Q&A Management", href: "/teacher/qna", icon: MessagesSquare },
    {
      name: "Chat & Announcements",
      href: "/teacher/chat",
      icon: MessageSquare,
    },
    {
      name: "Calendar / Events",
      href: "/teacher/calendar",
      icon: CalendarDays,
    },
    { name: "Reports & Analytics", href: "/teacher/reports", icon: BarChart3 },
    { name: "Notifications", href: "/teacher/notifications", icon: Bell },
    { name: "Settings", href: "/teacher/settings", icon: Settings },
  ],
  admin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Programs / Courses", href: "/admin/programs", icon: BookOpen },
    { name: "Courses", href: "/admin/courses", icon: Book },
    { name: "Semesters", href: "/admin/semesters", icon: GraduationCap },
    // { name: "Lectures", href: "/admin/lectures", icon: Video },
    { name: "Quizzes", href: "/admin/quizzes", icon: Brain },
    { name: "Users / Roles", href: "/admin/users", icon: Users },
    { name: "Departments", href: "/admin/departments", icon: Building2 },
    { name: "Assignments", href: "/admin/assignments", icon: ClipboardList },
    { name: "Attendance", href: "/admin/attendance", icon: CheckSquare },
    { name: "Fees & Installments", href: "/admin/feespage", icon: CreditCard },
    { name: "Hiring Management", href: "/admin/hiring", icon: UserPlus },
    { name: "Library Management", href: "/admin/library", icon: Library },
    { name: "Payroll Overview", href: "/admin/payroll", icon: Wallet },
    { name: "Chat & Announcements", href: "/admin/chat", icon: MessageSquare },
    { name: "Calendar / Events", href: "/admin/calendar", icon: CalendarDays },
    { name: "Reports & Analytics", href: "/admin/reports", icon: BarChart3 },
    { name: "Notifications", href: "/admin/notifications", icon: Bell },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ],
  parent: [
    { name: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
    { name: "Academic Progress", href: "/parent/programs", icon: BookOpen },
    { name: "Lecture Materials", href: "/parent/lectures", icon: Video },
    { name: "Quiz Results", href: "/parent/quizzes", icon: Brain },
    {
      name: "Assignment Tracking",
      href: "/parent/assignments",
      icon: ClipboardList,
    },
    {
      name: "Attendance Monitoring",
      href: "/parent/attendance",
      icon: CheckSquare,
    },
    { name: "Fees & Payments", href: "/parent/fees", icon: CreditCard },
    {
      name: "Chat & Communication",
      href: "/parent/chat",
      icon: MessageSquare,
    },
    {
      name: "Calendar / Events",
      href: "/parent/calendar",
      icon: CalendarDays,
    },
    { name: "Notifications", href: "/parent/notifications", icon: Bell },
    { name: "Settings", href: "/parent/settings", icon: Settings },
  ],
  hr: [
    { name: "Dashboard", href: "/hr/dashboard", icon: LayoutDashboard },
    { name: "Employee Management", href: "/hr/employees", icon: Users },
    { name: "Hiring Requests", href: "/hr/hiring", icon: UserPlus },
    { name: "Payroll Processing", href: "/hr/payroll", icon: Wallet },
    { name: "Attendance Records", href: "/hr/attendance", icon: CheckSquare },
    { name: "Department Overview", href: "/hr/departments", icon: Building2 },
    { name: "Chat & Announcements", href: "/hr/chat", icon: MessageSquare },
    { name: "Calendar / Events", href: "/hr/calendar", icon: CalendarDays },
    { name: "Reports & Analytics", href: "/hr/reports", icon: BarChart3 },
    { name: "Notifications", href: "/hr/notifications", icon: Bell },
    { name: "Settings", href: "/hr/settings", icon: Settings },
  ],
  hod: [
    { name: "Dashboard", href: "/hod/dashboard", icon: LayoutDashboard },
    { name: "Programs / Courses", href: "/hod/programs", icon: BookOpen },
    { name: "Semesters", href: "/hod/semesters", icon: GraduationCap },
    // { name: "Lectures", href: "/hod/lectures", icon: Video },
    { name: "Quizzes", href: "/hod/quizzes", icon: Brain },
    { name: "Assignments", href: "/hod/assignments", icon: ClipboardList },
    { name: "Attendance", href: "/hod/attendance", icon: CheckSquare },
    { name: "Hiring Requests", href: "/hod/hiring", icon: UserPlus },
    { name: "Faculty Management", href: "/hod/faculty", icon: Users },
    // {
    //   name: "Counselling Hours",
    //   href: "/hod/counselling",
    //   icon: HeadphonesIcon,
    // },
    // { name: "Q&A Management", href: "/hod/qna", icon: MessagesSquare },
    { name: "Chat & Announcements", href: "/hod/chat", icon: MessageSquare },
    { name: "Calendar / Events", href: "/hod/calendar", icon: CalendarDays },
    { name: "Reports & Analytics", href: "/hod/reports", icon: BarChart3 },
    { name: "Notifications", href: "/hod/notifications", icon: Bell },
    { name: "Settings", href: "/hod/settings", icon: Settings },
  ],
  finance: [
    { name: "Dashboard", href: "/finance/dashboard", icon: LayoutDashboard },
    { name: "Fee Collection", href: "/finance/fees", icon: CreditCard },
    { name: "Payroll Management", href: "/finance/payroll", icon: Wallet },
    { name: "Financial Reports", href: "/finance/reports", icon: BarChart3 },
    {
      name: "Transaction Records",
      href: "/finance/transactions",
      icon: ClipboardCheck,
    },
    { name: "Budget Management", href: "/finance/budget", icon: Wallet },
    { name: "Employee Payments", href: "/finance/payments", icon: Users },
    {
      name: "Chat & Announcements",
      href: "/finance/chat",
      icon: MessageSquare,
    },
    {
      name: "Calendar / Events",
      href: "/finance/calendar",
      icon: CalendarDays,
    },
    { name: "Settings", href: "/finance/settings", icon: Settings },
  ],
  staff: [
    { name: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
    { name: "Attendance", href: "/staff/attendance", icon: CheckSquare },
    { name: "Assigned Tasks", href: "/staff/tasks", icon: ClipboardList },
    { name: "Bus Management", href: "/staff/bus", icon: Building2 },
    { name: "Library Resources", href: "/staff/library", icon: Library },
    { name: "Chat & Announcements", href: "/staff/chat", icon: MessageSquare },
    { name: "Calendar / Events", href: "/staff/calendar", icon: CalendarDays },
    { name: "Notifications", href: "/staff/notifications", icon: Bell },
    { name: "Settings", href: "/staff/settings", icon: Settings },
  ],
};

export function Sidebar({ userRole, isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const navItems = navigation[userRole] || navigation.student;

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity",
          isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
        onClick={onToggle}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex-shrink-0",
          "fixed lg:sticky top-0 inset-y-0 left-0 z-50 h-screen",
          isCollapsed
            ? "w-20 -translate-x-full lg:translate-x-0"
            : "w-72 lg:w-64 translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 flex-shrink-0">
            <div
              className={cn(
                "flex items-center space-x-3",
                isCollapsed && "lg:justify-center lg:space-x-0 lg:w-full",
              )}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-sm">EP</span>
              </div>
              {!isCollapsed && (
                <span className="text-xl font-bold text-gray-900 truncate">
                  EduPilot
                </span>
              )}
            </div>

            {/* Close/Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(isCollapsed && "hidden lg:flex")}
            >
              {isCollapsed ? (
                <ChevronLeft className="h-4 w-4 rotate-180" />
              ) : (
                <>
                  <X className="h-5 w-5 lg:hidden" />
                  <ChevronLeft className="h-4 w-4 hidden lg:block" />
                </>
              )}
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3">
            <nav className="space-y-1 py-4">
              {navItems.map((item: NavItem) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        window.innerWidth < 1024 &&
                        !isCollapsed
                      ) {
                        onToggle();
                      }
                    }}
                    className={cn(
                      "flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-colors",
                      isActive
                        ? "bg-blue-100 text-blue-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                      isCollapsed && "lg:justify-center lg:px-2",
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        !isCollapsed && "mr-3",
                      )}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}
