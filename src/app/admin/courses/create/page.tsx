/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/auth";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ArrowLeft,
  BookOpen,
  Building2,
  GraduationCap,
  Calendar,
  Loader2,
  Hash,
} from "lucide-react";

type Department = {
  id: string;
  name: string;
  code: string;
};

type Program = {
  id: string;
  name: string;
  code: string;
  department_id: string;
};

type Course = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  department_id: string;
  program_id: string | null;
  credits: number;
  semester: number;
  section: string | null;
  instructor: string | null;
};

type CourseFormState = {
  name: string;
  code: string;
  description: string;
  department_id: string;
  program_id: string;
  credits: string;
  semester: string;
  section: string;
  instructor: string;
};

const defaultState: CourseFormState = {
  name: "",
  code: "",
  description: "",
  department_id: "",
  program_id: "",
  credits: "3",
  semester: "1",
  section: "",
  instructor: "",
};

function AdminCreateCourseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [formData, setFormData] = useState<CourseFormState>(defaultState);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const isEditing = Boolean(editId);

  const filteredPrograms = useMemo(() => {
    if (!formData.department_id) return [];
    return programs.filter((p) => p.department_id === formData.department_id);
  }, [programs, formData.department_id]);

  const loadLookups = async () => {
    try {
      setLookupsLoading(true);
      const [deptRes, programRes] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name, code")
          .order("name", { ascending: true }),
        supabase
          .from("programs")
          .select("id, name, code, department_id")
          .order("name", { ascending: true }),
      ]);

      if (deptRes.error) throw deptRes.error;
      if (programRes.error) throw programRes.error;

      setDepartments((deptRes.data || []) as Department[]);
      setPrograms((programRes.data || []) as Program[]);
    } catch (err: any) {
      console.error("Lookup load error:", err);
      toast.error(err?.message || "Failed to load reference data");
    } finally {
      setLookupsLoading(false);
    }
  };

  const loadCourseIfEditing = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("courses")
        .select(
          `
          id,
          name,
          code,
          description,
          department_id,
          program_id,
          credits,
          semester,
          section,
          instructor
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error("Course not found");
        router.push("/admin/courses");
        return;
      }

      const course = data as Course;
      setEditingCourse(course);
      setFormData({
        name: course.name,
        code: course.code,
        description: course.description || "",
        department_id: course.department_id,
        program_id: course.program_id || "",
        credits: String(course.credits),
        semester: String(course.semester),
        section: course.section || "",
        instructor: course.instructor || "",
      });
    } catch (err: any) {
      console.error("Course load error:", err);
      toast.error(err?.message || "Failed to load course");
      router.push("/admin/courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLookups();
  }, []);

  useEffect(() => {
    if (editId) {
      void loadCourseIfEditing(editId);
    }
  }, [editId]);

  const handleChange =
    <K extends keyof CourseFormState>(field: K) =>
    (value: CourseFormState[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    if (!formData.department_id) {
      toast.error("Department is required");
      return;
    }

    const sem = Number(formData.semester);
    if (!sem || sem < 1 || sem > 8) {
      toast.error("Semester must be between 1 and 8");
      return;
    }

    const credits = Number(formData.credits) || 3;

    try {
      setLoading(true);

      const payload: any = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim() || null,
        department_id: formData.department_id,
        program_id: formData.program_id || null,
        credits,
        semester: sem,
        section: formData.section.trim() || null,
        instructor: formData.instructor.trim() || null,
      };

      if (isEditing && editingCourse) {
        const { error } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", editingCourse.id);

        if (error) throw error;
        toast.success("Course updated successfully");
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
        toast.success("Course created successfully");
      }

      router.push("/admin/courses");
    } catch (err: any) {
      console.error("Save course error:", err);
      toast.error(err?.message || "Failed to save course");
    } finally {
      setLoading(false);
    }
  };

  if (lookupsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
          </div>
          <p className="text-gray-600 font-medium">Loading course data...</p>
          <p className="text-sm text-gray-400 mt-1">Preparing form</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-purple-600" />
                {isEditing ? "Edit Course" : "Create New Course"}
              </h1>
              <p className="text-sm text-slate-500">
                {isEditing
                  ? "Update course information and associations."
                  : "Fill the form to create a new course in the system."}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
        >
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Core identity for this course.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-xs font-medium text-slate-700 mb-1">
                      Course Name
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name")(e.target.value)}
                      placeholder="Data Structures"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label className="block text-xs font-medium text-slate-700 mb-1">
                      Course Code
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="code"
                      value={formData.code}
                      onChange={(e) => handleChange("code")(e.target.value)}
                      placeholder="CS-201"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div>
                  <Label className="block text-xs font-medium text-slate-700 mb-1">
                    Description
                  </Label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleChange("description")(e.target.value)
                    }
                    placeholder="Short description of what this course covers..."
                    rows={3}
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Academic placement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Academic Placement
                </CardTitle>
                <CardDescription>
                  Connect the course to a department and program.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-xs font-medium text-slate-700 mb-1">
                      Department
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.department_id}
                      onValueChange={(val) => {
                        handleChange("department_id")(val);
                        handleChange("program_id")("");
                      }}
                      disabled={loading || lookupsLoading}
                    >
                      <SelectTrigger className="w-full bg-white border border-slate-200">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="block text-xs font-medium text-slate-700 mb-1">
                      Program (optional)
                    </Label>
                    <Select
                      value={formData.program_id || "none"}
                      onValueChange={(val) =>
                        handleChange("program_id")(val === "none" ? "" : val)
                      }
                      disabled={
                        loading || lookupsLoading || !formData.department_id
                      }
                    >
                      <SelectTrigger className="w-full bg-white border border-slate-200">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No program</SelectItem>
                        {filteredPrograms.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="block text-xs font-medium text-slate-700 mb-1">
                      Semester
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="semester"
                      type="number"
                      min={1}
                      max={8}
                      value={formData.semester}
                      onChange={(e) => handleChange("semester")(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label className="block text-xs font-medium text-slate-700 mb-1">
                      Credits
                    </Label>
                    <Input
                      name="credits"
                      type="number"
                      min={1}
                      max={10}
                      value={formData.credits}
                      onChange={(e) => handleChange("credits")(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Defaults to 3 if left empty.
                    </p>
                  </div>
                  <div>
                    <Label className="block text-xs font-medium text-slate-700 mb-1">
                      Section (optional)
                    </Label>
                    <Input
                      name="section"
                      value={formData.section}
                      onChange={(e) => handleChange("section")(e.target.value)}
                      placeholder="A, B, C..."
                      disabled={loading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right summary panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  Course Summary
                </CardTitle>
                <CardDescription className="text-xs">
                  Quick overview of how this course will appear in the system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Hash className="h-3 w-3 text-slate-400" />
                  <span className="font-medium text-slate-900">
                    {formData.code || "CS-201"}
                  </span>
                  <span className="mx-1 text-slate-400">•</span>
                  <span>{formData.name || "New Course"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-slate-400" />
                    {formData.department_id
                      ? departments.find((d) => d.id === formData.department_id)
                          ?.name || "Selected department"
                      : "No department selected"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <GraduationCap className="h-3 w-3 text-slate-400" />
                    {formData.program_id
                      ? programs.find((p) => p.id === formData.program_id)
                          ?.name || "Selected program"
                      : "No program linked"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    Semester {formData.semester || "1"} •{" "}
                    {formData.credits || "3"} credits
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-4 flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : isEditing ? (
                    "Save Changes"
                  ) : (
                    "Create Course"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/admin/courses")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <p className="text-[11px] text-slate-500 text-center">
                  Courses are linked to departments and programs, so they appear
                  automatically in department and program views.
                </p>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function AdminCreateCoursePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
          </div>
          <p className="text-gray-600 font-medium">Loading course data...</p>
          <p className="text-sm text-gray-400 mt-1">Preparing form</p>
        </div>
      </div>
    }>
      <AdminCreateCourseContent />
    </Suspense>
  );
}