"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/auth";
import { toast } from "sonner";

export default function CreateDepartmentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !code.trim()) {
      toast.error("Department name and code are required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("departments").insert([
        {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || null,
        },
      ]);

      if (error) {
        if (error.message.includes("duplicate key")) {
          toast.error("Department code already exists");
        } else {
          toast.error(error.message);
        }
        setLoading(false);
        return;
      }

      toast.success("Department created successfully");
      router.push("/admin/users"); // or "/admin/dashboard" or "/admin/departments"
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create department";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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
            <h1 className="text-2xl font-semibold text-slate-900">
              Create Department
            </h1>
            <p className="text-sm text-slate-500">
              Define a new academic department that you can assign to students, teachers, and HODs.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Department Details
            </CardTitle>
            <CardDescription>
              Basic information used across the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Department Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Computer Science"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Department Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="CS"
                  disabled={loading}
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Short unique code used in enrollment numbers and reports (e.g. CS, EE, BBA).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description about this department."
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create Department"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
