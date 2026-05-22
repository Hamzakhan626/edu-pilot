/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  GraduationCap,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Department = {
  id: string;
  name: string;
  code: string;
};

const DEGREE_TYPES = [
  'Bachelor of Science (BS)',
  'Bachelor of Arts (BA)',
  'Bachelor of Business Administration (BBA)',
  'Bachelor of Engineering (BE)',
  'Master of Science (MS)',
  'Master of Arts (MA)',
  'Master of Business Administration (MBA)',
  'Doctor of Philosophy (PhD)',
];

const COLOR_OPTIONS = [
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Green', value: 'bg-green-500' },
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Indigo', value: 'bg-indigo-500' },
  { name: 'Teal', value: 'bg-teal-500' },
  { name: 'Cyan', value: 'bg-cyan-500' },
  { name: 'Emerald', value: 'bg-emerald-500' },
];

export default function CreateProgramPage() {
  const router = useRouter();
  
  // Data state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department_id: '',
    degree: '',
    color: 'bg-blue-500',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load departments
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('id, name, code')
          .order('name');

        if (error) {
          console.error('Failed to load departments:', error);
          setError('Failed to load departments. Please refresh the page.');
        } else {
          const deptsSafe: Department[] = (data ?? []).map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code,
          }));
          setDepartments(deptsSafe);
        }
      } catch (err: any) {
        console.error('Failed to load departments', err);
        setError('Failed to load departments. Please refresh the page.');
      } finally {
        setLoadingDepts(false);
      }
    };

    loadDepartments();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Program name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Program code is required';
    } else if (!/^[A-Z0-9-]+$/i.test(formData.code)) {
      newErrors.code = 'Program code should only contain letters, numbers, and hyphens';
    }

    if (!formData.department_id) {
      newErrors.department_id = 'Department is required';
    }

    if (!formData.degree) {
      newErrors.degree = 'Degree type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Build program data based on actual table structure
      const programData: any = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        department_id: formData.department_id,
        degree: formData.degree,
        color: formData.color,
        total_students: 0,
        total_courses: 0,
        at_risk_students: 0,
        active_semesters: [],
      };

      console.log('Attempting to insert program data:', programData);

      const { data, error: insertError } = await supabase
        .from('programs')
        .insert([programData])
        .select();

      console.log('Insert response:', { data, error: insertError });

      if (insertError) {
        console.error('Insert error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          full: insertError
        });
        throw insertError;
      }

      setSuccess(true);

      setTimeout(() => {
        router.push('/admin/programs');
      }, 2000);
    } catch (err: any) {
      console.error('Failed to create program', err);
      
      // Dynamic error message handling
      let errorMessage = 'Failed to create program. ';
      
      if (err.code === 'PGRST301' || err.code === '42501') {
        errorMessage += 'Permission denied. Please check Row Level Security (RLS) policies on the programs table.';
      } else if (err.code === '23505') {
        errorMessage += 'A program with this code already exists.';
      } else if (err.code === '23503') {
        errorMessage += 'Invalid department selected.';
      } else if (err.message) {
        errorMessage += err.message;
      } else if (err.hint) {
        errorMessage += err.hint;
      } else if (err.details) {
        errorMessage += err.details;
      } else {
        errorMessage += 'Please check your input and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while fetching departments
  if (loadingDepts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-500">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/programs')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-bold text-gray-900">Create New Program</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Shield className="h-3 w-3 mr-1" />
              Admin Only
            </Badge>
          </div>
          <p className="text-gray-500 mt-1">
            Add a new academic program to your institution
          </p>
        </div>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Program created successfully! Redirecting to programs page...
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {departments.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No departments found. Please create a department first before adding programs.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="h-5 w-5 mr-2" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Enter the fundamental details of the program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Program Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Computer Science"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">
                  Program Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="e.g., BS-CS"
                  value={formData.code}
                  onChange={handleInputChange}
                  className={errors.code ? 'border-red-500' : ''}
                />
                {errors.code && (
                  <p className="text-sm text-red-500">{errors.code}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department_id">
                  Department <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) =>
                    handleSelectChange('department_id', value)
                  }
                  disabled={departments.length === 0}
                >
                  <SelectTrigger
                    className={errors.department_id ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department_id && (
                  <p className="text-sm text-red-500">{errors.department_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="degree">
                  Degree Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.degree}
                  onValueChange={(value) => handleSelectChange('degree', value)}
                >
                  <SelectTrigger
                    className={errors.degree ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select degree type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEGREE_TYPES.map((degree) => (
                      <SelectItem key={degree} value={degree}>
                        {degree}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.degree && (
                  <p className="text-sm text-red-500">{errors.degree}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Program Color</Label>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleSelectChange('color', color.value)}
                    className={`h-10 rounded-lg ${color.value} transition-all ${
                      formData.color === color.value
                        ? 'ring-4 ring-offset-2 ring-gray-400 scale-110'
                        : 'hover:scale-105'
                    }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              See how your program will appear
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div
                  className={`w-3 h-3 rounded-full mt-1 ${formData.color}`}
                ></div>
                <div className="flex-1">
                  <p className="font-medium text-lg">
                    {formData.name || 'Program Name'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formData.code || 'PROGRAM-CODE'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {formData.degree || 'Degree Type'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      0 Students
                    </Badge>
                    <Badge variant="secondary">
                      0 Courses
                    </Badge>
                    <Badge variant="secondary">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/programs')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || departments.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Program
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}