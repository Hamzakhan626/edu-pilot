/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/semesters/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  ArrowLeft,
  CalendarRange,
  Loader2,
  AlertCircle,
  Shield,
  Save,
} from 'lucide-react';

import { supabase } from '@/lib/supabase/client';

type Program = {
  id: string;
  name: string;
  code: string;
};

type SemesterFormData = {
  name: string;
  semester_type: string;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  program_id: string;
};

const SEMESTER_TYPES = ['Fall', 'Spring', 'Summer', 'Winter'];
const STATUSES = ['upcoming', 'active', 'completed'];

export default function SemesterEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [formData, setFormData] = useState<SemesterFormData>({
    name: '',
    semester_type: '',
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    status: 'upcoming',
    program_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const semesterId = params?.id;

  // Auth + admin guard
  useEffect(() => {
    const checkAuthAndRole = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace('/login');
          return;
        }

        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', session.user.id)
          .single();

        if (userError || !userProfile) {
          setError('User profile not found. Please contact administrator.');
          return;
        }

        if (userProfile.role !== 'admin') {
          setError('Access denied: Only administrators can edit semesters.');
          return;
        }
      } catch (err: any) {
        console.error('Auth check error:', err);
        setError('Failed to verify your session. Please log in again.');
      } finally {
        setAuthChecking(false);
      }
    };

    void checkAuthAndRole();
  }, [router]);

  // Load programs and semester data
  useEffect(() => {
    if (authChecking || error || !semesterId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load programs
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select('id, name, code')
          .order('name');

        if (programsError) {
          console.error('Failed to load programs:', programsError);
          setError('Failed to load programs. Please try again.');
          return;
        }

        setPrograms(programsData || []);

        // Load semester data
        const { data: semesterData, error: semesterError } = await supabase
          .from('semesters')
          .select(
            `
            id,
            name,
            semester_type,
            year,
            start_date,
            end_date,
            status,
            program_id
          `,
          )
          .eq('id', semesterId)
          .single();

        if (semesterError) {
          console.error('Failed to load semester:', semesterError);
          setError('Failed to load semester details.');
          return;
        }

        if (!semesterData) {
          setError('Semester not found.');
          return;
        }

        setFormData({
          name: semesterData.name || '',
          semester_type: semesterData.semester_type || '',
          year: semesterData.year || new Date().getFullYear(),
          start_date: semesterData.start_date || '',
          end_date: semesterData.end_date || '',
          status: semesterData.status || 'upcoming',
          program_id: semesterData.program_id || '',
        });
      } catch (err: any) {
        console.error('Load data error:', err);
        setError('Failed to load data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [authChecking, error, semesterId]);

  const handleInputChange = (field: keyof SemesterFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Semester name is required.');
      return false;
    }
    if (!formData.semester_type) {
      setError('Semester type is required.');
      return false;
    }
    if (!formData.year || formData.year < 2000 || formData.year > 2100) {
      setError('Please enter a valid year.');
      return false;
    }
    if (!formData.start_date) {
      setError('Start date is required.');
      return false;
    }
    if (!formData.end_date) {
      setError('End date is required.');
      return false;
    }
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setError('End date must be after start date.');
      return false;
    }
    if (!formData.program_id) {
      setError('Program is required.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('semesters')
        .update({
          name: formData.name.trim(),
          semester_type: formData.semester_type,
          year: formData.year,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: formData.status,
          program_id: formData.program_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', semesterId);

      if (updateError) {
        console.error('Update semester error:', updateError);
        setError(updateError.message || 'Failed to update semester.');
        return;
      }

      // Navigate back to detail page
      router.push(`/admin/semesters/${semesterId}`);
    } catch (err: any) {
      console.error('Save semester error:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (authChecking || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-500">
            {authChecking ? 'Checking permissions...' : 'Loading semester...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/admin/semesters/${semesterId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Edit Semester</h1>
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              <Shield className="h-3 w-3 mr-1" />
              Admin Only
            </Badge>
          </div>
          <p className="text-gray-500 mt-1">
            Update semester information and settings
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Semester Information
          </CardTitle>
          <CardDescription>
            Update the details for this academic semester
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Semester Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Semester Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Fall 2024"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          {/* Program */}
          <div className="space-y-2">
            <Label htmlFor="program">Program *</Label>
            <Select
              value={formData.program_id}
              onValueChange={(val) => handleInputChange('program_id', val)}
            >
              <SelectTrigger id="program">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((prog) => (
                  <SelectItem key={prog.id} value={prog.id}>
                    {prog.name} ({prog.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Semester Type & Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="semester_type">Semester Type *</Label>
              <Select
                value={formData.semester_type}
                onValueChange={(val) => handleInputChange('semester_type', val)}
              >
                <SelectTrigger id="semester_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Academic Year *</Label>
              <Input
                id="year"
                type="number"
                min="2000"
                max="2100"
                value={formData.year}
                onChange={(e) =>
                  handleInputChange('year', parseInt(e.target.value) || 0)
                }
              />
            </div>
          </div>

          {/* Start & End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(val) => handleInputChange('status', val)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/semesters/${semesterId}`)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}