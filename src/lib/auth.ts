/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase/client';

export type UserRole =
  | 'student'
  | 'teacher'
  | 'admin'
  | 'parent'
  | 'hr'
  | 'hod'
  | 'finance'
  | 'staff';

export interface User {
  user_metadata?: {};
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  streak?: number;
  badges?: string[];
  phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  profile_picture_url?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

let currentUser: User | null = null;

function convertDbUserToAppUser(dbUser: DatabaseUser): User {
  return {
    id: dbUser.id,
    name: dbUser.full_name,
    email: dbUser.email,
    role: dbUser.role,
    avatar: dbUser.profile_picture_url,
    streak: dbUser.role === 'student' ? 0 : undefined,
    badges: dbUser.role === 'student' ? [] : undefined,
    phone: dbUser.phone,
    date_of_birth: dbUser.date_of_birth,
    address: dbUser.address,
    city: dbUser.city,
    state: dbUser.state,
    postal_code: dbUser.postal_code,
    country: dbUser.country,
    created_at: dbUser.created_at,
    updated_at: dbUser.updated_at,
  };
}

const setAuthCookiesOptimized = (session: any, user: any): void => {
  try {
    if (typeof document === 'undefined') return;
    const oneWeek = 60 * 60 * 24 * 7;
    const userData = {
      id: user.id,
      email: user.email,
      role: (user.user_metadata?.role as UserRole | undefined) ?? 'student',
    };
    document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${oneWeek}; SameSite=Lax`;
    document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${oneWeek}; SameSite=Lax`;
    document.cookie = `currentUser=${JSON.stringify(userData)}; path=/; max-age=${oneWeek}; SameSite=Lax`;
  } catch (error) {
    console.error('Error setting auth cookies:', error);
  }
};

export const setAuthCookies = async () => {
  try {
    if (typeof document === 'undefined') return;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      setAuthCookiesOptimized(data.session, data.session.user);
    }
  } catch (error) {
    console.error('Error setting auth cookies:', error);
  }
};

export const clearAuthCookies = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'currentUser=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

// ─── backfillStudentFee ────────────────────────────────────────────────────────
// Called after student_profiles is upserted so we know the program.
// Looks up fee_structures for the program and updates the placeholder row
// that auto_create_student_fee() inserted with zeros.
const backfillStudentFee = async (
  studentId: string,
  programId: string,
): Promise<void> => {
  try {
    // Try to find a fee structure linked to this program
    const { data: feeStructure } = await supabase
      .from('fee_structures')
      .select('id, tuition_fee, hostel_fee, transport_fee, misc_fee')
      .eq('program_id', programId)
      .maybeSingle();

    const tuition   = feeStructure?.tuition_fee   ?? 0;
    const hostel    = feeStructure?.hostel_fee    ?? 0;
    const transport = feeStructure?.transport_fee ?? 0;
    const misc      = feeStructure?.misc_fee      ?? 0;
    const total     = tuition + hostel + transport + misc;

    const { error } = await supabase
      .from('student_fees')
      .update({
        fee_structure_id: feeStructure?.id ?? null,
        actual_tuition:   tuition,
        actual_hostel:    hostel,
        actual_transport: transport,
        actual_misc:      misc,
        actual_total:     total,
        payable_total:    total,
        updated_at:       new Date().toISOString(),
      })
      .eq('student_id', studentId);

    if (error) {
      console.error('backfillStudentFee error:', {
        message: error.message,
        code:    error.code,
        hint:    error.hint,
      });
    }
  } catch (err) {
    console.error('backfillStudentFee unexpected error:', err);
  }
};

// ─── createUserByAdmin ─────────────────────────────────────────────────────────
export const createUserByAdmin = async (
  name: string,
  email: string,
  password: string,
  role: UserRole,
  extras?: {
    department_id?: string;
    program_id?: string;
    semester?: number;
    enrollment_number?: string;
    admission_year?: number;
    parent_student_ids?: string[];
  },
): Promise<string> => {
  try {
    const currentUserObj = getCurrentUser();
      const allowedRoles: UserRole[] = ['admin', 'hr', 'hod'];
    if (
      !currentUserObj ||
      (!allowedRoles.includes(currentUserObj.role) &&
        currentUserObj.email !== 'admin@gmail.com')
    ) {
      throw new Error('Unauthorized: Only admin or HR can create users');
    }


    if (!name || !email || !password || !role) {
      throw new Error('Missing required fields');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const validRoles: UserRole[] = [
      'student', 'teacher', 'admin', 'parent',
      'hr', 'hod', 'finance', 'staff',
    ];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    // ── Pre-flight email check ────────────────────────────────────────────────
    const { data: existingByEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingByEmail) {
      throw new Error('Email already registered');
    }

    // ── Create auth user ──────────────────────────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role },
        emailRedirectTo: undefined,
      },
    });

    if (authError) {
      if (
        authError.message.includes('already registered') ||
        authError.message.includes('User already exists')
      ) {
        throw new Error('Email already registered');
      }
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('Failed to create authentication user');
    }

    // Build profile row for public.users
