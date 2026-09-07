import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  GraduationCap,
  Search,
  Filter,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, putBackend, postBackend } from "@/lib/backendApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { useToast } from "@/components/ui/use-toast";

interface CourseUnit {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: string;
  year: string;
  course: number;
}

interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  status: string;
  paper_type: string;
  enrolled_at: string;
}

interface StudentProfile {
  id: string;
  full_name: string;
  email: string;
  registration_number: string;
  student_number: string;
}

interface CourseWithStudents {
  course: CourseUnit;
  enrollments: (Enrollment & { student?: StudentProfile })[];
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

export default function LecturerCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courseUnits, setCourseUnits] = useState<CourseUnit[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<
    Record<string, StudentProfile>
  >({});
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSemester, setFilterSemester] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const profiles = await getBackend<any[]>(
        "/api/profiles/?role=lecturer",
        true,
      );
      const lecturerProfile = profiles?.find(
        (p: any) =>
          String(p.id) === String(user!.uid) ||
          String(p.email)?.toLowerCase() === String(user!.email)?.toLowerCase(),
      );
      const assignedIds: string[] =
        lecturerProfile?.assigned_course_units?.map(String) || [];

      const allCourseUnits = await getBackend<CourseUnit[]>(
        "/api/course-units/",
        true,
      );
      const myCourses = (allCourseUnits || []).filter((cu) =>
        assignedIds.includes(String(cu.id)),
      );
      setCourseUnits(myCourses);

      if (assignedIds.length > 0) {
        const enrollmentData = await getBackend<Enrollment[]>(
          `/api/enrollments/?courseIds=${assignedIds.join(",")}`,
          true,
        );
        setEnrollments(enrollmentData || []);

        const uniqueStudentIds = [
          ...new Set((enrollmentData || []).map((e) => String(e.student_id))),
        ];
        if (uniqueStudentIds.length > 0) {
          const allProfiles = await getBackend<any[]>(
            "/api/profiles/",
            true,
          );
          const profileMap: Record<string, StudentProfile> = {};
          (allProfiles || []).forEach((p: any) => {
            const uid = String(p.id);
            if (uniqueStudentIds.includes(uid)) {
              profileMap[uid] = {
                id: uid,
                full_name: p.full_name || "Unknown",
                email: p.email || "",
                registration_number: p.registration_number || "",
                student_number: p.student_number || "",
              };
            }
          });
          setStudentProfiles(profileMap);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error loading courses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const courseData = useMemo<CourseWithStudents[]>(() => {
    return courseUnits.map((course) => {
      const courseEnrollments = enrollments
        .filter((e) => String(e.course_id) === String(course.id))
        .map((e) => ({
          ...e,
          student: studentProfiles[String(e.student_id)],
        }));
      return { course, enrollments: courseEnrollments };
    });
  }, [courseUnits, enrollments, studentProfiles]);

  const filteredCourses = useMemo(() => {
    return courseData.filter(({ course }) => {
      const matchesSearch =
        !searchQuery ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSemester =
        filterSemester === "all" ||
        String(course.semester) === filterSemester;
      return matchesSearch && matchesSemester;
    });
  }, [courseData, searchQuery, filterSemester]);

  const totalEnrolled = enrollments.length;
  const pendingCount = enrollments.filter((e) => e.status === "pending").length;
  const approvedCount = enrollments.filter(
    (e) => e.status === "approved",
  ).length;

  const handleApproveReject = async (
    enrollmentId: string,
    newStatus: string,
  ) => {
    setUpdatingId(enrollmentId);
    try {
      await putBackend(
        `/api/enrollments/${enrollmentId}/status`,
        {
          status: newStatus,
          lecturerId: Number(user!.uid),
        },
        true,
      );

      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId ? { ...e, status: newStatus } : e,
        ),
      );

      toast({
        title: newStatus === "approved" ? "Enrollment approved" : "Enrollment rejected",
        description:
          newStatus === "approved"
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

  const semesters = [
    ...new Set(courseUnits.map((c) => String(c.semester))),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 animate-pulse" />
          <GraduationCap className="h-6 w-6 text-primary absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Loading your courses...</p>
      </div>
    );
  }

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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <section className="relative overflow-hidden rounded-3xl hero-gradient text-white p-5 sm:p-8 shadow-2xl">
            <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                    <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium uppercase tracking-widest text-white/70">
                    Enrollment Management
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-4xl text-white leading-tight">
                  {buildGreeting()}, {user?.email?.split("@")[0] || "Lecturer"}
                </h1>
                <p className="max-w-md text-xs sm:text-sm text-white/80 leading-relaxed">
                  Review your assigned course units and approve student enrollments.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] sm:text-xs text-white">
                    <Calendar className="h-3 w-3" />
                    {todayLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] sm:text-xs text-white">
                    <BookOpen className="h-3 w-3" />
                    {courseUnits.length} courses
                  </span>
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-amber px-3 py-1 text-[11px] sm:text-xs font-semibold text-navy shadow-glow">
                      <Sparkles className="h-3 w-3 text-navy" />
                      {pendingCount} pending approvals
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-success">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-white/60">
                    Approved
                  </p>
                  <p className="text-lg font-bold leading-tight">{approvedCount}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-5">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="overflow-hidden border-primary/30 bg-gradient-to-b from-primary/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Courses</p>
                      <p className="text-lg sm:text-2xl font-bold">{courseUnits.length}</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <GraduationCap className="h-3 w-3 text-primary" />
                    assigned to you
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="overflow-hidden border-teal/40 bg-gradient-to-b from-teal/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-to-r from-teal to-emerald" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Enrolled Students</p>
                      <p className="text-lg sm:text-2xl font-bold text-teal">{totalEnrolled}</p>
                    </div>
                    <div className="rounded-lg bg-teal/10 p-1.5 text-teal">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <Users className="h-3 w-3 text-teal" />
                    across your courses
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="overflow-hidden border-amber/40 bg-gradient-to-b from-amber/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-amber" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Pending Approvals</p>
                      <p className="text-lg sm:text-2xl font-bold text-amber-dark">{pendingCount}</p>
                    </div>
                    <div className="rounded-lg bg-amber/10 p-1.5 text-amber-dark">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-amber-dark/40 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-dark" />
                    </span>
                    waiting for your decision
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-card/70 backdrop-blur-lg rounded-2xl border border-border/60 p-3 sm:px-4"
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterSemester} onValueChange={setFilterSemester}>
            <SelectTrigger className="w-full sm:w-[200px] gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All Semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {semesters.map((sem) => (
                <SelectItem key={sem} value={sem}>
                  Semester {sem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

          {/* Course Cards */}
          {filteredCourses.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-card/50 backdrop-blur-lg">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <BookOpen className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No courses found</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No courses match your search"
                    : "No courses assigned to you yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCourses.map(({ course, enrollments: courseEnrollments }) => {
                const isExpanded = expandedCourse === String(course.id);
                const pending = courseEnrollments.filter(
                  (e) => e.status === "pending",
                );
                const approved = courseEnrollments.filter(
                  (e) => e.status === "approved",
                );
                const rejected = courseEnrollments.filter(
                  (e) => e.status === "rejected",
                );

                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-lg hover:shadow-lg transition-shadow">
                      <div className="h-1 w-full bg-gradient-to-r from-teal via-accent to-primary" />
                      <CardHeader
                        className="cursor-pointer hover:bg-primary/5 transition-colors py-4"
                        onClick={() =>
                          setExpandedCourse(
                            isExpanded ? null : String(course.id),
                          )
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl hero-gradient flex items-center justify-center shrink-0 shadow-md">
                              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[11px] sm:text-xs border-border/60"
                                >
                                  {course.code}
                                </Badge>
                                <Badge className="bg-accent/15 text-accent text-[11px] sm:text-xs border-0">
                                  {course.credits} Credits
                                </Badge>
                                <Badge variant="secondary" className="text-[11px] sm:text-xs">
                                  Sem {course.semester}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-sm sm:text-lg truncate">
                                {course.name}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                {pending.length} pending
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald" />
                                {approved.length} approved
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                {rejected.length} rejected
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs bg-muted/40 border-border/60">
                              <Users className="h-3 w-3 mr-1" />
                              {courseEnrollments.length}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <CardContent className="border-t border-border/60 bg-muted/10">
                              {courseEnrollments.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground">
                                  No students enrolled yet
                                </div>
                              ) : (
                                <div className="divide-y divide-border/50">
                                  {courseEnrollments.map((enrollment) => {
                                    const student = enrollment.student;
                                    const statusColor =
                                      enrollment.status === "approved"
                                        ? "bg-emerald/15 text-emerald border-0"
                                        : enrollment.status === "rejected"
                                          ? "bg-red-500/15 text-red-600 border-0"
                                          : "bg-amber/15 text-amber-dark border-0";
                                    const paperColor =
                                      enrollment.paper_type === "retake"
                                        ? "bg-coral/15 text-coral border-0"
                                        : enrollment.paper_type === "missed"
                                          ? "bg-amber/15 text-amber-dark border-0"
                                          : enrollment.paper_type === "supplementary"
                                            ? "bg-purple-500/15 text-purple-600 border-0"
                                            : "bg-blue-500/15 text-blue-600 border-0";

                                    return (
                                      <div
                                        key={enrollment.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                                            <span className="text-sm font-medium">
                                              {student?.full_name
                                                ?.split(" ")
                                                .map((n: string) => n[0])
                                                .join("")
                                                .slice(0, 2)
                                                .toUpperCase() || "?"}
                                            </span>
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-medium truncate">
                                              {student?.full_name || "Unknown Student"}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                              {student?.registration_number && (
                                                <span className="font-mono">{student.registration_number}</span>
                                              )}
                                              {student?.student_number && (
                                                <span>• {student.student_number}</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge className={`text-[11px] sm:text-xs ${paperColor}`}>
                                            {(enrollment.paper_type || "normal").charAt(0).toUpperCase() +
                                              (enrollment.paper_type || "normal").slice(1)}
                                          </Badge>
                                          <Badge className={`text-[11px] sm:text-xs ${statusColor}`}>
                                            {enrollment.status.charAt(0).toUpperCase() +
                                              enrollment.status.slice(1)}
                                          </Badge>
                                          {enrollment.status === "pending" && (
                                            <div className="flex items-center gap-1.5">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs text-emerald border-emerald/40 hover:bg-emerald/10"
                                                disabled={updatingId === enrollment.id}
                                                onClick={() =>
                                                  handleApproveReject(enrollment.id, "approved")
                                                }
                                              >
                                                {updatingId === enrollment.id ? (
                                                  <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                                )}
                                                Approve
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                                disabled={updatingId === enrollment.id}
                                                onClick={() =>
                                                  handleApproveReject(enrollment.id, "rejected")
                                                }
                                              >
                                                {updatingId === enrollment.id ? (
                                                  <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                  <XCircle className="h-3 w-3 mr-1" />
                                                )}
                                                Reject
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
      </main>
      <LecturerBottomNav />
    </div>
  );
}
