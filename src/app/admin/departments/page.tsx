/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/auth';
import { toast } from 'sonner';
import {
  Building2,
  Loader2,
  Plus,
  Search,
  Edit,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type Department = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
};

export default function DepartmentsPage() {
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code, description, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepartments((data || []) as Department[]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDepartments();
  }, []);

  const handleSaveDepartment = async () => {
    try {
      setSubmitting(true);

      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update({
            name: deptForm.name,
            code: deptForm.code,
            description: deptForm.description || null,
          })
          .eq('id', editingDept.id);

        if (error) throw error;
        toast.success('Department updated successfully');
      } else {
        const { error } = await supabase.from('departments').insert({
          name: deptForm.name,
          code: deptForm.code,
          description: deptForm.description || null,
        });

        if (error) throw error;
        toast.success('Department created successfully');
      }

      setShowDeptDialog(false);
      setDeptForm({ name: '', code: '', description: '' });
      setEditingDept(null);
      void loadDepartments();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (
      !confirm(
        'Are you sure? This will delete all programs and courses in this department.',
      )
    )
      return;

    try {
      const { error } = await supabase.from('departments').delete().eq('id', id);

      if (error) throw error;
      toast.success('Department deleted successfully');
      void loadDepartments();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete department');
    }
  };

  const openEditDepartment = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
    });
    setShowDeptDialog(true);
  };

  const openCreateDepartment = () => {
    setEditingDept(null);
    setDeptForm({ name: '', code: '', description: '' });
    setShowDeptDialog(true);
  };

  const filtered = departments.filter((d) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-purple-600" />
            Departments
          </h1>
          <p className="text-sm text-slate-500">
            Manage academic departments across EduPilot.
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          onClick={openCreateDepartment}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Department
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold">
                Department List
              </CardTitle>
              <CardDescription>
                Click on any department to view details, programs, and courses.
              </CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or code..."
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading departments...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <p className="font-medium mb-1">No departments found</p>
              <p className="text-sm">
                Try a different search term or create a new department.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase tracking-wide text-xs">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase tracking-wide text-xs">
                      Code
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase tracking-wide text-xs">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase tracking-wide text-xs">
                      Created
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500 uppercase tracking-wide text-xs">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => router.push(`/admin/departments/${d.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {d.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {d.code}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {d.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(d.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDepartment(d)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void handleDeleteDepartment(d.id)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Dialog */}
      <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDept ? 'Edit Department' : 'New Department'}
            </DialogTitle>
            <DialogDescription>
              {editingDept
                ? 'Update department information'
                : 'Create a new department'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={deptForm.name}
                onChange={(e) =>
                  setDeptForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Computer Science"
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={deptForm.code}
                onChange={(e) =>
                  setDeptForm((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="CS"
                disabled={!!editingDept}
              />
              {editingDept && (
                <p className="text-xs text-slate-500 mt-1">
                  Code cannot be changed as it's used in URLs
                </p>
              )}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={deptForm.description}
                onChange={(e) =>
                  setDeptForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Department description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeptDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveDepartment} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
