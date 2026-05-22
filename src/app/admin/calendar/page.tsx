/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { JSX, useEffect, useState } from "react"
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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import supabase from "@/lib/supabase/client"

interface CalendarEvent {
  id: string
  title: string
  description?: string
  type: "class" | "exam" | "holiday" | "event"
  start_at: string
  end_at?: string
  location?: string
  // semester removed from UI usage, still allowed as optional if it exists in DB
  semester?: string
  class_code?: string
  participants?: number
  created_by?: string
}

interface FormData {
  title: string
  description: string
  type: "class" | "exam" | "holiday" | "event"
  start_at: string
  end_at: string
  location: string
  // semester removed from form
  class_code: string
  participants: string
}

export default function AdminCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "week">("month")
  // semester filter removed
  const [selectedType, setSelectedType] = useState<"all" | "class" | "exam" | "holiday" | "event">("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("calendar_events")
          .select("*")
          .order("start_at", { ascending: true })

        if (error) {
          console.error("Supabase fetch error:", error)
          throw error
        }

        setEvents(data || [])
      } catch (err) {
        console.error("Error loading events:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!formData.title.trim()) {
        alert("Title is required")
        return
      }

      if (!formData.start_at) {
        alert("Start date and time is required")
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
        // semester not set for new events (null in DB)
        semester: null,
        class_code: formData.class_code.trim() || null,
        participants: formData.participants ? Number.parseInt(formData.participants) : null,
        created_by: user?.id || "admin",
      }

      console.log("Inserting event:", eventData)

      if (!user) {
        console.warn("No authenticated user found. Trying to insert without auth...")
      }

      const { data, error } = await supabase.from("calendar_events").insert([eventData]).select()

      if (error) {
        console.error("Supabase insert error details:", error)

        if (error.message.includes("violates row-level security policy")) {
          console.error("RLS Policy Error. Please run this SQL in Supabase SQL Editor:")
          console.error(`
            -- Option 1: Disable RLS for calendar_events table (easiest for admin-only page)
            ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
            
            -- Option 2: Create a policy that allows authenticated users to insert
            CREATE POLICY "Allow authenticated users to insert events" 
            ON calendar_events 
            FOR INSERT 
            TO authenticated 
            WITH CHECK (true);
            
            -- Option 3: Create a policy that allows all operations for authenticated users
            CREATE POLICY "Allow all for authenticated users" 
            ON calendar_events 
            FOR ALL 
            TO authenticated 
            USING (true) 
            WITH CHECK (true);
          `)

          throw new Error("Database security policy blocking insert. Check console for SQL to fix.")
        }
        throw error
      }

      console.log("Event added successfully:", data)

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

      const { data: newEvents } = await supabase
        .from("calendar_events")
        .select("*")
        .order("start_at", { ascending: true })

      setEvents(newEvents || [])
    } catch (err: any) {
      console.error("Full error adding event:", err)
      alert(`Failed to add event: ${err.message || "Unknown error"}. Check console for database fix instructions.`)
    }
  }

  const handleEditEvent = (event: CalendarEvent) => {
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

      if (error) {
        console.error("Update error:", error)
        throw error
      }

      const { data } = await supabase.from("calendar_events").select("*").order("start_at", { ascending: true })
      setEvents(data || [])
      setShowEditModal(false)
      setEditingEvent(null)
    } catch (err: any) {
      console.error("Error updating event:", err)
      alert(`Failed to update event: ${err.message || "Unknown error"}`)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return

    try {
      const { error } = await supabase.from("calendar_events").delete().eq("id", eventId)

      if (error) {
        console.error("Delete error:", error)
        throw error
      }

      setEvents(events.filter((e) => e.id !== eventId))
    } catch (err: any) {
      console.error("Error deleting event:", err)
      alert(`Failed to delete event: ${err.message || "Unknown error"}`)
    }
  }

  const handleDeleteAllPastEvents = async () => {
    if (!confirm("Are you sure you want to delete ALL past events? This action cannot be undone.")) return

    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .lt("start_at", now)

      if (error) {
        console.error("Delete past events error:", error)
        throw error
      }

      const { data } = await supabase.from("calendar_events").select("*").order("start_at", { ascending: true })
      setEvents(data || [])
    } catch (err: any) {
      console.error("Error deleting past events:", err)
      alert(`Failed to delete past events: ${err.message || "Unknown error"}`)
    }
  }

  const handleDeleteAllEvents = async () => {
    if (!confirm("Are you sure you want to delete ALL events? This will clear the entire calendar!")) return

    try {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")

      if (error) {
        console.error("Delete all events error:", error)
        throw error
      }

      setEvents([])
    } catch (err: any) {
      console.error("Error deleting all events:", err)
      alert(`Failed to delete all events: ${err.message || "Unknown error"}`)
    }
  }

  const handleExportEvents = async () => {
    try {
      const { data } = await supabase
        .from("calendar_events")
        .select("*")
        .order("start_at", { ascending: true })

      if (!data) return

      const csvContent = [
        ["ID", "Title", "Description", "Type", "Start Date", "End Date", "Location", "Semester", "Class Code", "Participants"].join(
          ",",
        ),
        ...data.map((event) =>
          [
            event.id,
            `"${event.title.replace(/"/g, '""')}"`,
            `"${(event.description || "").replace(/"/g, '""')}"`,
            event.type,
            new Date(event.start_at).toISOString(),
            event.end_at ? new Date(event.end_at).toISOString() : "",
            `"${(event.location || "").replace(/"/g, '""')}"`,
            event.semester || "",
            event.class_code || "",
            event.participants || "",
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `calendar-events-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error("Error exporting events:", err)
      alert(`Failed to export events: ${err.message || "Unknown error"}`)
    }
  }

  const filteredEvents = events.filter((event) => {
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
              title="Add event to this day"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 4).map((event) => (
              <div key={event.id} className="group relative">
                <div
                  className={`text-xs p-1 rounded truncate border ${eventTypeColors[event.type]} cursor-pointer hover:opacity-80`}
                  title={`${event.title} (${event.type})`}
                  onClick={() => handleEditEvent(event)}
                >
                  <div className="truncate">{event.title}</div>
                  <div className="text-[10px] opacity-75 truncate">
                    {new Date(event.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteEvent(event.id)
                  }}
                  className="absolute -right-1 -top-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                  title="Delete event"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
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
    class: events.filter((e) => e.type === "class").length,
    exam: events.filter((e) => e.type === "exam").length,
    holiday: events.filter((e) => e.type === "holiday").length,
    event: events.filter((e) => e.type === "event").length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600">Loading admin calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">University Calendar Management</h1>
              <p className="text-gray-600">All events are visible to all programs</p>
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
                Add New Event
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Semester filter removed completely */}

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

        <Card className="mb-6 bg-white border-gray-200">
          <CardHeader className="pb-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Calendar className="w-5 h-5" />
                  University Calendar - {monthYear}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  All events are for all programs • Click events to edit • Hover and click trash icon to delete
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
                <p className="text-gray-600">Loading calendar...</p>
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
                  Showing: {filteredEvents.length} of {events.length} events
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    className="border-l-4 border-blue-500 pl-4 py-3 group hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => handleEditEvent(event)}>
                        <div className="font-semibold text-gray-900 hover:text-blue-600">{event.title}</div>
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
                          {/* semester badge removed */}
                        </div>
                      </div>
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
                <Calendar className="w-5 h-5" />
                Admin Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">University Events</p>
                  <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                  <p className="text-xs text-gray-500 mt-1">All events visible to all programs</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Upcoming</p>
                    <p className="text-2xl font-bold text-gray-900">{upcomingEvents.length}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Past</p>
                    <p className="text-2xl font-bold text-gray-900">{pastEvents}</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">Events This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      events.filter((e) => {
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
                    Add New Event
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
                <h2 className="text-xl font-semibold text-gray-900">Add New Event</h2>
                <p className="text-gray-600 text-sm mt-1">Event will be visible to all programs</p>
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
                        Start Date &amp; Time *
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
                      <label className="block text-sm font-medium text-gray-900 mb-1">End Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={formData.end_at}
                        onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {/* Semester field removed */}
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
                      Create Event
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
                <h2 className="text-xl font-semibold text-gray-900">Edit Event</h2>
                <p className="text-gray-600 text-sm mt-1">Update calendar event details</p>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        Start Date &amp; Time *
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
                      <label className="block text-sm font-medium text-gray-900 mb-1">End Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={formData.end_at}
                        onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {/* Semester field removed */}
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
                      onClick={() => {
                        setShowEditModal(false)
                        setEditingEvent(null)
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
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
