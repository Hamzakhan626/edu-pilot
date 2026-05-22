import { supabase } from "./client";

export type TeacherDashboardStats = {
  totalStudents: number;
  totalClasses: number;
  totalAssignments: number;
  pendingGrading: number;
  departmentStudents: number;
  departmentTeachers: number;
};

export type DepartmentInfo = {
  id: string;
  name: string;
  code: string;
  description: string;
  head: string | null;
};

export type EnrollmentData = {
  month: string;
  students: number;
};

export type ClassPerformance = {
  className: string;
  studentCount: number;
  color: string;
};

export type Activity = {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
};

// Helper function to get teacher's department ID
async function getTeacherDepartmentId(
  teacherId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("department_id")
    .eq("id", teacherId)
    .single();

  if (error) {
    console.error("Error fetching teacher department:", error);
    return null;
  }

  return data?.department_id || null;
}

// Get teacher's department information
export async function getTeacherDepartmentInfo(
  teacherId: string
): Promise<DepartmentInfo | null> {
  try {
    const departmentId = await getTeacherDepartmentId(teacherId);
    if (!departmentId) return null;

    const { data, error } = await supabase
      .from("departments")
      .select("id, name, code, description, head")
      .eq("id", departmentId)
      .single();

    if (error) {
      console.error("Error fetching department info:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getTeacherDepartmentInfo:", error);
    return null;
  }
}

// Get dashboard statistics for teacher
export async function getTeacherDashboardStats(
  teacherId: string,
  departmentOnly: boolean
): Promise<TeacherDashboardStats> {
  try {
    const departmentId = departmentOnly
      ? await getTeacherDepartmentId(teacherId)
      : null;

    // Get total students (teacher's classes or department)
    let studentsQuery = supabase
      .from("enrollments")
      .select("student_id", { count: "exact", head: true });

    if (departmentOnly && departmentId) {
      // Get students enrolled in classes from the teacher's department
      const { data: deptClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("department_id", departmentId);

      const classIds = deptClasses?.map((c) => c.id) || [];
      studentsQuery = studentsQuery.in("class_id", classIds);
    } else {
      // Get students from teacher's classes
      const { data: teacherClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("teacher_id", teacherId);

      const classIds = teacherClasses?.map((c) => c.id) || [];
      studentsQuery = studentsQuery.in("class_id", classIds);
    }

    const { count: totalStudents } = await studentsQuery;

    // Get department students count
    let departmentStudents = 0;
    if (departmentId) {
      const { data: deptClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("department_id", departmentId);

      const deptClassIds = deptClasses?.map((c) => c.id) || [];

      const { count } = await supabase
        .from("enrollments")
        .select("student_id", { count: "exact", head: true })
        .in("class_id", deptClassIds);

      departmentStudents = count || 0;
    }

    // Get total classes
    let classesQuery = supabase
      .from("classes")
      .select("id", { count: "exact", head: true });

    if (departmentOnly && departmentId) {
      classesQuery = classesQuery.eq("department_id", departmentId);
    } else {
      classesQuery = classesQuery.eq("teacher_id", teacherId);
    }

    const { count: totalClasses } = await classesQuery;

    // Get total assignments
    let assignmentsQuery = supabase
      .from("assignments")
      .select("id", { count: "exact", head: true });

    if (departmentOnly && departmentId) {
      const { data: deptClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("department_id", departmentId);

      const classIds = deptClasses?.map((c) => c.id) || [];
      assignmentsQuery = assignmentsQuery.in("class_id", classIds);
    } else {
      assignmentsQuery = assignmentsQuery.eq("teacher_id", teacherId);
    }

    const { count: totalAssignments } = await assignmentsQuery;

    // Get pending grading count
    let pendingQuery = supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .is("grade", null)
      .eq("status", "submitted");

    if (departmentOnly && departmentId) {
      const { data: deptClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("department_id", departmentId);

      const classIds = deptClasses?.map((c) => c.id) || [];

      const { data: deptAssignments } = await supabase
        .from("assignments")
        .select("id")
        .in("class_id", classIds);

      const assignmentIds = deptAssignments?.map((a) => a.id) || [];
      pendingQuery = pendingQuery.in("assignment_id", assignmentIds);
    } else {
      const { data: teacherAssignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("teacher_id", teacherId);

      const assignmentIds = teacherAssignments?.map((a) => a.id) || [];
      pendingQuery = pendingQuery.in("assignment_id", assignmentIds);
    }

    const { count: pendingGrading } = await pendingQuery;

    // Get department teachers count
    let departmentTeachers = 0;
    if (departmentId) {
      const { count } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("department_id", departmentId)
        .eq("role", "teacher");

      departmentTeachers = count || 0;
    }

    return {
      totalStudents: totalStudents || 0,
      totalClasses: totalClasses || 0,
      totalAssignments: totalAssignments || 0,
      pendingGrading: pendingGrading || 0,
      departmentStudents,
      departmentTeachers,
    };
  } catch (error) {
    console.error("Error fetching teacher dashboard stats:", error);
    return {
      totalStudents: 0,
      totalClasses: 0,
      totalAssignments: 0,
      pendingGrading: 0,
      departmentStudents: 0,
      departmentTeachers: 0,
    };
  }
}

// Get enrollment trend for teacher's classes or department
export async function getTeacherEnrollmentTrend(
  teacherId: string,
  departmentOnly: boolean
): Promise<EnrollmentData[]> {
  try {
    const departmentId = departmentOnly
      ? await getTeacherDepartmentId(teacherId)
      : null;

    // Get class IDs based on filter
    let classIds: string[] = [];

    if (departmentOnly && departmentId) {
      const { data: deptClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("department_id", departmentId);

      classIds = deptClasses?.map((c) => c.id) || [];
    } else {
      const { data: teacherClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("teacher_id", teacherId);

      classIds = teacherClasses?.map((c) => c.id) || [];
    }

    if (classIds.length === 0) {
      return [];
    }

    // Get enrollments for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("enrolled_at")
      .in("class_id", classIds)
      .gte("enrolled_at", sixMonthsAgo.toISOString())
      .order("enrolled_at", { ascending: true });

    if (error) {
      console.error("Error fetching enrollment trend:", error);
      return [];
    }

    // Group by month and calculate cumulative count
    const monthlyData: { [key: string]: number } = {};
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    let cumulativeCount = 0;
    enrollments?.forEach((enrollment) => {
      const date = new Date(enrollment.enrolled_at);
      const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    // Convert to array format with cumulative counts
    const result: EnrollmentData[] = [];
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    sortedMonths.forEach((month) => {
      cumulativeCount += monthlyData[month];
      result.push({
        month,
        students: cumulativeCount,
      });
    });

    return result;
  } catch (error) {
    console.error("Error in getTeacherEnrollmentTrend:", error);
    return [];
  }
}

// Get class performance/distribution
export async function getTeacherClassPerformance(
  teacherId: string,
  departmentOnly: boolean
): Promise<ClassPerformance[]> {
  try {
    const departmentId = departmentOnly
      ? await getTeacherDepartmentId(teacherId)
      : null;

    // Get classes based on filter
    let classesQuery = supabase.from("classes").select("id, name, code");

    if (departmentOnly && departmentId) {
      classesQuery = classesQuery.eq("department_id", departmentId);
    } else {
      classesQuery = classesQuery.eq("teacher_id", teacherId);
    }

    const { data: classes, error } = await classesQuery;

    if (error) {
      console.error("Error fetching classes:", error);
      return [];
    }

    if (!classes || classes.length === 0) {
      return [];
    }

    // Get enrollment count for each class
    const classPerformance: ClassPerformance[] = [];
    const colors = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#14B8A6",
      "#F97316",
    ];

    for (let i = 0; i < classes.length; i++) {
      const classItem = classes[i];
      const { count } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("class_id", classItem.id);

      classPerformance.push({
        className: `${classItem.code || classItem.name}`,
        studentCount: count || 0,
        color: colors[i % colors.length],
      });
    }

    return classPerformance.filter((c) => c.studentCount > 0);
  } catch (error) {
    console.error("Error in getTeacherClassPerformance:", error);
    return [];
  }
}

// Get recent activities
export async function getTeacherRecentActivities(
  teacherId: string,
  departmentOnly: boolean,
  limit: number = 10
): Promise<Activity[]> {
  try {
    const departmentId = departmentOnly
      ? await getTeacherDepartmentId(teacherId)
      : null;

    // Get activities from multiple sources
    const activities: Activity[] = [];

    // Recent assignments
    let assignmentsQuery = supabase
      .from("assignments")
      .select("id, title, created_at, class_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (departmentOnly && departmentId) {
      const { data: deptClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("department_id", departmentId);

      const classIds = deptClasses?.map((c) => c.id) || [];
      assignmentsQuery = assignmentsQuery.in("class_id", classIds);
    } else {
      assignmentsQuery = assignmentsQuery.eq("teacher_id", teacherId);
    }

    const { data: assignments } = await assignmentsQuery;

    assignments?.forEach((assignment) => {
      activities.push({
        id: assignment.id,
        type: "assignment",
        title: "New Assignment Created",
        description: assignment.title,
        created_at: assignment.created_at,
      });
    });

    // Recent submissions
    if (!departmentOnly) {
      const { data: teacherAssignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("teacher_id", teacherId);

      const assignmentIds = teacherAssignments?.map((a) => a.id) || [];

      const { data: submissions } = await supabase
        .from("submissions")
        .select("id, assignment_id, student_id, created_at, status")
        .in("assignment_id", assignmentIds)
        .order("created_at", { ascending: false })
        .limit(limit);

      submissions?.forEach((submission) => {
        activities.push({
          id: submission.id,
          type: "grade",
          title: "New Submission",
          description: `Student submitted assignment`,
          created_at: submission.created_at,
        });
      });
    }

    // Recent enrollments
    let enrollmentsQuery = supabase
      .from("enrollments")
      .select("id, enrolled_at, student_id, class_id")
      .order("enrolled_at", { ascending: false })
      .limit(limit);

    if (departmentOnly && departmentId) {
      const { data: deptClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("department_id", departmentId);

      const classIds = deptClasses?.map((c) => c.id) || [];
      enrollmentsQuery = enrollmentsQuery.in("class_id", classIds);
    } else {
      const { data: teacherClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("teacher_id", teacherId);

      const classIds = teacherClasses?.map((c) => c.id) || [];
      enrollmentsQuery = enrollmentsQuery.in("class_id", classIds);
    }

    const { data: enrollments } = await enrollmentsQuery;

    enrollments?.forEach((enrollment) => {
      activities.push({
        id: enrollment.id,
        type: "student",
        title: "New Student Enrollment",
        description: "Student enrolled in class",
        created_at: enrollment.enrolled_at,
      });
    });

    // Sort all activities by date and limit
    return activities
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
  } catch (error) {
    console.error("Error in getTeacherRecentActivities:", error);
    return [];
  }
}