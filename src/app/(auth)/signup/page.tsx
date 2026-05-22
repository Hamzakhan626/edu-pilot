/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { createUserByAdmin, UserRole } from '@/lib/auth';
import { toast } from 'sonner';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (data: { 
    name: string; 
    email: string; 
    password: string; 
    confirmPassword: string;
    role: UserRole;
  }) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const user = await createUserByAdmin(data.name, data.email, data.password, data.role);
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthForm type="signup" onSubmit={handleSignup} loading={loading} />
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}