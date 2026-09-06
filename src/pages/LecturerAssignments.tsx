import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  X,
  Loader2,
  BookOpen,
  Sparkles,
  Award,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend, deleteBackend, uploadAttachment } from "@/lib/backendApi";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8084";
function resolveUrl(url: string): string {
  if (!url) return url;
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalPoints: number;
  submissions: number;
  totalStudents: number;
  status: "draft" | "active" | "closed" | "graded";
  courseTitle?: string;
  averageScore?: number;
  instructionDocumentUrl?: string;
  instructionDocumentName?: string;
}

interface CourseOption {
  id: string;
  title: string;
  code: string;
}

interface Submission {
  id: string;
  student_id: string;
  assignment_id: string;
  content: string;
  file_url?: string;
  file_name?: string;
  status: string;
  submitted_at: any;
  score?: number;
  feedback?: string;
  student_name?: string;
  student_email?: string;
}

const statusThemes: Record<
  string,
  {
    badge: string;
    bar: string;
    iconWrap: string;
    text: string;
  }
> = {
  active: {
    badge: "bg-emerald/15 text-emerald border-emerald/40",
    bar: "bg-gradient-to-r from-emerald via-teal to-teal-light",
    iconWrap: "bg-emerald/10 text-emerald",
    text: "text-emerald",
  },
  closed: {
    badge: "bg-amber/15 text-amber-dark border-amber/40",
    bar: "bg-gradient-to-r from-amber via-amber-light to-amber",
    iconWrap: "bg-amber/10 text-amber-dark",
    text: "text-amber-dark",
  },
  graded: {
    badge: "bg-blue-500/15 text-blue-600 border-blue-400/40",
    bar: "bg-gradient-to-r from-blue-500 to-sky-500",
    iconWrap: "bg-blue-500/10 text-blue-600",
    text: "text-blue-600",
  },
  draft: {
    badge: "bg-slate-500/15 text-slate-500 border-slate-400/40",
    bar: "bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400",
    iconWrap: "bg-slate-500/10 text-slate-500",
    text: "text-slate-500",
  },
};

const getStatusColor = (status: string) =>
  statusThemes[status]?.badge || statusThemes.draft.badge;

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

const formatDue = (
  iso: string,
): { label: string; tone: "danger" | "warning" | "neutral" | "muted" } => {
  if (!iso) return { label: "No due date", tone: "muted" };
  const due = new Date(iso).getTime();
  if (isNaN(due)) return { label: "No due date", tone: "muted" };
  const now = Date.now();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return { label: `${Math.abs(diffDays)}d overdue`, tone: "danger" as const };
  if (diffDays === 0) return { label: "Due today", tone: "warning" as const };
  if (diffDays === 1)
    return { label: "Due tomorrow", tone: "warning" as const };
  return { label: `${diffDays} days left`, tone: "neutral" as const };
};

const dueToneClasses: Record<string, string> = {
  danger: "bg-rose-500/10 text-rose-600 border-rose-300/40",
  warning: "bg-amber/10 text-amber-dark border-amber/40",
  neutral: "bg-slate-500/10 text-slate-600 border-slate-400/40",
  muted: "bg-muted text-muted-foreground border-border",
};

