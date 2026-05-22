/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Plus, Trash2, Edit, BookOpen, Search, Filter, Download } from "lucide-react"
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
  created_by?: string
  created_at?: string
  updated_at?: string
}

interface FormData {
  title: string
  author: string
  isbn: string
  category: string
  shelf_location: string
  total_copies: string
  available_copies: string
  status: BookStatus
  published_year: string
  language: string
  description: string
}

export default function AdminLibrary() {
  const [books, setBooks] = useState<LibraryBook[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<"all" | BookStatus>("all")
  const [selectedCategory, setSelectedCategory] = useState<"all" | string>("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null)
  const [formData, setFormData] = useState<FormData>({
    title: "",
    author: "",
    isbn: "",
    category: "",
    shelf_location: "",
    total_copies: "1",
    available_copies: "1",
    status: "available",
    published_year: "",
    language: "",
    description: "",
  })

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { data, error } = await supabase
          .from("library_books")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Supabase fetch books error:", error)
          throw error
        }

        setBooks(data || [])
      } catch (err) {
        console.error("Error loading books:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchBooks()
  }, [])

  const resetForm = () => {
    setFormData({
      title: "",
      author: "",
      isbn: "",
      category: "",
      shelf_location: "",
      total_copies: "1",
      available_copies: "1",
      status: "available",
      published_year: "",
      language: "",
      description: "",
    })
  }

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!formData.title.trim()) {
        alert("Title is required")
        return
      }

      if (!formData.author.trim()) {
        alert("Author is required")
        return
      }

      const totalCopies = Number.parseInt(formData.total_copies || "0")
      const availableCopies = Number.parseInt(formData.available_copies || formData.total_copies || "0")

      if (Number.isNaN(totalCopies) || totalCopies <= 0) {
        alert("Total copies must be a positive number")
        return
      }

      if (availableCopies < 0 || availableCopies > totalCopies) {
        alert("Available copies must be between 0 and total copies")
        return
      }

      const newBook = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        isbn: formData.isbn.trim() || null,
        category: formData.category.trim() || null,
        shelf_location: formData.shelf_location.trim() || null,
        total_copies: totalCopies,
        available_copies: availableCopies,
        status: formData.status,
        published_year: formData.published_year ? Number.parseInt(formData.published_year) : null,
        language: formData.language.trim() || null,
        description: formData.description.trim() || null,
        created_by: user?.id || null,
      }

      const { data, error } = await supabase
        .from("library_books")
        .insert([newBook])
        .select()

      if (error) {
        console.error("Supabase insert book error:", error)
        throw error
      }

      setBooks((prev) => (data ? [...data, ...prev] : prev))
      resetForm()
      setShowAddModal(false)
    } catch (err: any) {
      console.error("Error adding book:", err)
      alert(`Failed to add book: ${err.message || "Unknown error"}`)
    }
  }

  const handleEditBook = (book: LibraryBook) => {
    setEditingBook(book)
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn || "",
      category: book.category || "",
      shelf_location: book.shelf_location || "",
      total_copies: book.total_copies.toString(),
      available_copies: book.available_copies.toString(),
      status: book.status,
      published_year: book.published_year?.toString() || "",
      language: book.language || "",
      description: book.description || "",
    })
    setShowEditModal(true)
  }

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBook) return

    try {
      const totalCopies = Number.parseInt(formData.total_copies || "0")
      const availableCopies = Number.parseInt(formData.available_copies || formData.total_copies || "0")

      if (Number.isNaN(totalCopies) || totalCopies <= 0) {
        alert("Total copies must be a positive number")
        return
      }

      if (availableCopies < 0 || availableCopies > totalCopies) {
        alert("Available copies must be between 0 and total copies")
        return
      }

      const updatedBook = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        isbn: formData.isbn.trim() || null,
        category: formData.category.trim() || null,
        shelf_location: formData.shelf_location.trim() || null,
        total_copies: totalCopies,
        available_copies: availableCopies,
        status: formData.status,
        published_year: formData.published_year ? Number.parseInt(formData.published_year) : null,
        language: formData.language.trim() || null,
        description: formData.description.trim() || null,
      }

      const { error } = await supabase
        .from("library_books")
        .update(updatedBook)
        .eq("id", editingBook.id)

      if (error) {
        console.error("Supabase update book error:", error)
        throw error
      }

      const { data } = await supabase
        .from("library_books")
        .select("*")
        .order("created_at", { ascending: false })

      setBooks(data || [])
      setShowEditModal(false)
      setEditingBook(null)
    } catch (err: any) {
      console.error("Error updating book:", err)
      alert(`Failed to update book: ${err.message || "Unknown error"}`)
    }
  }

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm("Are you sure you want to delete this book from the catalog?")) return

    try {
      const { error } = await supabase
        .from("library_books")
        .delete()
        .eq("id", bookId)

      if (error) {
        console.error("Supabase delete book error:", error)
        throw error
      }

      setBooks((prev) => prev.filter((b) => b.id !== bookId))
    } catch (err: any) {
      console.error("Error deleting book:", err)
      alert(`Failed to delete book: ${err.message || "Unknown error"}`)
    }
  }

  const handleExportBooks = async () => {
    try {
      const { data } = await supabase
        .from("library_books")
        .select("*")
        .order("created_at", { ascending: false })

      if (!data) return

      const csvContent = [
        [
          "ID",
          "Title",
          "Author",
          "ISBN",
          "Category",
          "Shelf Location",
          "Total Copies",
          "Available Copies",
          "Status",
          "Published Year",
          "Language",
          "Description",
        ].join(","),
        ...data.map((b) =>
          [
            b.id,
            `"${b.title.replace(/"/g, '""')}"`,
            `"${b.author.replace(/"/g, '""')}"`,
            b.isbn || "",
            `"${(b.category || "").replace(/"/g, '""')}"`,
            `"${(b.shelf_location || "").replace(/"/g, '""')}"`,
            b.total_copies,
            b.available_copies,
            b.status,
            b.published_year || "",
            `"${(b.language || "").replace(/"/g, '""')}"`,
            `"${(b.description || "").replace(/"/g, '""')}"`,
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `library-books-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error("Error exporting books:", err)
      alert(`Failed to export books: ${err.message || "Unknown error"}`)
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
  const statusCounts: Record<BookStatus, number> = {
    available: books.filter((b) => b.status === "available").length,
    borrowed: books.filter((b) => b.status === "borrowed").length,
    reserved: books.filter((b) => b.status === "reserved").length,
    archived: books.filter((b) => b.status === "archived").length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600">Loading library management...</p>
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Library Management</h1>
              <p className="text-gray-600">Manage university library catalog and availability</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleExportBooks}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Catalog
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Book
              </Button>
            </div>
          </div>
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Search */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by title, author, ISBN"
                />
              </div>
            </CardContent>
          </Card>

          {/* Status filter */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as "all" | BookStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
                <option value="reserved">Reserved</option>
                <option value="archived">Archived</option>
              </select>
            </CardContent>
          </Card>

          {/* Category filter */}
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
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedStatus("all")
                    setSelectedCategory("all")
                  }}
                  className="flex-1"
                >
                  Clear Filters
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

        {/* Main content: stats + list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Books list */}
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
                Manage all books in the university library
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredBooks.length === 0 ? (
                <p className="text-gray-600 text-sm">No books found for current filters.</p>
              ) : (
                filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    className="border-l-4 border-blue-500 pl-4 py-3 group hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleEditBook(book)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-gray-900 hover:text-blue-600">
                            {book.title}
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {book.status}
                          </Badge>
                          {book.category && (
                            <Badge variant="outline" className="text-xs">
                              {book.category}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
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
                            <span className="font-medium">Copies:</span>
                            <span>
                              {book.available_copies}/{book.total_copies} available
                            </span>
                            {book.shelf_location && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="font-medium">Shelf:</span>
                                <span>{book.shelf_location}</span>
                              </>
                            )}
                            {book.published_year && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="font-medium">Year:</span>
                                <span>{book.published_year}</span>
                              </>
                            )}
                            {book.language && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="font-medium">Language:</span>
                                <span>{book.language}</span>
                              </>
                            )}
                          </div>
                          {book.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {book.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleEditBook(book)}
                          className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Edit book"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete book"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Admin stats */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <BookOpen className="w-5 h-5" />
                Library Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">Total Books</p>
                  <p className="text-2xl font-bold text-gray-900">{books.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    All books in the catalog
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Available</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statusCounts.available}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Borrowed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statusCounts.borrowed}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Reserved</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statusCounts.reserved}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Archived</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statusCounts.archived}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-3">Quick Actions</p>
                <div className="space-y-2">
                  <Button
                    onClick={() => setShowAddModal(true)}
                    variant="default"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Book
                  </Button>
                  <Button
                    onClick={handleExportBooks}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Catalog
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Book Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add New Book</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Add a book to the university library catalog
                </p>
              </div>
              <div className="p-6">
                <form onSubmit={handleAddBook} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Book title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Author *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.author}
                        onChange={(e) =>
                          setFormData({ ...formData, author: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Author name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        ISBN
                      </label>
                      <input
                        type="text"
                        value={formData.isbn}
                        onChange={(e) =>
                          setFormData({ ...formData, isbn: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ISBN number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Computer Science"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Shelf Location
                      </label>
                      <input
                        type="text"
                        value={formData.shelf_location}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shelf_location: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., A-3-12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Total Copies *
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formData.total_copies}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            total_copies: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Available Copies
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.available_copies}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            available_copies: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as BookStatus,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="available">Available</option>
                        <option value="borrowed">Borrowed</option>
                        <option value="reserved">Reserved</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Published Year
                      </label>
                      <input
                        type="number"
                        value={formData.published_year}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            published_year: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 2020"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Language
                      </label>
                      <input
                        type="text"
                        value={formData.language}
                        onChange={(e) =>
                          setFormData({ ...formData, language: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., English"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Short description of the book"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setShowAddModal(false)
                        resetForm()
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Add Book
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Book Modal */}
        {showEditModal && editingBook && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Edit Book</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Update library book details
                </p>
              </div>
              <div className="p-6">
                <form onSubmit={handleUpdateBook} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Author *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.author}
                        onChange={(e) =>
                          setFormData({ ...formData, author: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        ISBN
                      </label>
                      <input
                        type="text"
                        value={formData.isbn}
                        onChange={(e) =>
                          setFormData({ ...formData, isbn: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Shelf Location
                      </label>
                      <input
                        type="text"
                        value={formData.shelf_location}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shelf_location: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Total Copies *
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formData.total_copies}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            total_copies: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Available Copies
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.available_copies}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            available_copies: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as BookStatus,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="available">Available</option>
                        <option value="borrowed">Borrowed</option>
                        <option value="reserved">Reserved</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Published Year
                      </label>
                      <input
                        type="number"
                        value={formData.published_year}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            published_year: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Language
                      </label>
                      <input
                        type="text"
                        value={formData.language}
                        onChange={(e) =>
                          setFormData({ ...formData, language: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setShowEditModal(false)
                        setEditingBook(null)
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (editingBook) {
                          handleDeleteBook(editingBook.id)
                          setShowEditModal(false)
                          setEditingBook(null)
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Update Book
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
