// lib/supabase/types.ts
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string | null;
          full_name: string;
          role: 'student' | 'teacher' | 'admin' | 'parent' | 'hr' | 'hod' | 'finance' | 'staff';
          phone: string | null;
          profile_picture_url: string | null;
          date_of_birth: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string | null;
          created_at: string | null;
          updated_at: string | null;
          department_id: string | null;
          semester: number | null;
          enrollment_number: string | null;
          admission_year: number | null;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      departments: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          hod_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['departments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['departments']['Insert']>;
      };
      programs: {
        Row: {
          id: string;
          department_id: string | null;
          name: string;
          code: string;
          degree: string | null;
          total_students: number | null;
          total_courses: number | null;
          avg_attendance: number | null;
          avg_performance: number | null;
          at_risk_students: number | null;
          fee_compliance: number | null;
          color: string | null;
          active_semesters: string[] | null;
        };
        Insert: Omit<Database['public']['Tables']['programs']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['programs']['Insert']>;
      };
      courses: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          department_id: string;
          credits: number;
          semester: number;
          created_at: string | null;
          updated_at: string | null;
          program_id: string | null;
          semester_id: string | null;
          instructor: string | null;
          students: number | null;
          section: string | null;
          teacher_id: string | null;
          slug: string | null;
        };
        Insert: Omit<Database['public']['Tables']['courses']['Row'], 'id' | 'created_at' | 'updated_at' | 'slug'>;
        Update: Partial<Database['public']['Tables']['courses']['Insert']>;
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          enrollment_date: string | null;
          grade: string | null;
          status: 'active' | 'completed' | 'dropped' | 'withdrawn';
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['enrollments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['enrollments']['Insert']>;
      };
      attendance: {
        Row: {
          id: string;
          student_id: string;
          class_id: string;
          attendance_date: string;
          status: 'present' | 'absent' | 'late' | 'excused';
          notes: string | null;
          created_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['attendance']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['attendance']['Insert']>;
      };
    };
  };
}