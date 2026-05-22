/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"
import { JSX, useEffect, useState, useRef } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Trash2,
  Edit,
  Calendar,
  Download,
  Filter,
  ShieldAlert,
  Building2,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/auth"
import Link from "next/link"
import { toast } from "sonner"

interface CalendarEvent {
  id: string
  title: string
  description?: string
  type: "class" | "exam" | "holiday" | "event"
  start_at: string
  end_at?: string
  location?: string
  semester?: string
  class_code?: string
  participants?: number
  created_by?: string
  department_id?: string | null
}

interface FormData {
  title: string
  description: string
  type: "class" | "exam" | "holiday" | "event"
  start_at: string
  end_at: string
  location: string
  class_code: string
  participants: string
}

type HodProfile = { 
  id: string; 
  department_id: string; 
  full_name: string | null 
}

type AuthState = 'loading' | 'ok' | 'not_hod' | 'no_department'

export default function HodCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]) // University-wide events
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "week">("month")
  const [selectedType, setSelectedType] = useState<"all" | "class" | "exam" | "holiday" | "event">("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [showUniversityEvents, setShowUniversityEvents] = useState(true)
  
  // HOD auth state
  const [hod, setHod] = useState<HodProfile | null>(null)
  const [deptName, setDeptName] = useState('')
  const [authState, setAuthState] = useState<AuthState>('loading')
  const hodRef = useRef<HodProfile | null>(null)

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    type: "class",
    start_at: "",
    end_at: "",
    location: "",
    class_code: "",
    participants: "",
  })

  // Verify HOD and load department info
  useEffect(() => {
    (async () => {
      setAuthState('loading')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { 
        setAuthState('not_hod')
        setLoading(false)
        return 
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('id, full_name, role, department_id')
        .eq('id', user.id)
        .single()

      if (error || !profile || profile.role !== 'hod') {
        setAuthState('not_hod')
        setLoading(false)
        return
      }
      
      if (!profile.department_id) {
        setAuthState('no_department')
        setLoading(false)
        return
      }

      const hodProfile: HodProfile = {
        id: profile.id,
        department_id: profile.department_id,
        full_name: profile.full_name,
      }

      hodRef.current = hodProfile
      setHod(hodProfile)

      // Load department name
      const { data: dept } = await supabase
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .single()
      
      setDeptName(dept?.name || 'Your Department')
      setAuthState('ok')
      
      // Load events after auth is confirmed
      await fetchEvents(profile.department_id)
      setLoading(false)
    })()
  }, [])

 const fetchEvents = async (departmentId?: string) => {
  try {
    const deptId = departmentId || hodRef.current?.department_id
    if (!deptId) return

    // Fetch department-specific events
    const { data: deptEvents, error: deptError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("department_id", deptId)
      .order("start_at", { ascending: true })

    if (deptError) {
      console.error("Department events error:", {
        message: deptError.message,
        details: deptError.details,
        hint: deptError.hint,
        code: deptError.code,
      })
      toast.error(`Failed to load department events: ${deptError.message}`)
      return
    }

    // Fetch university-wide events (department_id is null)
    const { data: univEvents, error: univError } = await supabase
      .from("calendar_events")
      .select("*")
      .is("department_id", null)
      .order("start_at", { ascending: true })

    if (univError) {
      console.error("University events error:", {
        message: univError.message,
        details: univError.details,
        hint: univError.hint,
        code: univError.code,
      })
      toast.error(`Failed to load university events: ${univError.message}`)
    }

    setEvents(deptEvents || [])
    setAllEvents(univEvents || [])
  } catch (err: any) {
    console.error("Unexpected error loading events:", err)
    toast.error("Failed to load calendar events")
  }
}

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!formData.title.trim()) {
        toast.error("Title is required")
        return
      }

      if (!formData.start_at) {
        toast.error("Start date and time is required")
        return
      }

      const startDate = new Date(formData.start_at)
      const endDate = formData.end_at ? new Date(formData.end_at) : null

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        start_at: startDate.toISOString(),
        end_at: endDate ? endDate.toISOString() : null,
        location: formData.location.trim() || null,
        semester: null,
        class_code: formData.class_code.trim() || null,
        participants: formData.participants ? Number.parseInt(formData.participants) : null,
        created_by: user?.id || hod?.id,
        department_id: hod?.department_id, // Automatically scoped to HOD's department
      }

      const { data, error } = await supabase.from("calendar_events").insert([eventData]).select()

      if (error) {
        console.error("Insert error:", error)
        toast.error(`Failed to add event: ${error.message}`)
        throw error
      }

      toast.success("Event added successfully")

      setFormData({
        title: "",
        description: "",
        type: "class",
        start_at: "",
        end_at: "",
        location: "",
        class_code: "",
        participants: "",
      })
      setShowAddModal(false)

      // Refresh events
      await fetchEvents()
    } catch (err: any) {
      console.error("Error adding event:", err)
      toast.error(`Failed to add event: ${err.message || "Unknown error"}`)
    }
  }

  const handleEditEvent = (event: CalendarEvent) => {
    // Check if HOD can edit this event (only department events)
    if (event.department_id && event.department_id !== hod?.department_id) {
      toast.error("You can only edit your department's events")
      return
    }

    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description || "",
      type: event.type,
      start_at: event.start_at.slice(0, 16),
      end_at: event.end_at ? event.end_at.slice(0, 16) : "",
      location: event.location || "",
      class_code: event.class_code || "",
      participants: event.participants?.toString() || "",
    })
    setShowEditModal(true)
  }

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent) return

    try {
      const { error } = await supabase
        .from("calendar_events")
        .update({
          title: formData.title,
          description: formData.description || null,
          type: formData.type,
          start_at: new Date(formData.start_at).toISOString(),
          end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
          location: formData.location || null,
          semester: null,
          class_code: formData.class_code || null,
          participants: formData.participants ? Number.parseInt(formData.participants) : null,
        })
        .eq("id", editingEvent.id)
        .eq("department_id", hod?.department_id) // Only allow updating own department events

      if (error) {
        console.error("Update error:", error)
        toast.error(`Failed to update event: ${error.message}`)
        throw error
      }

      toast.success("Event updated successfully")
      await fetchEvents()
      setShowEditModal(false)
      setEditingEvent(null)
    } catch (err: any) {
      console.error("Error updating event:", err)
      toast.error(`Failed to update event: ${err.message || "Unknown error"}`)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return

    try {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", eventId)
        .eq("department_id", hod?.department_id) // Only allow deleting own department events

      if (error) {
        console.error("Delete error:", error)
        toast.error(`Failed to delete event: ${error.message}`)
        throw error
      }

      toast.success("Event deleted successfully")
      await fetchEvents()
    } catch (err: any) {
      console.error("Error deleting event:", err)
      toast.error(`Failed to delete event: ${err.message || "Unknown error"}`)
    }
  }

  const handleDeleteAllPastEvents = async () => {
    if (!confirm("Are you sure you want to delete ALL past department events? This action cannot be undone.")) return

    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .lt("start_at", now)
        .eq("department_id", hod?.department_id)

      if (error) {
        console.error("Delete past events error:", error)
        toast.error(`Failed to delete past events: ${error.message}`)
        throw error
      }

      toast.success("Past events cleaned successfully")
      await fetchEvents()
    } catch (err: any) {
      console.error("Error deleting past events:", err)
      toast.error(`Failed to delete past events: ${err.message || "Unknown error"}`)
    }
  }

  const handleExportEvents = async () => {
    try {
      // Export both department and visible university events
      const allVisibleEvents = showUniversityEvents 
        ? [...events, ...allEvents]
        : events

      const visibleEvents = allVisibleEvents.filter((event) => {
        if (selectedType !== "all" && event.type !== selectedType) return false
        return true
      })

      if (!visibleEvents.length) {
        toast.error("No events to export")
        return
      }

      const csvContent = [
        ["ID", "Title", "Description", "Type", "Start Date", "End Date", "Location", "Class Code", "Participants", "Scope"].join(","),
        ...visibleEvents.map((event) =>
          [
            event.id,
            `"${event.title.replace(/"/g, '""')}"`,
            `"${(event.description || "").replace(/"/g, '""')}"`,
            event.type,
            new Date(event.start_at).toISOString(),
            event.end_at ? new Date(event.end_at).toISOString() : "",
            `"${(event.location || "").replace(/"/g, '""')}"`,
            event.class_code || "",
            event.participants || "",
            event.department_id ? "Department" : "University",
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `department-calendar-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("Events exported successfully")
    } catch (err: any) {
      console.error("Error exporting events:", err)
      toast.error(`Failed to export events: ${err.message || "Unknown error"}`)
    }
  }

  // Combine department and university events for display
  const allVisibleEvents = showUniversityEvents 
    ? [...events, ...allEvents]
    : events

  const filteredEvents = allVisibleEvents.filter((event) => {
    if (selectedType !== "all" && event.type !== selectedType) return false
    return true
  })

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const eventTypeColors: Record<"class" | "exam" | "holiday" | "event", string> = {
    class: "bg-blue-100 text-blue-900 border-blue-300",
    exam: "bg-red-100 text-red-900 border-red-300",
    holiday: "bg-amber-100 text-amber-900 border-amber-300",
    event: "bg-green-100 text-green-900 border-green-300",
  }

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.start_at)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days: JSX.Element[] = []
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={`header-${i}`} className="text-center font-semibold text-sm p-2 bg-gray-100 rounded-t">
          {weekDays[i]}
        </div>,
      )
    }

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 border" />)
    }

    for (let date = 1; date <= daysInMonth; date++) {
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), date)
      const dayEvents = getEventsForDate(dayDate)
      const isToday = new Date().toDateString() === dayDate.toDateString()

      days.push(
        <div
          key={date}
          className={`p-2 border rounded-lg min-h-32 overflow-y-auto ${
            isToday ? "bg-blue-50 border-blue-300" : "border-gray-200"
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <div className={`text-sm font-semibold ${isToday ? "text-blue-600" : ""}`}>{date}</div>
            <button
              onClick={() => {
                const eventDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(
                  2,
                  "0",
                )}-${String(date).padStart(2, "0")}T09:00`
                setFormData((prev) => ({
                  ...prev,
                  start_at: eventDate,
                }))
                setShowAddModal(true)
              }}
              className="text-xs text-gray-500 hover:text-blue-600"
              title="Add department event to this day"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 4).map((event) => (
              <div key={event.id} className="group relative">
                <div
                  className={`text-xs p-1 rounded truncate border ${eventTypeColors[event.type]} cursor-pointer hover:opacity-80 ${
                    event.department_id ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-purple-500'
                  }`}
                  title={`${event.title} (${event.type}) - ${event.department_id ? 'Department' : 'University'}`}
                  onClick={() => handleEditEvent(event)}
                >
                  <div className="truncate">{event.title}</div>
                  <div className="text-[10px] opacity-75 truncate">
                    {new Date(event.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {event.department_id ? ' • Dept' : ' • Univ'}
                  </div>
                </div>
                {event.department_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteEvent(event.id)
                    }}
                    className="absolute -right-1 -top-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                    title="Delete department event"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
            {dayEvents.length > 4 && <div className="text-xs text-gray-500 pl-1">+{dayEvents.length - 4} more</div>}
          </div>
        </div>,
      )
    }

    return days
  }

  const monthYear = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  
  const upcomingEvents = filteredEvents
    .filter((e) => new Date(e.start_at) >= new Date())
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 6)

  const pastEvents = filteredEvents.filter((e) => new Date(e.start_at) < new Date()).length

  const eventTypeCounts = {
    class: filteredEvents.filter((e) => e.type === "class").length,
    exam: filteredEvents.filter((e) => e.type === "exam").length,
    holiday: filteredEvents.filter((e) => e.type === "holiday").length,
    event: filteredEvents.filter((e) => e.type === "event").length,
  }

  // Auth states
  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (authState === 'not_hod') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 text-center max-w-md">
          This page is only accessible to HOD accounts. Please contact your administrator if you believe this is an error.
        </p>
      </div>
    )
  }

  if (authState === 'no_department') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <Building2 className="w-16 h-16 text-amber-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Department Assigned</h2>
        <p className="text-gray-600 text-center max-w-md mb-4">
          Your HOD account is not linked to any department. Please contact your administrator.
        </p>
        <Link href="/attendance">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Go to Attendance Page
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/attendance">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Department Calendar</h1>
                  <p className="text-gray-600 flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4" />
                    {deptName}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDeleteAllPastEvents} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clean Past Events
              </Button>
              <Button onClick={handleExportEvents} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Department Event
              </Button>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">Event Type</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as "all" | "class" | "exam" | "holiday" | "event")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="class">Class</option>
                <option value="exam">Exam</option>
                <option value="holiday">Holiday</option>
                <option value="event">Event</option>
              </select>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">View Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("month")}
                  className="flex-1"
                >
                  Month
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                  className="flex-1"
                >
                  Week
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">University Events</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant={showUniversityEvents ? "default" : "outline"}
                size="sm"
                onClick={() => setShowUniversityEvents(!showUniversityEvents)}
                className="w-full"
              >
                {showUniversityEvents ? "Showing" : "Hidden"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="flex-1"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Grid */}
        <Card className="mb-6 bg-white border-gray-200">
          <CardHeader className="pb-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Calendar className="w-5 h-5" />
                  {deptName} Calendar - {monthYear}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border-l-4 border-l-blue-500 bg-blue-100 rounded" /> Department Events
                    <span className="inline-block w-3 h-3 border-l-4 border-l-purple-500 bg-purple-100 rounded ml-2" /> University Events
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-sm font-medium px-3 text-gray-900">{monthYear}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">{renderCalendarGrid()}</div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Event Types:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(eventTypeColors).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded ${color.split(" ")[0]}`} />
                        <span className="text-xs text-gray-900 capitalize">{type}</span>
                        <Badge variant="outline" className="ml-1 text-xs">
                          {eventTypeCounts[type as keyof typeof eventTypeCounts]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Showing: {filteredEvents.length} events ({events.length} department, {allEvents.length} university)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events and Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Clock className="w-5 h-5" />
                Upcoming Events
                <Badge variant="secondary" className="ml-2">
                  {upcomingEvents.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-600 text-sm">No upcoming events</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`border-l-4 pl-4 py-3 group hover:bg-gray-50 rounded-lg transition-colors ${
                      event.department_id ? 'border-l-blue-500' : 'border-l-purple-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => handleEditEvent(event)}>
                        <div className="font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-2">
                          {event.title}
                          <Badge variant={event.department_id ? "default" : "secondary"} className="text-xs">
                            {event.department_id ? 'Department' : 'University'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1 mt-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {new Date(event.start_at).toLocaleDateString()} •{" "}
                            {new Date(event.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {event.location}
                            </div>
                          )}
                          {event.participants && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {event.participants} participants
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {event.type}
                          </Badge>
                        </div>
                      </div>
                      {event.department_id && (
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleEditEvent(event)}
                            className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit event"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete event"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Building2 className="w-5 h-5" />
                Department Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-gray-900">Department Events</p>
                  <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Your departments events</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Upcoming</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {upcomingEvents.filter(e => e.department_id).length}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">University</p>
                    <p className="text-2xl font-bold text-gray-900">{allEvents.length}</p>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-gray-900">Events This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      filteredEvents.filter((e) => {
                        const eventDate = new Date(e.start_at)
                        return (
                          eventDate.getMonth() === currentDate.getMonth() &&
                          eventDate.getFullYear() === currentDate.getFullYear()
                        )
                      }).length
                    }
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-3">Quick Actions</p>
                <div className="space-y-2">
                  <Button onClick={() => setShowAddModal(true)} variant="default" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Department Event
                  </Button>
                  <Button onClick={handleExportEvents} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export to CSV
                  </Button>
                  <Button onClick={handleDeleteAllPastEvents} variant="destructive" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clean Past Events
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Event Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add Department Event</h2>
                <p className="text-gray-600 text-sm mt-1">Event will be visible only to your department</p>
              </div>
              <div className="p-6">
                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Event title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Type *</label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            type: e.target.value as "class" | "exam" | "holiday" | "event",
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="class">Class</option>
                        <option value="exam">Exam</option>
                        <option value="holiday">Holiday</option>
                        <option value="event">Event</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Start Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.start_at}
                        onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">End Date & Time</label>
                      <input
                        type="datetime-local"
                        value={formData.end_at}
                        onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Event location"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Class Code</label>
                      <input
                        type="text"
                        value={formData.class_code}
                        onChange={(e) => setFormData({ ...formData, class_code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Class code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Participants</label>
                      <input
                        type="number"
                        value={formData.participants}
                        onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Number of participants"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Event description"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Create Department Event
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {showEditModal && editingEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingEvent.department_id ? 'Edit Department Event' : 'View University Event'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {editingEvent.department_id 
                    ? 'Update your department event details' 
                    : 'University events can only be viewed, not modified'}
                </p>
              </div>
              <div className="p-6">
                <form onSubmit={handleUpdateEvent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Title *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        disabled={!editingEvent.department_id}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Type *</label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            type: e.target.value as "class" | "exam" | "holiday" | "event",
                          })
                        }
                        disabled={!editingEvent.department_id}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      >
                        <option value="class">Class</option>
                        <option value="exam">Exam</option>
                        <option value="holiday">Holiday</option>
                        <option value="event">Event</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Start Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.start_at}
                        onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                        disabled={!editingEvent.department_id}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">End Date & Time</label>
                      <input
                        type="datetime-local"
                        value={formData.end_at}
                        onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                        disabled={!editingEvent.department_id}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        disabled={!editingEvent.department_id}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        placeholder="Event location"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Class Code</label>
                      <input
                        type="text"
                        value={formData.class_code}
                        onChange={(e) => setFormData({ ...formData, class_code: e.target.value })}
                        disabled={!editingEvent.department_id}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        placeholder="Class code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Participants</label>
                      <input
                        type="number"
                        value={formData.participants}
                        onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                        disabled={!editingEvent.department_id}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        placeholder="Number of participants"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={!editingEvent.department_id}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      placeholder="Event description"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setShowEditModal(false)
                        setEditingEvent(null)
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    {editingEvent.department_id && (
                      <>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            if (editingEvent) {
                              handleDeleteEvent(editingEvent.id)
                              setShowEditModal(false)
                              setEditingEvent(null)
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                          Update Event
                        </Button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}