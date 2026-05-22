/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type React from "react"

import { JSX, useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Calendar,
  Filter,
  BookOpen,
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
  class_code?: string
  participants?: number
  created_by?: string
}

export default function StudentCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "week">("month")
  const [selectedType, setSelectedType] = useState<"all" | "class" | "exam" | "holiday" | "event">("all")
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventDetails, setShowEventDetails] = useState(false)

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

  const eventTypeIcons: Record<"class" | "exam" | "holiday" | "event", string> = {
    class: "📚",
    exam: "📝",
    holiday: "🎉",
    event: "📅",
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

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventDetails(true)
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
          className={`p-2 border rounded-lg min-h-28 overflow-y-auto transition-colors hover:bg-gray-50 ${
            isToday ? "bg-blue-50 border-blue-300" : "border-gray-200"
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <div className={`text-sm font-semibold ${isToday ? "text-blue-600" : ""}`}>{date}</div>
            {dayEvents.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {dayEvents.length}
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 4).map((event) => (
              <div
                key={event.id}
                className={`text-xs p-1.5 rounded truncate border ${eventTypeColors[event.type]} cursor-pointer hover:opacity-80 transition-opacity`}
                title={`${event.title} (${event.type})`}
                onClick={() => handleEventClick(event)}
              >
                <div className="flex items-center gap-1">
                  <span>{eventTypeIcons[event.type]}</span>
                  <span className="truncate font-medium">{event.title}</span>
                </div>
                <div className="text-[10px] opacity-75 mt-0.5">
                  {new Date(event.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
            {dayEvents.length > 4 && (
              <div className="text-xs text-blue-600 pl-1 cursor-pointer hover:underline">
                +{dayEvents.length - 4} more
              </div>
            )}
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

  const todayEvents = filteredEvents.filter((event) => {
    const eventDate = new Date(event.start_at)
    const today = new Date()
    return eventDate.toDateString() === today.toDateString()
  })

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your calendar...</p>
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Calendar</h1>
              <p className="text-gray-600">Stay updated with your classes, exams, and university events</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">Filter by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as "all" | "class" | "exam" | "holiday" | "event")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Events</option>
                <option value="class">📚 Classes</option>
                <option value="exam">📝 Exams</option>
                <option value="holiday">🎉 Holidays</option>
                <option value="event">📅 Events</option>
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
              <CardTitle className="text-sm font-medium text-gray-900">Today's Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{todayEvents.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {todayEvents.length === 0 ? "No events today" : "Events scheduled"}
                </p>
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
                  {monthYear}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Click on any event to view details
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3"
                >
                  Today
                </Button>
                <div className="text-sm font-medium px-3 text-gray-900 min-w-[120px] text-center">
                  {monthYear}
                </div>
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
            <div className="grid grid-cols-7 gap-2">{renderCalendarGrid()}</div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Event Types:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(eventTypeColors).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded ${color.split(" ")[0]}`} />
                        <span className="text-xs text-gray-900">{eventTypeIcons[type as keyof typeof eventTypeIcons]}</span>
                        <span className="text-xs text-gray-900 capitalize">{type}</span>
                        <Badge variant="outline" className="ml-1 text-xs">
                          {eventTypeCounts[type as keyof typeof eventTypeCounts]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Showing: {filteredEvents.length} events
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Clock className="w-5 h-5" />
                Upcoming Events
                <Badge variant="secondary" className="ml-2">
                  {upcomingEvents.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your next scheduled activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">No upcoming events</p>
                </div>
              ) : (
                upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="border-l-4 border-blue-500 pl-4 py-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          {eventTypeIcons[event.type]} {event.title}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1 mt-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {new Date(event.start_at).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            •{" "}
                            {new Date(event.start_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
                          {event.class_code && (
                            <Badge variant="outline" className="capitalize">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {event.class_code}
                            </Badge>
                          )}
                        </div>
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
                Today's Schedule
              </CardTitle>
              <CardDescription className="text-gray-600">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-gray-600 text-sm">No events scheduled for today</p>
                  <p className="text-gray-500 text-xs mt-1">Enjoy your day!</p>
                </div>
              ) : (
                todayEvents
                  .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                  .map((event) => (
                    <div
                      key={event.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {eventTypeIcons[event.type]} {event.title}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1 mt-2">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {new Date(event.start_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {event.end_at && (
                                <>
                                  {" - "}
                                  {new Date(event.end_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </>
                              )}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </div>
                            )}
                            {event.class_code && (
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                {event.class_code}
                              </div>
                            )}
                          </div>
                          <div className="mt-2">
                            <Badge
                              className={`capitalize ${eventTypeColors[event.type]}`}
                            >
                              {event.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-2 rounded">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Event Details Modal */}
        {showEventDetails && selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-lg bg-white rounded-lg shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {eventTypeIcons[selectedEvent.type]} {selectedEvent.title}
                    </h2>
                    <Badge className={`mt-2 capitalize ${eventTypeColors[selectedEvent.type]}`}>
                      {selectedEvent.type}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Date & Time</p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedEvent.start_at).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedEvent.start_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {selectedEvent.end_at && (
                          <>
                            {" - "}
                            {new Date(selectedEvent.end_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {selectedEvent.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Location</p>
                        <p className="text-sm text-gray-600">{selectedEvent.location}</p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.class_code && (
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Class Code</p>
                        <p className="text-sm text-gray-600">{selectedEvent.class_code}</p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.participants && (
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Participants</p>
                        <p className="text-sm text-gray-600">{selectedEvent.participants} people</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedEvent.description && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-2">Description</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEventDetails(false)
                    setSelectedEvent(null)
                  }}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}