// Wait a short moment for the trigger to insert the row (if it exists)
// Then try to fetch the user from public.users
let dbUser: DatabaseUser;

// First attempt to fetch the row that the trigger should have created
const { data: fetchedUser, error: fetchErr } = await supabase
  .from('users')
  .select('*')
  .eq('id', authData.user.id)
  .single();

if (fetchErr && fetchErr.code === 'PGRST116') {
  // No row found – trigger probably doesn't exist, so we insert manually
  const profileInsert: any = {
    id: authData.user.id,
    email,
    full_name: name,
    role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (extras?.department_id) profileInsert.department_id = extras.department_id;
  if (typeof extras?.semester === 'number') profileInsert.semester = extras.semester;
  if (extras?.enrollment_number) profileInsert.enrollment_number = extras.enrollment_number;
  if (typeof extras?.admission_year === 'number') profileInsert.admission_year = extras.admission_year;

  const { data: inserted, error: insertErr } = await supabase
    .from('users')
    .insert([profileInsert])
    .select()
    .single();

  if (insertErr || !inserted) {
    console.error('Manual insert failed:', insertErr);
    await supabase.auth.admin.deleteUser(authData.user.id).catch(e => console.error(e));
    throw new Error(insertErr?.message || 'Failed to create user profile');
  }
  dbUser = inserted as DatabaseUser;
} else if (fetchErr) {
  // Some other error
  console.error('Fetch user error:', fetchErr);
  await supabase.auth.admin.deleteUser(authData.user.id).catch(e => console.error(e));
  throw new Error(fetchErr.message);
} else if (!fetchedUser) {
  // Should not happen because .single() returns data or error
  throw new Error('User not found after auth creation');
} else {
  // Row already exists (trigger worked)
  dbUser = fetchedUser as DatabaseUser;

  // Update any extra fields that the trigger might have missed
  const updateData: any = {};
  if (extras?.department_id) updateData.department_id = extras.department_id;
  if (typeof extras?.semester === 'number') updateData.semester = extras.semester;
  if (extras?.enrollment_number) updateData.enrollment_number = extras.enrollment_number;
  if (typeof extras?.admission_year === 'number') updateData.admission_year = extras.admission_year;

  if (Object.keys(updateData).length > 0) {
    const { error: updateErr } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', dbUser.id);
    if (updateErr) console.error('Failed to update extra fields:', updateErr);
  }
}

    // ── student_profiles + fee backfill ───────────────────────────────────────
    if (role === 'student' && extras?.program_id) {
      const { error: spError } = await supabase
        .from('student_profiles')
        .upsert(
          { student_id: dbUser.id, program_id: extras.program_id },
          { onConflict: 'student_id' },
        );

      if (spError) {
        console.error('student_profiles upsert error:', {
          message: spError.message,
          code:    spError.code,
          hint:    spError.hint,
        });
      } else {
        // Now that we know the program, backfill the fee row with real amounts
        await backfillStudentFee(dbUser.id, extras.program_id);
      }
    }

    // ── Parent ↔ students relation ────────────────────────────────────────────
    if (role === 'parent' && extras?.parent_student_ids?.length) {
      const rows = extras.parent_student_ids.map((studentId) => ({
        parent_id:  dbUser.id,
        student_id: studentId,
      }));

      const { error: relError } = await supabase
        .from('parent_students')
        .insert(rows);

      if (relError) {
        console.error('Failed to link parent to students:', relError);
      }
    }

    return dbUser.id;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An error occurred during user creation';
    throw new Error(message);
  }
};

