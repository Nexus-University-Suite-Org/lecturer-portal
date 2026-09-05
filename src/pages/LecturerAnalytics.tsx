import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  Users,
  BookOpen,
  Trophy,
  Award,
  Calendar,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getBackend } from "@/lib/backendApi";

interface CourseAnalytics {
  id: string;
  name: string;
  enrollment: number;
  avgGPA: number;
  attendanceRate: number;
  assignmentCompletion: number;
  trend: "up" | "down" | "stable";
}

interface StudentInsight {
  name: string;
  status: "excellent" | "good" | "warning" | "at-risk";
  score: number;
  attendance: number;
  trend: "up" | "down";
}

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

const buildGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const todayLabel = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
});

export default function LecturerAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<CourseAnalytics[]>([]);
  const [insights, setInsights] = useState<StudentInsight[]>([]);
  const [timeRange, setTimeRange] = useState("semester");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, timeRange]);

  const handleViewCourseDetails = (courseId: string) => {
    // Navigate to gradebook with the specific course pre-selected
    navigate(`/lecturer/gradebook?course=${courseId}`);
  };

  const calculateTrend = (
    avgGPA: number,
    attendanceRate: number,
    assignmentCompletion: number,
  ): "up" | "down" | "stable" => {
    // Simple trend calculation based on performance metrics
    const performanceScore =
      (avgGPA / 4) * 0.4 +
      (attendanceRate / 100) * 0.3 +
      (assignmentCompletion / 100) * 0.3;

    if (performanceScore >= 0.8) return "up";
    if (performanceScore <= 0.5) return "down";
    return "stable";
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch lecturer's courses
      const courses = await fetchLecturerCourses();

      // Fetch analytics for each course
      const courseAnalytics = await Promise.all(
        courses.map(async (course) => {
          const enrollmentCount = await fetchEnrollmentCount(course.id);
          const avgGPA = await fetchAverageGPA(course.id);
          const attendanceRate = await fetchAttendanceRate(course.id);
          const assignmentCompletion = await fetchAssignmentCompletion(
            course.id,
          );

          return {
            id: course.id,
            name: `${course.code} - ${course.title}`,
            enrollment: enrollmentCount,
            avgGPA: avgGPA,
            attendanceRate: attendanceRate,
            assignmentCompletion: assignmentCompletion,
            trend: calculateTrend(avgGPA, attendanceRate, assignmentCompletion),
          };
        }),
      );

      setAnalytics(courseAnalytics);

      // Fetch student insights
      const studentInsights = await fetchStudentInsights(courses);
      setInsights(studentInsights);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLecturerCourses = async () => {
    if (!user?.uid) return [];

    try {
      const profiles = await getBackend<any[]>("/api/profiles/?role=lecturer");
      const lecturerProfile = profiles.find(
        (p: any) => p.email === user.email,
      );
      const assignedCourseUnits: string[] =
        lecturerProfile?.assigned_course_units || [];

      if (assignedCourseUnits.length === 0) return [];

      const courseUnitsData = await getBackend<any[]>("/api/course-units/");
      const courses: any[] = [];
      courseUnitsData.forEach((cu: any) => {
        if (assignedCourseUnits.includes(cu.id) || assignedCourseUnits.includes(cu.course_id)) {
          courses.push({
            id: cu.id || cu.course_id,
            code: cu.code || cu.course_unit_code || "Unknown",
            title: cu.name || cu.course_unit_name || "Unknown Course",
          });
        }
      });

      return courses;
    } catch (error) {
      console.error("Error fetching lecturer courses:", error);
      return [];
    }
  };

  const fetchEnrollmentCount = async (courseId: string): Promise<number> => {
    try {
      const enrollments = await getBackend<any[]>("/api/enrollments/");
      return enrollments.filter(
        (e: any) => e.course_id === courseId && e.status === "approved",
      ).length;
    } catch (error) {
      console.error("Error fetching enrollment count:", error);
      return 0;
    }
  };

  const fetchAverageGPA = async (courseId: string): Promise<number> => {
    try {
      const grades = await getBackend<any[]>("/api/student-grades/");
      const courseGrades = grades.filter(
        (g: any) => g.course_id === courseId && g.gp != null,
      );

      if (courseGrades.length === 0) return 0;

      const gpas = courseGrades.map((g: any) => g.gp);
      const avgGPA = gpas.reduce((sum: number, gp: number) => sum + gp, 0) / gpas.length;
      return Math.round(avgGPA * 100) / 100;
    } catch (error) {
      console.error("Error fetching average GPA:", error);
      return 0;
    }
  };

  const fetchAttendanceRate = async (courseId: string): Promise<number> => {
    // No backend attendance endpoint available; returns 0
    return 0;
  };

  const fetchAssignmentCompletion = async (
    courseId: string,
  ): Promise<number> => {
    try {
      const grades = await getBackend<any[]>("/api/student-grades/");
      const courseGrades = grades.filter(
        (g: any) => g.course_id === courseId,
      );

      if (courseGrades.length === 0) return 0;

      const totalAssignments = courseGrades.length * 2;
      const completedAssignments = courseGrades.reduce(
        (sum: number, g: any) =>
          sum + (g.assignment1 != null ? 1 : 0) + (g.assignment2 != null ? 1 : 0),
        0,
      );

      return Math.round((completedAssignments / totalAssignments) * 100);
    } catch (error) {
      console.error("Error fetching assignment completion:", error);
      return 0;
    }
  };

  const fetchStudentInsights = async (
    courses: any[],
  ): Promise<StudentInsight[]> => {
    try {
      const allInsights: StudentInsight[] = [];

      const allEnrollments = await getBackend<any[]>("/api/enrollments/");
      const allProfiles = await getBackend<any[]>("/api/profiles/");
      const allGrades = await getBackend<any[]>("/api/student-grades/");

      const profileMap = new Map<string, any>();
      allProfiles.forEach((p: any) => profileMap.set(p.id, p));

      for (const course of courses) {
        const approvedEnrollments = allEnrollments.filter(
          (e: any) => e.course_id === course.id && e.status === "approved",
        );

        for (const enrollment of approvedEnrollments) {
          const studentId = enrollment.student_id;
          const profileData = profileMap.get(studentId);
          if (!profileData) continue;

          const studentGrade = allGrades.find(
            (g: any) =>
              g.course_id === course.id && g.student_id === studentId,
          );

          const score = studentGrade?.total || 0;
          const attendance = 0; // No backend attendance endpoint

          let status: "excellent" | "good" | "warning" | "at-risk";
          if (score >= 85) status = "excellent";
          else if (score >= 70) status = "good";
          else if (score >= 60) status = "warning";
          else status = "at-risk";

          const existingIndex = allInsights.findIndex(
            (insight) => insight.name === profileData.full_name,
          );
          if (existingIndex === -1) {
            allInsights.push({
              name: profileData.full_name || "Unknown Student",
              status,
              score,
              attendance,
              trend: score >= 70 ? "up" : "down",
            });
          }
        }
      }

      const atRiskStudents = allInsights.filter(
        (student) => student.status === "at-risk",
      );
      const otherStudents = allInsights.filter(
        (student) => student.status !== "at-risk",
      );

      const sortedAtRisk = atRiskStudents.sort((a, b) => a.score - b.score);
      const sortedOthers = otherStudents.sort((a, b) => b.score - a.score);

      const prioritizedInsights = [
        ...sortedAtRisk.slice(0, 4),
        ...sortedOthers.slice(0, 4),
      ];

      return prioritizedInsights.slice(0, 8);
    } catch (error) {
      console.error("Error fetching student insights:", error);
      return [];
    }
  };

  const overallStats =
    analytics.length > 0
      ? {
          avgEnrollment: Math.round(
            analytics.reduce((acc, a) => acc + (a.enrollment || 0), 0) /
              analytics.length || 0,
          ),
          avgGPA: (
            analytics.reduce((acc, a) => acc + (a.avgGPA || 0), 0) /
              analytics.length || 0
          ).toFixed(2),
          avgAttendance: Math.round(
            analytics.reduce((acc, a) => acc + (a.attendanceRate || 0), 0) /
              analytics.length || 0,
          ),
          atRiskStudents: insights.filter((s) => s.status === "at-risk").length,
        }
      : {
          avgEnrollment: 0,
          avgGPA: "0.00",
          avgAttendance: 0,
          atRiskStudents: 0,
        };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-emerald/15 text-emerald border-emerald/40";
      case "good":
        return "bg-blue-500/15 text-blue-600 border-blue-500/30";
      case "warning":
        return "bg-amber/15 text-amber-dark border-amber/40";
      case "at-risk":
        return "bg-red-500/15 text-red-600 border-red-500/30";
      default:
        return "bg-muted/60 text-muted-foreground border-border/60";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-lavender/10 blur-3xl" />
      </div>
      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="relative overflow-hidden rounded-3xl hero-gradient p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-teal/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <BarChart3 className="h-3.5 w-3.5" />
                Analytics & Insights
              </span>
              <h1 className="mt-4 text-3xl font-display font-bold text-white sm:text-4xl">
                {buildGreeting()}, {user?.email?.split("@")[0] || "Lecturer"}
              </h1>
              <p className="mt-1.5 text-sm font-medium text-white/80">
                Track performance across your courses
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm">
                  <Calendar className="h-3.5 w-3.5" />
                  {todayLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm">
                  <BookOpen className="h-3.5 w-3.5" />
                  {analytics.length} courses
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber px-3 py-1.5 text-navy">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {overallStats.atRiskStudents} at risk
                </span>
                <div className="ml-auto flex items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur-sm">
                  {["week", "month", "semester"].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`rounded-full px-3 py-1 font-semibold capitalize transition-all ${
                        timeRange === range
                          ? "bg-white/20 text-white"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Key Metrics */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Avg Enrollment",
                value: loading ? "..." : overallStats.avgEnrollment,
                accent: "from-primary to-secondary",
                iconBg: "bg-primary/10 text-primary",
                Icon: Users,
              },
              {
                label: "Class Avg GPA",
                value: loading ? "..." : overallStats.avgGPA,
                accent: "from-teal to-emerald",
                iconBg: "bg-emerald/15 text-emerald",
                Icon: Award,
              },
              {
                label: "Avg Attendance",
                value: loading
                  ? "..."
                  : `${overallStats.avgAttendance}%`,
                accent: "from-blue-500 to-blue-600",
                iconBg: "bg-blue-500/15 text-blue-600",
                Icon: TrendingUp,
              },
              {
                label: "At-Risk Students",
                value: loading ? "..." : overallStats.atRiskStudents,
                accent: "from-red-500 to-orange-500",
                iconBg: "bg-red-500/15 text-red-600",
                Icon: AlertCircle,
              },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
              >
                <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-lg">
                  <div className={`h-1 bg-gradient-to-r ${s.accent}`} />
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {s.label}
                        </p>
                        <p className="mt-1 text-3xl font-bold text-foreground">
                          {s.value}
                        </p>
                      </div>
                      <div className={`rounded-xl p-2.5 ${s.iconBg}`}>
                        <s.Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Course Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-border/60 bg-card/70 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Course Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <BarChart3 className="h-6 w-6 animate-pulse text-primary" />
                  </div>
                  <p className="text-sm font-medium">
                    Loading course analytics...
                  </p>
                </div>
              ) : analytics.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">
                    No courses assigned yet.
                  </p>
                </div>
              ) : (
                analytics.map((course, i) => (
                  <motion.div
                    key={course.name}
                    variants={rise}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    className="rounded-lg border border-border/60 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {course.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {course.enrollment} students
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          course.trend === "up"
                            ? "bg-emerald/15 text-emerald border-emerald/40"
                            : course.trend === "down"
                              ? "bg-red-500/15 text-red-600 border-red-500/30"
                              : "bg-amber/15 text-amber-dark border-amber/40"
                        }
                      >
                        {course.trend === "up"
                          ? "↑"
                          : course.trend === "down"
                            ? "↓"
                            : "→"}{" "}
                        {course.trend}
                      </Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Avg GPA</span>
                          <span className="font-semibold">
                            {course.avgGPA.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(course.avgGPA / 4) * 100}%` }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">
                            Attendance
                          </span>
                          <span className="font-semibold">
                            {course.attendanceRate}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${course.attendanceRate}%` }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="h-full bg-gradient-to-r from-teal to-emerald"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">
                            Assignment Completion
                          </span>
                          <span className="font-semibold">
                            {course.assignmentCompletion}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${course.assignmentCompletion}%`,
                            }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="h-full bg-gradient-to-r from-primary to-secondary"
                          />
                        </div>
                      </div>

                      <div className="flex items-end gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                          onClick={() => handleViewCourseDetails(course.id)}
                        >
                          <BarChart3 className="h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Student Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-border/60 bg-card/70 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Student Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Users className="h-6 w-6 animate-pulse text-primary" />
                  </div>
                  <p className="text-sm font-medium">
                    Loading student insights...
                  </p>
                </div>
              ) : insights.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">
                    No student data available.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((student, i) => (
                    <motion.div
                      key={student.name}
                      variants={rise}
                      initial="hidden"
                      animate="visible"
                      custom={i}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">
                            {student.name}
                          </p>
                          {student.status === "at-risk" && (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Score: {student.score}%
                          </span>
                          <span className="text-muted-foreground">
                            Attendance: {student.attendance}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(student.status)}>
                          {student.status.charAt(0).toUpperCase() +
                            student.status.slice(1)}
                        </Badge>
                        {student.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-emerald" />
                        ) : (
                          <motion.div
                            animate={{ y: [0, 2, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <TrendingUp className="h-4 w-4 text-red-600 transform rotate-180" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="border-amber/40 bg-amber/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-dark">
                <Award className="h-5 w-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3 p-3 rounded-lg bg-muted/40">
                <AlertCircle className="h-5 w-5 text-amber-dark flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Follow up with at-risk students
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Consider reaching out to Mike Johnson who is at risk. Offer
                    additional support.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/40">
                <Trophy className="h-5 w-5 text-emerald flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Recognize top performers
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Alex Brown and Emma Davis are excelling. Consider them for
                    peer mentoring roles.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/40">
                <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    CS101 showing positive trend
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your CS101 course is performing well with upward trajectory.
                    Keep the momentum!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <LecturerBottomNav />
    </div>
  );
}