export default function LecturerAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "active" | "closed" | "graded">("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<Assignment | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeTab, setActiveTab] = useState<"assignments" | "submissions">("assignments");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    totalPoints: 100,
    instructionDocument: null as File | null,
  });
  const [uploadingDocument, setUploadingDocument] = useState(false);

  useEffect(() => {
    const loadAssignments = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await getBackend<any[]>(
          `/api/assignments/?lecturer_id=${encodeURIComponent(user.uid)}`,
        );
        const mapped: Assignment[] = data.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          dueDate: item.due_date,
          totalPoints: item.total_points ?? 100,
          submissions: 0,
          totalStudents: 0,
          status: item.status || "draft",
          courseTitle: item.course_title || "",
          instructionDocumentUrl: item.instruction_document_url || undefined,
          instructionDocumentName: item.instruction_document_name || undefined,
        }));
        setAssignments(mapped);
      } catch (error: any) {
        toast({
          title: "Could not load assignments",
          description: error.message || "Failed to load assignments",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadAssignments();
  }, [toast, user]);

  useEffect(() => {
    const loadCourses = async () => {
      if (!user) return;
      try {
        const profiles = await getBackend<any[]>("/api/profiles/?role=lecturer");
        const lecturerProfile = profiles.find(
          (p: any) => p.email === user.email,
        );
        const assignedCourseUnits: string[] =
          lecturerProfile?.assigned_course_units || [];

        if (assignedCourseUnits.length > 0) {
          const courseUnitsData = await getBackend<any[]>("/api/course-units/");
          const mapped: CourseOption[] = courseUnitsData
            .filter((cu: any) => assignedCourseUnits.includes(cu.id) || assignedCourseUnits.includes(cu.course_id))
            .map((cu: any) => ({
              id: cu.id || cu.course_id,
              title: cu.name || cu.course_unit_name || "Unknown Course",
              code: cu.code || cu.course_unit_code || "Unknown",
            }));
          setCourses(mapped);
        } else {
          setCourses([]);
        }
      } catch {
        setCourses([]);
      }
    };
    loadCourses();
  }, [user]);

  const filteredAssignments =
    selectedFilter === "all"
      ? assignments
      : assignments.filter((a) => a.status === selectedFilter);

  const stats = {
    activeCount: assignments.filter((a) => a.status === "active").length,
    closedCount: assignments.filter((a) => a.status === "closed").length,
    gradedCount: assignments.filter((a) => a.status === "graded").length,
  };

  const filterCounts = {
    all: assignments.length,
    active: stats.activeCount,
    closed: stats.closedCount,
    graded: stats.gradedCount,
  };

  const handleCreateAssignment = async () => {
    if (!user || !formData.title || !formData.dueDate || !selectedCourse) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select a course",
        variant: "destructive",
      });
      return;
    }

    if (selectedCourse && selectedCourse.includes("course-")) {
      toast({
        title: "Invalid course selection",
        description: "Please choose a real course from the list.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const course = courses.find((c) => c.id === selectedCourse);

      let instructionDocUrl: string | undefined;
      let instructionDocName: string | undefined;
      if (formData.instructionDocument) {
        setUploadingDocument(true);
        const uploaded = await uploadAttachment(formData.instructionDocument);
        instructionDocUrl = uploaded.url;
        instructionDocName = formData.instructionDocument.name;
      }

      const payload: any = {
        lecturer_id: user.uid,
        course_id: selectedCourse,
        course_title: course?.title || "",
        course_code: course?.code || "",
        title: formData.title,
        description: formData.description,
        due_date: new Date(formData.dueDate).toISOString(),
        total_points: formData.totalPoints,
        status: "draft",
      };
      if (instructionDocUrl) {
        payload.instruction_document_url = instructionDocUrl;
        payload.instruction_document_name = instructionDocName;
      }

      const created = await postBackend<any>("/api/assignments/", payload);

      const newAssignment: Assignment = {
        id: created.id,
        title: created.title,
        description: created.description,
        dueDate: created.due_date,
        totalPoints: created.total_points,
        submissions: 0,
        totalStudents: 0,
        status: created.status || "draft",
        courseTitle: created.course_title || course?.title,
        instructionDocumentUrl: created.instruction_document_url || instructionDocUrl,
        instructionDocumentName: created.instruction_document_name || instructionDocName,
      };
      setAssignments((prev) => [...prev, newAssignment]);
      setFormData({ title: "", description: "", dueDate: "", totalPoints: 100, instructionDocument: null });
      setShowCreateModal(false);
      toast({ title: "Success", description: "Assignment created successfully." });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadingDocument(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await deleteBackend(`/api/assignments/${assignmentId}/`);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast({ title: "Assignment deleted" });
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
  };

  const loadSubmissions = async (assignmentId: string) => {
    setLoadingSubmissions(true);
    try {
      const submissionsData = await getBackend<any[]>(
        `/api/submissions/?assignment_ids=${encodeURIComponent(assignmentId)}`,
      );
      const allProfiles = await getBackend<any[]>("/api/profiles/");
      const profileMap = new Map<string, any>();
      allProfiles.forEach((p: any) => profileMap.set(p.id, p));

      const submissionsWithStudents: Submission[] = submissionsData.map((s: any) => {
        const studentData = profileMap.get(s.student_id) || {};
        return {
          id: s.id,
          student_id: s.student_id,
          assignment_id: s.assignment_id,
          content: s.content || "",
          file_url: s.file_url || undefined,
          file_name: s.file_name || undefined,
          status: s.status || "submitted",
          submitted_at: s.submitted_at,
          score: s.score,
          feedback: s.feedback,
          student_name: studentData.full_name || "Unknown Student",
          student_email: studentData.email || "No email",
        };
      });
      setViewingSubmissions(submissionsWithStudents);
    } catch (error: any) {
      toast({
        title: "Could not load submissions",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoadingSubmissions(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 text-foreground pb-28">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/10 blur-3xl rounded-full opacity-60" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-gradient-to-bl from-secondary/15 via-primary/10 to-transparent blur-3xl rounded-full opacity-40" />
        <div className="absolute bottom-10 left-1/3 w-72 h-72 bg-gradient-to-tr from-teal/10 to-transparent blur-3xl rounded-full opacity-50" />
      </div>

      <main className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6 lg:pt-10 space-y-8 relative">
        {courses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-8 text-center border-amber/20"
          >
            <div className="relative inline-flex mb-4">
              <div className="absolute inset-0 rounded-full bg-amber/20 blur-2xl" />
              <div className="relative h-16 w-16 rounded-full bg-amber/10 flex items-center justify-center border border-amber/30">
                <AlertCircle className="h-8 w-8 text-amber-dark" />
              </div>
            </div>
            <p className="text-foreground mb-2 font-semibold text-lg">No courses assigned yet.</p>
            <p className="text-muted-foreground mb-6">Select the courses you teach to manage assignments.</p>
            <Button onClick={() => navigate("/lecturer/courses")} className="gap-2 shadow-primary">
              <BookOpen className="h-4 w-4" /> Select Courses
            </Button>
          </motion.div>
        )}

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl hero-gradient text-white p-8 sm:p-12 shadow-2xl">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-28 -left-10 w-80 h-80 rounded-full bg-teal/20 blur-3xl" />
            <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-amber/20 blur-2xl animate-float" />
            <div className="absolute top-8 right-1/4 w-24 h-24 rounded-full border border-white/10" />
            <div className="absolute bottom-10 right-10 w-16 h-16 rounded-full border border-white/10" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-5 flex-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-light font-bold bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/20 shadow-glow"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Assignment Management
              </motion.div>

              <div className="space-y-1.5">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="text-sm font-medium text-white/60"
                >
                  {buildGreeting()}, {user?.email?.split("@")[0] || "Lecturer"} · {todayLabel}
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl sm:text-5xl font-display font-bold text-white"
                >
                  Assignments
                </motion.h1>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-base text-white/70 max-w-2xl leading-relaxed"
              >
                Create and manage course assignments, collect submissions, and
                review student work — all in one place.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="flex flex-wrap gap-2"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90">
                  <FileText className="h-3.5 w-3.5 text-amber-light" />
                  {assignments.length} Total
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/25 border border-emerald/40 px-3 py-1.5 text-xs font-semibold text-white">
                  <Clock className="h-3.5 w-3.5" />
                  {stats.activeCount} Active
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/25 border border-blue-400/40 px-3 py-1.5 text-xs font-semibold text-white">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {stats.gradedCount} Graded
                </span>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-stretch lg:items-end gap-3 w-full lg:w-auto"
            >
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-amber text-navy hover:shadow-glow transition-all font-semibold shadow-lg h-12 px-8 w-full lg:w-auto"
              >
                <Plus className="h-5 w-5 mr-2" /> New Assignment
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Active",
              value: stats.activeCount,
              icon: Clock,
              color: "emerald",
              hint: "Open for submissions",
            },
            {
              label: "Closed",
              value: stats.closedCount,
              icon: AlertCircle,
              color: "amber",
              hint: "Past due date",
            },
            {
              label: "Graded",
              value: stats.gradedCount,
              icon: CheckCircle,
              color: "blue",
              hint: "Marked & reviewed",
            },
            {
              label: "Total",
              value: assignments.length,
              icon: FileText,
              color: "primary",
              hint: "All assignments",
            },
          ].map((stat, idx) => {
            const theme =
              statusThemes[
                stat.color === "emerald"
                  ? "active"
                  : stat.color === "amber"
                    ? "closed"
                    : stat.color === "blue"
                      ? "graded"
                      : "draft"
              ];
            const valueText =
              stat.color === "emerald"
                ? "text-emerald"
                : stat.color === "amber"
                  ? "text-amber-dark"
                  : stat.color === "blue"
                    ? "text-blue-600"
                    : "text-primary";
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group"
              >
                <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-gradient-to-br from-card to-card/70 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`h-1 w-full ${theme.bar}`} />
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-semibold">{stat.label}</p>
                        <p className={`text-3xl font-bold mt-1 ${valueText}`}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1.5">{stat.hint}</p>
                      </div>
                      <div className={`p-2.5 rounded-xl ${theme.iconWrap} shadow-sm`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </section>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2 rounded-xl p-1.5 bg-muted/60">
            <TabsTrigger value="assignments" className="rounded-lg data-[state=active]:shadow-sm">
              Assignments
            </TabsTrigger>
            <TabsTrigger value="submissions" className="rounded-lg data-[state=active]:shadow-sm">
              Submissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4 mt-4">
            <div className="flex gap-2 flex-wrap items-center">
              {(["all", "active", "closed", "graded"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedFilter === filter
                      ? "bg-primary text-primary-foreground shadow-primary"
                      : "bg-card text-muted-foreground hover:bg-muted/80 border border-border"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  <span
                    className={`inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full text-[10px] font-bold ${
                      selectedFilter === filter
                        ? "bg-white/25 text-primary-foreground"
                        : "bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    {filterCounts[filter]}
                  </span>
                </button>
              ))}
              {filteredAssignments.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground hidden sm:block">
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {filteredAssignments.length}
                  </span>{" "}
                  of {assignments.length}
                </span>
              )}
            </div>

            {filteredAssignments.length === 0 ? (
              <Card className="rounded-2xl border-border/60 overflow-hidden">
                <CardContent className="py-16 text-center">
                  <div className="relative inline-flex mb-5">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-teal/20 blur-2xl" />
                    <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-border/60 shadow-lg">
                      <FileText className="h-9 w-9 text-primary/60" />
                    </div>
                  </div>
                  <p className="text-foreground font-semibold text-lg mb-1.5">No assignments yet</p>
                  <p className="text-muted-foreground mb-6">Create your first assignment to get started</p>
                  <Button onClick={() => setShowCreateModal(true)} className="gap-2 shadow-primary">
                    <Plus className="h-4 w-4" /> New Assignment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAssignments.map((assignment, i) => {
                  const theme = statusThemes[assignment.status] || statusThemes.draft;
                  const due = formatDue(assignment.dueDate);
                  return (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg hover:shadow-xl hover:-translate-y-0.5 ring-1 ring-transparent hover:ring-primary/10 transition-all duration-300 group">
                        <div className={`h-1.5 w-full ${theme.bar}`} />
                        <CardContent className="p-5 sm:p-6 pt-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2.5">
                                <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${theme.iconWrap} shadow-sm`}>
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-lg font-bold text-foreground truncate">{assignment.title}</h3>
                                  <Badge variant="outline" className={`mt-1 text-[11px] ${theme.badge}`}>
                                    {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                                  </Badge>
                                </div>
                              </div>
                              {assignment.description && (
                                <p className="text-muted-foreground text-sm mb-3.5 line-clamp-2">
                                  {assignment.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {assignment.courseTitle && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground">
                                    <BookOpen className="h-3.5 w-3.5 text-primary opacity-70" />
                                    {assignment.courseTitle}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground">
                                  <Calendar className="h-3.5 w-3.5 text-primary opacity-70" />
                                  {new Date(assignment.dueDate).toLocaleDateString()}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground">
                                  <Award className="h-3.5 w-3.5 text-primary opacity-70" />
                                  {assignment.totalPoints} pts
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${dueToneClasses[due.tone]}`}
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  {due.label}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 items-stretch sm:items-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1.5 hover:bg-muted/60"
                                onClick={() => { setViewing(assignment); loadSubmissions(assignment.id); }}
                              >
                                <Eye className="h-4 w-4 text-primary" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4 mt-4">
            <Card className="rounded-2xl border-border/60 overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-muted/20">
                <CardTitle className="text-lg font-bold">All Submissions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Review and grade student submissions by assignment
                </p>
              </CardHeader>
              <CardContent className="pt-5">
                {assignments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="relative inline-flex mb-4">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-teal/20 blur-2xl" />
                      <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-border/60 shadow-lg">
                        <FileText className="h-8 w-8 text-primary/60" />
                      </div>
                    </div>
                    <p className="text-foreground font-semibold text-lg mb-1.5">No assignments yet</p>
                    <p className="text-muted-foreground">Create an assignment to start receiving submissions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="p-4 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/50 hover:shadow-sm hover:border-primary/20 ring-1 ring-transparent hover:ring-primary/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${statusThemes[assignment.status]?.iconWrap || statusThemes.draft.iconWrap}`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground truncate">{assignment.title}</h4>
                              <Badge variant="outline" className={`text-[10px] shrink-0 hidden sm:inline-flex ${statusThemes[assignment.status]?.badge || statusThemes.draft.badge}`}>
                                {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {assignment.submissions}/{assignment.totalStudents} submitted
                              <span className="mx-1.5 text-border/80">·</span>
                              due {new Date(assignment.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1.5 hover:bg-muted/60 shrink-0"
                          onClick={() => { setViewing(assignment); loadSubmissions(assignment.id); }}
                        >
                          <Eye className="h-4 w-4 text-primary" /> View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Assignment Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border/60 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Create Assignment</h2>
                    <p className="text-xs text-muted-foreground">Set up a new assignment for your course</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Course <span className="text-coral">*</span>
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Select a course...</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code ? `${course.code} - ${course.title}` : course.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Title <span className="text-coral">*</span>
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Midterm Exam"
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the assignment..."
                    rows={3}
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Due Date <span className="text-coral">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Points <span className="text-coral">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.totalPoints}
                      onChange={(e) => setFormData({ ...formData, totalPoints: parseInt(e.target.value) })}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Instructions (Optional)</label>
                  <Input
                    type="file"
                    accept=".doc,.docx,.pdf,.txt"
                    onChange={(e) => setFormData({ ...formData, instructionDocument: e.target.files?.[0] || null })}
                    disabled={uploadingDocument}
                    className="text-sm rounded-xl file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1 rounded-xl" disabled={loading || uploadingDocument}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAssignment} disabled={loading || uploadingDocument} className="flex-1 rounded-xl shadow-primary">
                  {uploadingDocument ? "Uploading..." : loading ? "Creating..." : "Create"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* View Assignment Modal */}
        {viewing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border/60 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`shrink-0 p-2.5 rounded-xl ${statusThemes[viewing.status]?.iconWrap || statusThemes.draft.iconWrap}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground truncate">{viewing.title}</h2>
                </div>
                <button onClick={() => { setViewing(null); setViewingSubmissions([]); }} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">{viewing.description || "No description"}</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
                    <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Due Date</p>
                    <p className="font-medium text-foreground">{new Date(viewing.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
                    <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Points</p>
                    <p className="font-medium text-foreground">{viewing.totalPoints}</p>
                  </div>
                  {viewing.courseTitle && (
                    <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
                      <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Course</p>
                      <p className="font-medium text-foreground">{viewing.courseTitle}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
                    <p className="text-muted-foreground text-xs uppercase font-semibold mb-1">Status</p>
                    <Badge variant="outline" className={`mt-0.5 text-xs ${getStatusColor(viewing.status)}`}>
                      {viewing.status.charAt(0).toUpperCase() + viewing.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {viewing.instructionDocumentUrl && (
                  <a
                    href={resolveUrl(viewing.instructionDocumentUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                  >
                    📎 {viewing.instructionDocumentName || "Download Instructions"}
                  </a>
                )}

                <div className="border-t border-border/40 pt-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Submissions ({loadingSubmissions ? "..." : viewingSubmissions.length})
                  </h3>
                  {loadingSubmissions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : viewingSubmissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
                      No submissions yet
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                      {viewingSubmissions.map((sub) => (
                        <div key={sub.id} className="p-3 rounded-xl border border-border/60 bg-muted/30">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{sub.student_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{sub.student_email}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 ${
                                sub.score != null
                                  ? "bg-emerald/10 text-emerald border-emerald/40"
                                  : "bg-slate-500/10 text-slate-500 border-slate-400/40"
                              }`}
                            >
                              {sub.score != null ? `${sub.score} pts` : sub.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
      <LecturerBottomNav />
    </div>
  );
}