// ─── login ────────────────────────────────────────────────────────────────────
export const login = async (
  email: string,
  password: string,
): Promise<User | null> => {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      throw new Error('Invalid email or password');
    }

    if (!authData.user || !authData.session) {
      throw new Error('Login failed');
    }

    setAuthCookiesOptimized(authData.session, authData.user);

    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !dbUser) {
      await supabase.auth.signOut();
      throw new Error('User profile not found');
    }

    const appUser = convertDbUserToAppUser(dbUser as DatabaseUser);
    currentUser = appUser;

    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          localStorage.setItem('currentUser', JSON.stringify(appUser));
        });
      } else {
        setTimeout(() => {
          localStorage.setItem('currentUser', JSON.stringify(appUser));
        }, 0);
      }
    }

    return appUser;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    throw new Error(message);
  }
};

// ─── getCurrentUser ───────────────────────────────────────────────────────────
export const getCurrentUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        currentUser = JSON.parse(stored) as User;
      } catch {
        currentUser = null;
      }
    }
  }
  return currentUser;
};

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
};

// ─── logout ───────────────────────────────────────────────────────────────────
export const logout = async () => {
  try {
    await supabase.auth.signOut();
    currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
    }
    clearAuthCookies();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    throw new Error(message);
  }
};

// ─── getUserProfile ───────────────────────────────────────────────────────────
export const getUserProfile = async (userId: string): Promise<User> => {
  try {
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !dbUser) {
      throw new Error(error?.message || 'User not found');
    }

    return convertDbUserToAppUser(dbUser as DatabaseUser);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch user profile';
    throw new Error(message);
  }
};

// ─── updateUserProfile ────────────────────────────────────────────────────────
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>,
): Promise<User> => {
  try {
    const updateData: Record<string, any> = {};

    if (updates.name)          updateData.full_name           = updates.name;
    if (updates.avatar)        updateData.profile_picture_url = updates.avatar;
    if (updates.phone)         updateData.phone               = updates.phone;
    if (updates.date_of_birth) updateData.date_of_birth       = updates.date_of_birth;
    if (updates.address)       updateData.address             = updates.address;
    if (updates.city)          updateData.city                = updates.city;
    if (updates.state)         updateData.state               = updates.state;
    if (updates.postal_code)   updateData.postal_code         = updates.postal_code;
    if (updates.country)       updateData.country             = updates.country;

    const { data: dbUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error || !dbUser) {
      throw new Error(error?.message || 'Failed to update profile');
    }

    const appUser = convertDbUserToAppUser(dbUser as DatabaseUser);
    currentUser = appUser;
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(appUser));
    }

    return appUser;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update profile';
    throw new Error(message);
  }
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

// ─── getAllUsers ──────────────────────────────────────────────────────────────
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const currentUserObj = getCurrentUser();
    if (
      !currentUserObj ||
      (currentUserObj.role !== 'admin' &&
        currentUserObj.email !== 'admin@gmail.com')
    ) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { data: dbUsers, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (dbUsers as DatabaseUser[]).map(convertDbUserToAppUser);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch users';
    throw new Error(message);
  }
};

// ─── deleteUser ───────────────────────────────────────────────────────────────
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const currentUserObj = getCurrentUser();
    if (
      !currentUserObj ||
      (currentUserObj.role !== 'admin' &&
        currentUserObj.email !== 'admin@gmail.com')
    ) {
      throw new Error('Unauthorized: Admin access required');
    }

    if (userId === currentUserObj.id) {
      throw new Error('Cannot delete your own account');
    }

    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) throw new Error(dbError.message);

    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch {
      // ignore — auth user may already be gone
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete user';
    throw new Error(message);
  }
};

// ─── initializeAuth ───────────────────────────────────────────────────────────
export const initializeAuth = async () => {
  if (typeof window === 'undefined') return;

  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      if (dbUser) {
        const appUser = convertDbUserToAppUser(dbUser as DatabaseUser);
        currentUser = appUser;
        localStorage.setItem('currentUser', JSON.stringify(appUser));
        setAuthCookiesOptimized(data.session, data.session.user);
      }
    }
  } catch (error) {
    console.error('Auth initialization error:', error);
  }
};

// ─── refreshAuth ─────────────────────────────────────────────────────────────
export const refreshAuth = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;

    if (data.session) {
      setAuthCookiesOptimized(data.session, data.session.user);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Auth refresh error:', error);
    return false;
  }
};

export { supabase };