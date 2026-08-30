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
            const uid = String(p.user_id);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <GraduationCap className="h-4 w-4" />
              <span>Lecturer</span>
              <span>/</span>
              <span className="text-foreground">My Courses</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              My Courses
            </h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Courses</p>
                    <p className="text-2xl font-bold">{courseUnits.length}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Enrolled Students</p>
                    <p className="text-2xl font-bold">{totalEnrolled}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Approvals</p>
                    <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
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
          </div>

          {/* Course Cards */}
          {filteredCourses.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
                    <Card className="overflow-hidden">
                      <CardHeader
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() =>
                          setExpandedCourse(
                            isExpanded ? null : String(course.id),
                          )
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs"
                                >
                                  {course.code}
                                </Badge>
                                <Badge className="bg-accent/10 text-accent text-xs">
                                  {course.credits} Credits
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Sem {course.semester}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-lg">
                                {course.name}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-3 text-sm">
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                {pending.length} pending
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                {approved.length} approved
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                {rejected.length} rejected
                              </span>
                            </div>
                            <Badge variant="outline" className="text-sm">
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
                            <CardContent className="border-t">
                              {courseEnrollments.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground">
                                  No students enrolled yet
                                </div>
                              ) : (
                                <div className="divide-y">
                                  {courseEnrollments.map((enrollment) => {
                                    const student = enrollment.student;
                                    const statusColor =
                                      enrollment.status === "approved"
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : enrollment.status === "rejected"
                                          ? "bg-destructive/10 text-destructive"
                                          : "bg-amber-500/10 text-amber-600";
                                    const paperColor =
                                      enrollment.paper_type === "retake"
                                        ? "bg-red-500/10 text-red-600"
                                        : enrollment.paper_type === "missed"
                                          ? "bg-amber-500/10 text-amber-600"
                                          : enrollment.paper_type === "supplementary"
                                            ? "bg-purple-500/10 text-purple-600"
                                            : "bg-blue-500/10 text-blue-600";

                                    return (
                                      <div
                                        key={enrollment.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3"
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
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
                                                <span>{student.registration_number}</span>
                                              )}
                                              {student?.student_number && (
                                                <span>• {student.student_number}</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge className={`text-xs border-0 ${paperColor}`}>
                                            {(enrollment.paper_type || "normal").charAt(0).toUpperCase() +
                                              (enrollment.paper_type || "normal").slice(1)}
                                          </Badge>
                                          <Badge className={`text-xs ${statusColor}`}>
                                            {enrollment.status.charAt(0).toUpperCase() +
                                              enrollment.status.slice(1)}
                                          </Badge>
                                          {enrollment.status === "pending" && (
                                            <div className="flex items-center gap-1">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
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
                                                className="h-7 text-xs text-destructive border-destructive/20 hover:bg-destructive/5"
                                                disabled={updatingId === enrollment.id}
                                                onClick={() =>
                                                  handleApproveReject(enrollment.id, "rejected")
                                                }
                                              >
                                                <XCircle className="h-3 w-3 mr-1" />
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
        </motion.div>
      </main>
      <LecturerBottomNav />
    </div>
  );
}
