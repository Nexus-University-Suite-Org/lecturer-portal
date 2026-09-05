import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Ban,
  BookOpen,
  CheckCircle2,
  Clock,
  Users,
  Loader2,
  AlertCircle,
  RotateCw,
  GraduationCap,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { getBackend, postBackend, putBackend } from "@/lib/backendApi";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface EnrollmentRow {
  id: string;
  status: "pending" | "approved" | "rejected" | "completed";
  enrolled_at: string;
  course_id: string;
  student_id: string;
  paper_type: string;
  course?: {
    id: string;
    title: string;
    code: string;
    credits: number;
    semester: string | null;
    year: number | null;
  };
  student?: {
    id: string;
    full_name: string | null;
    email: string | null;
    registration_number: string | null;
    student_number: string | null;
  };
}

const buildGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const todayLabel = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function LecturerEnrollments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);

  useEffect(() => {
    if (user) fetchEnrollments();
  }, [user]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      if (!user?.uid) return;

      // Get lecturer's profile to get assigned_course_units
      const profiles = await getBackend<any[]>("/api/profiles/?role=lecturer");
      const lecturerProfile = profiles.find(
        (p: any) => p.email === user.email,
      );
      const assignedCourseUnits: string[] =
        lecturerProfile?.assigned_course_units || [];

      if (assignedCourseUnits.length === 0) {
        setEnrollments([]);
        return;
      }

      // Fetch course units
      const courseUnitsData = await getBackend<any[]>("/api/course-units/");
      const courseMap = new Map<string, EnrollmentRow["course"]>();
      courseUnitsData.forEach((cu: any) => {
        if (assignedCourseUnits.includes(cu.id) || assignedCourseUnits.includes(cu.course_id)) {
          courseMap.set(cu.id || cu.course_id, {
            id: cu.id || cu.course_id,
            title: cu.name || cu.course_unit_name || "Unknown Course",
            code: cu.code || cu.course_unit_code || "Unknown",
            credits: cu.credits || 3,
            semester: cu.semester || null,
            year: cu.year || null,
          });
        }
      });

      const courseIds = Array.from(courseMap.keys());

      if (courseIds.length === 0) {
        setEnrollments([]);
        return;
      }

      // Fetch enrollments by course_ids
      const enrollmentData = await getBackend<any[]>(
        `/api/enrollments/?courseIds=${encodeURIComponent(courseIds.join(","))}`,
      );

      const studentIds = Array.from(
        new Set(enrollmentData.map((e: any) => e.student_id).filter(Boolean)),
      );

      // Fetch student profiles
      const allProfiles = await getBackend<any[]>("/api/profiles/");
      const profileMap = new Map<string, EnrollmentRow["student"]>();
      allProfiles.forEach((p: any) => {
        if (studentIds.includes(p.id)) {
          profileMap.set(p.id, {
            id: p.id,
            full_name: p.full_name || null,
            email: p.email || null,
            registration_number: p.registration_number || null,
            student_number: p.student_number || null,
          });
        }
      });

      const enriched = enrollmentData.map((row: any) => ({
        ...row,
        course: courseMap.get(row.course_id),
        student: profileMap.get(row.student_id) || undefined,
      }));

      setEnrollments(enriched);
    } catch (error: any) {
      console.error("Error fetching enrollments", error);
      toast({
        title: "Error loading enrollments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: EnrollmentRow["status"]) => {
    const target = enrollments.find((e) => e.id === id);
    if (!target) return;

    setUpdatingId(id);
    try {
      await putBackend(
        `/api/enrollments/${id}/status`,
        {
          status,
          lecturerId: Number(user!.uid),
        },
        true,
      );

      setEnrollments((prev) =>
        prev.map((enrollment) =>
          enrollment.id === id ? { ...enrollment, status } : enrollment,
        ),
      );

      toast({
        title:
          status === "approved" ? "Enrollment approved" : "Enrollment rejected",
        description:
          status === "approved"
            ? "Student can now access course materials"
            : "Student has been rejected for this course",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const pending = useMemo(
    () => enrollments.filter((e) => e.status === "pending"),
    [enrollments],
  );
  const approved = useMemo(
    () => enrollments.filter((e) => e.status === "approved"),
    [enrollments],
  );
  const rejected = useMemo(
    () => enrollments.filter((e) => e.status === "rejected"),
    [enrollments],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-lavender/10 blur-3xl" />
      </div>

      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-5">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <section className="relative overflow-hidden rounded-3xl hero-gradient text-white p-5 sm:p-8 shadow-2xl">
            <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium uppercase tracking-widest text-white/70">
                    Enrollment Approvals
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-4xl text-white leading-tight">
                  {buildGreeting()}, {user?.email?.split("@")[0] || "Lecturer"}
                </h1>
                <p className="max-w-md text-xs sm:text-sm text-white/80 leading-relaxed">
                  Review and approve students registering for your courses.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] sm:text-xs text-white">
                    <Calendar className="h-3 w-3" />
                    {todayLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] sm:text-xs text-white">
                    <Users className="h-3 w-3" />
                    {enrollments.length} total requests
                  </span>
                  {pending.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-amber px-3 py-1 text-[11px] sm:text-xs font-semibold text-navy shadow-glow">
                      <Clock className="h-3 w-3 text-navy" />
                      {pending.length} need review
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
                <Button
                  variant="outline"
                  onClick={fetchEnrollments}
                  disabled={loading}
                  className="gap-2 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white w-full lg:w-auto"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-5">
            {[
              {
                label: "Pending",
                value: pending.length,
                icon: Clock,
                top: "bg-gradient-amber",
                chip: "bg-amber/15 text-amber-dark",
                hint: "awaiting your decision",
                hintIcon: Clock,
              },
              {
                label: "Approved",
                value: approved.length,
                icon: CheckCircle2,
                top: "bg-gradient-to-r from-emerald to-teal-light",
                chip: "bg-emerald/15 text-emerald",
                hint: "can access materials",
                hintIcon: BadgeCheck,
              },
              {
                label: "Rejected",
                value: rejected.length,
                icon: Ban,
                top: "bg-gradient-to-r from-red-500 to-coral",
                chip: "bg-red-500/15 text-red-600",
                hint: "not admitted",
                hintIcon: Ban,
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden border-border/60 bg-gradient-to-b from-card/90 to-card/60 backdrop-blur-lg">
                  <CardContent className="pt-0">
                    <div className={`h-1 w-full ${stat.top}`} />
                    <div className="flex items-center justify-between gap-2 pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {stat.label}
                        </p>
                        <p className="text-lg sm:text-2xl font-bold text-foreground">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`rounded-lg p-1.5 ${stat.chip}`}>
                        <stat.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                      <stat.hintIcon className="h-3 w-3" />
                      {stat.hint}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Pending Approvals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-lg">
            <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-teal" />
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-dark" />
                  Pending Approvals
                </span>
                <Badge variant="outline" className="bg-amber/15 text-amber-dark border-amber/40">
                  {pending.length} pending
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 animate-pulse" />
                    <Loader2 className="h-5 w-5 text-primary absolute inset-0 m-auto animate-spin" />
                  </div>
                  Loading enrollments...
                </div>
              ) : pending.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald/10">
                    <BadgeCheck className="h-8 w-8 text-emerald" />
                  </div>
                  <p className="font-semibold text-foreground">
                    All caught up!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No pending enrollments right now.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map((enrollment, idx) => {
                    const studentName =
                      enrollment.student?.full_name ||
                      enrollment.student?.email ||
                      "Student";
                    const initials =
                      studentName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "?";
                    const paperType =
                      enrollment.paper_type || "normal";
                    const paperColor =
                      paperType === "retake"
                        ? "bg-coral/15 text-coral border-0"
                        : paperType === "missed"
                          ? "bg-amber/15 text-amber-dark border-0"
                          : paperType === "supplementary"
                            ? "bg-purple-500/15 text-purple-600 border-0"
                            : "bg-blue-500/15 text-blue-600 border-0";
                    return (
                      <motion.div
                        key={enrollment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="rounded-2xl border border-border/60 bg-card/80 hover:shadow-lg hover:border-primary/20 transition-all p-4 sm:p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center flex-shrink-0 shadow-md text-sm font-semibold">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate text-sm sm:text-base">
                                {studentName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                Reg:{" "}
                                {enrollment.student?.registration_number ||
                                  "—"}{" "}
                                · ID:{" "}
                                {enrollment.student?.student_number || "—"}
                              </p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="h-3 w-3" />
                                Enrolled{" "}
                                {new Date(
                                  enrollment.enrolled_at,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="lg:shrink-0 lg:w-64 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <Badge
                                variant="outline"
                                className="font-mono text-[11px] sm:text-xs border-border/60"
                              >
                                {enrollment.course?.code || "Course"}
                              </Badge>
                              <Badge className="bg-accent/15 text-accent text-[11px] sm:text-xs border-0">
                                {enrollment.course?.credits ?? 0} credits
                              </Badge>
                              <Badge className={`text-[11px] sm:text-xs ${paperColor}`}>
                                {paperType.charAt(0).toUpperCase() +
                                  paperType.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold truncate">
                              {enrollment.course?.title || "Course Title"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {enrollment.course?.semester || "Semester"} •{" "}
                              {enrollment.course?.year || "Year"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              className="bg-gradient-success text-white gap-2 hover:shadow-glow"
                              disabled={updatingId === enrollment.id}
                              onClick={() =>
                                updateStatus(enrollment.id, "approved")
                              }
                            >
                              {updatingId === enrollment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <BadgeCheck className="h-4 w-4" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                              disabled={updatingId === enrollment.id}
                              onClick={() =>
                                updateStatus(enrollment.id, "rejected")
                              }
                            >
                              {updatingId === enrollment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                              Reject
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <LecturerBottomNav />
    </div>
  );
}
