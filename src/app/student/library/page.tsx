/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { BookOpen, Search, Filter, BookMarked, Clock, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import supabase from "@/lib/supabase/client"

type BookStatus = "available" | "borrowed" | "reserved" | "archived"

interface LibraryBook {
  id: string
  title: string
  author: string
  isbn?: string
  category?: string
  shelf_location?: string
  total_copies: number
  available_copies: number
  status: BookStatus
  published_year?: number
  language?: string
  description?: string
}

interface Reservation {
  id: string
  book_id: string
  user_id: string
  status: "pending" | "approved" | "rejected" | "returned"
  reserved_at: string
  due_date?: string
  approved_at?: string
  returned_at?: string
}

const STATUS_STYLES: Record<BookStatus, string> = {
  available: "bg-green-100 text-green-800",
  borrowed: "bg-yellow-100 text-yellow-800",
  reserved: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-600",
}

const RESERVATION_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  returned: "bg-gray-100 text-gray-600",
}

export default function StudentLibrary() {
  const [books, setBooks] = useState<LibraryBook[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [reservingId, setReservingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<"all" | string>("all")
  const [selectedStatus, setSelectedStatus] = useState<"all" | BookStatus>("all")
  const [activeTab, setActiveTab] = useState<"browse" | "my-reservations">("browse")
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      await Promise.all([fetchBooks(), user ? fetchReservations(user.id) : Promise.resolve()])
      setLoading(false)
    }
    init()
  }, [])

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from("library_books")
        .select("*")
        .neq("status", "archived")
        .order("title", { ascending: true })

      if (error) throw error
      setBooks(data || [])
    } catch (err) {
      console.error("Error fetching books:", err)
    }
  }

  const fetchReservations = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("library_reservations")
        .select("*")
        .eq("user_id", uid)
        .order("reserved_at", { ascending: false })

      if (error) throw error
      setReservations(data || [])
    } catch (err) {
      console.error("Error fetching reservations:", err)
    }
  }

  const handleReserve = async (book: LibraryBook) => {
    if (!userId) {
      alert("Please log in to reserve a book.")
      return
    }
    if (book.available_copies <= 0) {
      alert("No copies available for reservation.")
      return
    }

    const alreadyReserved = reservations.some(
      (r) => r.book_id === book.id && (r.status === "pending" || r.status === "approved"),
    )
    if (alreadyReserved) {
      alert("You already have an active reservation for this book.")
      return
    }

    setReservingId(book.id)
    try {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 14)

      const { error } = await supabase.from("library_reservations").insert([
        {
          book_id: book.id,
          user_id: userId,
          status: "pending",
          due_date: dueDate.toISOString(),
        },
      ])

      if (error) throw error

      // Update available copies in library_books
      const { error: updateError } = await supabase
        .from("library_books")
        .update({ 
          available_copies: book.available_copies - 1,
          status: book.available_copies - 1 === 0 ? "borrowed" : book.status
        })
        .eq("id", book.id)

      if (updateError) console.error("Error updating book copies:", updateError)

      await Promise.all([
        fetchBooks(),
        fetchReservations(userId)
      ])
      setSelectedBook(null)
      alert(`Reservation request submitted for "${book.title}". Please visit the library desk to collect.`)
    } catch (err: any) {
      console.error("Error reserving book:", err)
      alert(`Failed to reserve book: ${err.message || "Unknown error"}`)
    } finally {
      setReservingId(null)
    }
  }

  const handleCancelReservation = async (reservationId: string, bookId: string) => {
    if (!confirm("Cancel this reservation?")) return
    if (!userId) return

    try {
      // First, get the reservation to check its status
      const { data: reservation, error: fetchError } = await supabase
        .from("library_reservations")
        .select("*")
        .eq("id", reservationId)
        .single()

      if (fetchError) throw fetchError

      // Update reservation status to rejected
      const { error } = await supabase
        .from("library_reservations")
        .update({ status: "rejected" })
        .eq("id", reservationId)
        .eq("user_id", userId)

      if (error) throw error

      // If the reservation was approved, we need to update book copies
      if (reservation.status === "approved") {
        const book = books.find(b => b.id === bookId)
        if (book) {
          const { error: updateError } = await supabase
            .from("library_books")
            .update({ 
              available_copies: book.available_copies + 1,
              status: "available"
            })
            .eq("id", bookId)

          if (updateError) console.error("Error updating book copies:", updateError)
        }
      }

      await Promise.all([
        fetchBooks(),
        fetchReservations(userId)
      ])
    } catch (err: any) {
      console.error("Error cancelling reservation:", err)
      alert(`Failed to cancel: ${err.message || "Unknown error"}`)
    }
  }

  const normalizedSearch = searchQuery.trim().toLowerCase()

  const filteredBooks = books.filter((book) => {
    if (selectedStatus !== "all" && book.status !== selectedStatus) return false
    if (selectedCategory !== "all" && (book.category || "") !== selectedCategory) return false
    if (!normalizedSearch) return true
    const haystack = `${book.title} ${book.author} ${book.isbn || ""} ${book.category || ""}`.toLowerCase()
    return haystack.includes(normalizedSearch)
  })

  const categories = Array.from(
    new Set(books.map((b) => b.category).filter((c): c is string => !!c && c.trim().length > 0)),
  )

  const activeReservations = reservations.filter((r) => r.status === "pending" || r.status === "approved")

  const isBookReservedByMe = (bookId: string) =>
    reservations.some((r) => r.book_id === bookId && (r.status === "pending" || r.status === "approved"))

  const getBookDetails = (bookId: string) => {
    return books.find(b => b.id === bookId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600">Loading library...</p>
        </div>
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">University Library</h1>
              <p className="text-gray-600">Browse and reserve books from our catalog</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === "browse" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("browse")}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Books
              </Button>
              <Button
                variant={activeTab === "my-reservations" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("my-reservations")}
              >
                <BookMarked className="w-4 h-4 mr-2" />
                My Reservations
                {activeReservations.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeReservations.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ── BROWSE TAB ── */}
        {activeTab === "browse" && (
          <>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search by title, author, ISBN"
                  />
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as "all" | BookStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Books</option>
                    <option value="available">Available</option>
                    <option value="borrowed">Borrowed</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </CardContent>
              </Card>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Book list */}
              <Card className="lg:col-span-2 bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <BookOpen className="w-5 h-5" />
                    Library Catalog
                    <Badge variant="secondary" className="ml-2">
                      {filteredBooks.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Click a book to view details and reserve
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredBooks.length === 0 ? (
                    <p className="text-gray-600 text-sm">No books found for current filters.</p>
                  ) : (
                    filteredBooks.map((book) => {
                      const reservedByMe = isBookReservedByMe(book.id)
                      return (
                        <div
                          key={book.id}
                          onClick={() => setSelectedBook(book)}
                          className={`border-l-4 pl-4 py-3 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors ${
                            book.available_copies > 0 ? "border-blue-500" : "border-gray-300"
                          } ${selectedBook?.id === book.id ? "bg-blue-50" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900 hover:text-blue-600">
                                  {book.title}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[book.status]}`}
                                >
                                  {book.status}
                                </span>
                                {book.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {book.category}
                                  </Badge>
                                )}
                                {reservedByMe && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Reserved by you
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">Author:</span>
                                  <span>{book.author}</span>
                                  {book.isbn && (
                                    <>
                                      <span className="text-gray-400">•</span>
                                      <span className="font-medium">ISBN:</span>
                                      <span>{book.isbn}</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">Copies available:</span>
                                  <span className={book.available_copies > 0 ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>
                                    {book.available_copies}/{book.total_copies}
                                  </span>
                                  {book.shelf_location && (
                                    <>
                                      <span className="text-gray-400">•</span>
                                      <span className="font-medium">Shelf:</span>
                                      <span>{book.shelf_location}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              {/* Book detail / stats panel */}
              <div className="space-y-4">
                {selectedBook ? (
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-gray-900 text-base">{selectedBook.title}</CardTitle>
                      <CardDescription className="text-gray-600">by {selectedBook.author}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Status</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[selectedBook.status]}`}
                          >
                            {selectedBook.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Available copies</span>
                          <span className={`font-semibold ${selectedBook.available_copies > 0 ? "text-green-700" : "text-red-600"}`}>
                            {selectedBook.available_copies} / {selectedBook.total_copies}
                          </span>
                        </div>
                        {selectedBook.category && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Category</span>
                            <span className="text-gray-900">{selectedBook.category}</span>
                          </div>
                        )}
                        {selectedBook.isbn && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">ISBN</span>
                            <span className="text-gray-900">{selectedBook.isbn}</span>
                          </div>
                        )}
                        {selectedBook.shelf_location && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Shelf</span>
                            <span className="text-gray-900">{selectedBook.shelf_location}</span>
                          </div>
                        )}
                        {selectedBook.published_year && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Published</span>
                            <span className="text-gray-900">{selectedBook.published_year}</span>
                          </div>
                        )}
                        {selectedBook.language && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Language</span>
                            <span className="text-gray-900">{selectedBook.language}</span>
                          </div>
                        )}
                      </div>

                      {selectedBook.description && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{selectedBook.description}</p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-200 space-y-2">
                        {isBookReservedByMe(selectedBook.id) ? (
                          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <p className="text-sm text-blue-700">
                              You have an active reservation for this book.
                            </p>
                          </div>
                        ) : selectedBook.available_copies > 0 ? (
                          <Button
                            onClick={() => handleReserve(selectedBook)}
                            disabled={reservingId === selectedBook.id}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <BookMarked className="w-4 h-4 mr-2" />
                            {reservingId === selectedBook.id ? "Reserving..." : "Reserve Book"}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <XCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <p className="text-sm text-gray-600">No copies available right now.</p>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setSelectedBook(null)}
                        >
                          Close
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-gray-900 text-base">
                        <BookOpen className="w-5 h-5" />
                        Library Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-900">Total Books</p>
                        <p className="text-2xl font-bold text-gray-900">{books.length}</p>
                        <p className="text-xs text-gray-500 mt-1">In the library catalog</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm font-medium text-gray-900">Available</p>
                          <p className="text-2xl font-bold text-green-700">
                            {books.filter((b) => b.status === "available").length}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm font-medium text-gray-900">Borrowed</p>
                          <p className="text-2xl font-bold text-yellow-700">
                            {books.filter((b) => b.status === "borrowed").length}
                          </p>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900">My Active Reservations</p>
                        <p className="text-2xl font-bold text-blue-700">{activeReservations.length}</p>
                        <p className="text-xs text-blue-600 mt-1">Loan period: 14 days</p>
                      </div>
                      <p className="text-xs text-gray-500 text-center pt-1">
                        Click any book to view details &amp; reserve
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── MY RESERVATIONS TAB ── */}
        {activeTab === "my-reservations" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <BookMarked className="w-5 h-5" />
                  My Reservations
                  <Badge variant="secondary" className="ml-2">
                    {reservations.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Track your current and past book reservations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {reservations.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">You have no reservations yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setActiveTab("browse")}
                    >
                      Browse Books
                    </Button>
                  </div>
                ) : (
                  reservations.map((reservation) => {
                    const book = getBookDetails(reservation.book_id)
                    const isActive = reservation.status === "pending" || reservation.status === "approved"
                    return (
                      <div
                        key={reservation.id}
                        className={`border-l-4 pl-4 py-3 rounded-lg ${
                          isActive ? "border-blue-500" : "border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">
                                {book?.title ?? "Unknown Book"}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${RESERVATION_STATUS_STYLES[reservation.status]}`}
                              >
                                {reservation.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-0.5">
                              {book?.author && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Author:</span>
                                  <span>{book.author}</span>
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="font-medium">Reserved:</span>
                                <span>
                                  {new Date(reservation.reserved_at).toLocaleDateString()}
                                </span>
                                {reservation.due_date && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span className="font-medium">Due:</span>
                                    <span>{new Date(reservation.due_date).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                              {reservation.approved_at && (
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="text-xs">Approved on {new Date(reservation.approved_at).toLocaleDateString()}</span>
                                </div>
                              )}
                              {book?.shelf_location && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Shelf:</span>
                                  <span>{book.shelf_location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {isActive && (
                            <button
                              onClick={() => handleCancelReservation(reservation.id, reservation.book_id)}
                              className="text-xs text-red-600 hover:underline whitespace-nowrap"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Reservation summary */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 text-base">
                  <BookMarked className="w-5 h-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">Total Reservations</p>
                  <p className="text-2xl font-bold text-gray-900">{reservations.length}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Pending</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      {reservations.filter((r) => r.status === "pending").length}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Approved</p>
                    <p className="text-2xl font-bold text-green-700">
                      {reservations.filter((r) => r.status === "approved").length}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Returned</p>
                    <p className="text-2xl font-bold text-gray-700">
                      {reservations.filter((r) => r.status === "returned").length}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Rejected</p>
                    <p className="text-2xl font-bold text-red-700">
                      {reservations.filter((r) => r.status === "rejected").length}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <Button
                    onClick={() => setActiveTab("browse")}
                    variant="default"
                    className="w-full"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Browse More Books
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}