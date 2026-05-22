/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  ArrowLeft,
  Users,
  Search,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
} from "lucide-react";

// Types
interface Faculty {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  employee_id: string | null;
  department_id: string | null;
  created_at?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function HoDFacultyPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    employee_id: "",
  });

  // Delete target
  const [deleteTarget, setDeleteTarget] = useState<Faculty | null>(null);

  // Auth & department
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
    setUser(currentUser);

    supabase
      .from("departments")
      .select("id, name, code")
      .eq("hod_id", currentUser.id)
      .maybeSingle()
      .then(({ data: dept, error }) => {
        if (error || !dept) {
          toast.error("No department assigned to your HoD account.");
          router.push("/hod/programs");
          return;
        }
        setDepartment(dept);
        setAuthLoading(false);
      });
  }, []);

  // Load faculty
  useEffect(() => {
    if (department) {
      loadFaculty();
    }
  }, [department]);

  const loadFaculty = async () => {
    if (!department) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone, employee_id, department_id, created_at")
        .eq("role", "teacher")
        .eq("department_id", department.id)
        .order("full_name", { ascending: true });

      if (error) throw error;
      setFacultyList(data || []);
    } catch (err: any) {
      toast.error("Failed to load faculty members.");
    } finally {
      setLoading(false);
    }
  };

  const filteredFaculty = facultyList.filter(
    (f) =>
      f.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEditModal = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    setEditForm({
      full_name: faculty.full_name || "",
      email: faculty.email,
      phone: faculty.phone || "",
      employee_id: faculty.employee_id || "",
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!department || !user || !editingFaculty) return;

    if (!editForm.full_name.trim() || !editForm.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim().toLowerCase(),
        phone: editForm.phone.trim() || null,
        employee_id: editForm.employee_id.trim() || null,
      };

      const { error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", editingFaculty.id);

      if (error) {
        // Handle unique constraint violations
        if (error.code === "23505") {
          if (error.message.includes("users_email_key")) {
            toast.error("A user with this email already exists.");
          } else if (error.message.includes("users_employee_id_key")) {
            toast.error("A user with this employee ID already exists.");
          } else {
            toast.error("Duplicate value – please check email and employee ID.");
          }
        } else {
          throw error;
        }
        return;
      }

      toast.success("Faculty updated successfully.");
      setEditModalOpen(false);
      loadFaculty();
    } catch (err: any) {
      toast.error(err.message || "Failed to update faculty.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Faculty removed.");
      setDeleteTarget(null);
      loadFaculty();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete faculty.");
    }
  };

  if (authLoading || !department) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/hod/programs")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Programs
          </Button>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Faculty Management
              </h1>
              <p className="text-gray-600">
                View and manage faculty members in {department.name} ({department.code})
              </p>
            </div>
            {/* Add Faculty button removed intentionally */}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Faculty List */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="h-5 w-5" />
              Faculty Members
              <Badge variant="secondary" className="ml-2">
                {filteredFaculty.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Teachers currently assigned to your department
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredFaculty.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchQuery
                    ? "No faculty match your search."
                    : "No faculty members in your department yet."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFaculty.map((faculty) => (
                    <TableRow key={faculty.id}>
                      <TableCell className="font-medium">
                        {faculty.full_name || "—"}
                      </TableCell>
                      <TableCell>{faculty.email}</TableCell>
                      <TableCell>{faculty.phone || "—"}</TableCell>
                      <TableCell>{faculty.employee_id || "—"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(faculty)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(faculty)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Faculty</DialogTitle>
            <DialogDescription>
              Update the faculty member’s details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, full_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="employee_id">Employee ID</Label>
              <Input
                id="employee_id"
                value={editForm.employee_id}
                onChange={(e) =>
                  setEditForm({ ...editForm, employee_id: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Faculty</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}