import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Play,
  BarChart3,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Settings,
  ChevronDown,
  Calendar,
  BookOpen,
  TrendingUp,
  Award,
  Sparkles,
  Search,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend } from "@/lib/backendApi";
import { useToast } from "@/components/ui/use-toast";
import { autoCloseExpiredQuizzes } from "@/lib/quizUtils";

interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseTitle: string;
  courseCode?: string;
  totalQuestions: number;
  totalPoints: number;
  timeLimit: number; // in minutes
  passingScore: number;
  dueDate: string;
  status: "draft" | "active" | "closed";
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  showAnswers: boolean;
  totalAttempts: number;
  averageScore?: number;
  completionRate?: number;
  highestScore?: number;
  lowestScore?: number;
}

const rise = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

const statusThemes: Record<
  string,
  {
    badge: string;
    bar: string;
    iconWrap: string;
    progress: string;
    text: string;
  }
> = {
  active: {
    badge: "bg-emerald/15 text-emerald border-emerald/40",
    bar: "bg-gradient-to-r from-emerald via-teal to-teal-light",
    iconWrap: "bg-emerald/10 text-emerald",
    progress: "bg-gradient-to-r from-emerald to-teal",
    text: "text-emerald",
  },
  draft: {
    badge: "bg-amber/15 text-amber-dark border-amber/40",
    bar: "bg-gradient-to-r from-amber via-amber-light to-amber",
    iconWrap: "bg-amber/10 text-amber-dark",
    progress: "bg-gradient-to-r from-amber to-amber-light",
    text: "text-amber-dark",
  },
  closed: {
    badge: "bg-slate-500/15 text-slate-500 border-slate-400/40",
    bar: "bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400",
    iconWrap: "bg-slate-500/10 text-slate-500",
    progress: "bg-gradient-to-r from-slate-400 to-slate-500",
    text: "text-slate-500",
  },
};

const statThemes: Record<
  string,
  { icon: string; value: string; bar: string }
> = {
  primary: {
    icon: "bg-primary/10 text-primary",
    value: "text-primary",
    bar: "from-primary to-accent",
  },
  emerald: {
    icon: "bg-emerald/10 text-emerald",
    value: "text-emerald",
    bar: "from-emerald to-teal",
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-600",
    value: "text-blue-600",
    bar: "from-blue-500 to-sky-500",
  },
  amber: {
    icon: "bg-amber/10 text-amber-dark",
    value: "text-amber-dark",
    bar: "from-amber to-amber-light",
  },
};

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
    return {
      label: `${Math.abs(diffDays)}d overdue`,
      tone: "danger" as const,
    };
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

export default function LecturerQuiz() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const displayName = profile?.full_name || "Lecturer";

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "draft" | "active" | "closed"
  >("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    activeQuizzes: 0,
    totalAttempts: 0,
    averageCompletion: 0,
  });

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      if (!user?.uid) return;

      const data = await getBackend<any[]>(
        `/api/quizzes/?lecturer_id=${encodeURIComponent(user.uid)}`,
      );

      console.log("LecturerQuiz: Query result count:", data.length);

      const quizzesData: Quiz[] = data.map((row: any) => {
        const quizData: Quiz = {
          id: row.id,
          title: row.title,
          description: row.description,
          courseId: row.course_id,
          courseTitle: row.course_title,
          courseCode: row.course_code,
          totalQuestions: row.total_questions,
          totalPoints: row.total_points,
          timeLimit: row.time_limit,
          passingScore: row.passing_score,
          dueDate: row.due_date,
          status: row.status,
          totalAttempts: row.total_attempts || 0,
          averageScore: row.average_score || 0,
          completionRate: row.completion_rate || 0,
          highestScore: row.highest_score || 0,
          lowestScore: row.lowest_score || 0,
          attemptsAllowed: row.attempts_allowed || 1,
          shuffleQuestions: row.shuffle_questions || false,
          showAnswers: row.show_answers || false,
        };
        return quizData;
      });

      // Check for expired quizzes and auto-close them
      const expiredQuizIds = await autoCloseExpiredQuizzes(user.uid);

      // Update local quiz data for expired quizzes
      if (
        expiredQuizIds &&
        Array.isArray(expiredQuizIds) &&
        expiredQuizIds.length > 0
      ) {
        quizzesData.forEach((quiz) => {
          if (expiredQuizIds.includes(quiz.id)) {
            quiz.status = "closed";
          }
        });

        toast({
          title: "Auto-closed Quizzes",
          description: `${expiredQuizIds.length} quiz(es) have been automatically closed as they reached their end date.`,
        });
      }

      setQuizzes(quizzesData);

      // Calculate stats
      const stats = {
        totalQuizzes: quizzesData.length,
        activeQuizzes: quizzesData.filter((q) => q.status === "active").length,
        totalAttempts: quizzesData.reduce((sum, q) => sum + q.totalAttempts, 0),
        averageCompletion:
          quizzesData.length > 0
            ? Math.round(
                quizzesData.reduce(
                  (sum, q) => sum + (q.completionRate || 0),
                  0,
                ) / quizzesData.length,
              )
            : 0,
      };
      setStats(stats);
    } catch (error: any) {
      console.error("Error loading quizzes:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load quizzes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLecturerCourses = async () => {
    try {
      if (!user?.uid) return;

      // Fetch lecturer's course units via API
      const assignedRawCourses: any[] = [];
      try {
        const courseUnitsData = await getBackend<any[]>("/api/course-units/");
        if (courseUnitsData && courseUnitsData.length > 0) {
          courseUnitsData.forEach((course: any) => {
            assignedRawCourses.push({
              id: course.id,
              course_code: course.code || course.course_unit_code || "Unknown",
              course_title: course.name || course.course_unit_name || "Unknown Course",
            });
          });
        }
      } catch (err) {
        console.error("Failed to fetch course units:", err);
      }

      // Set available courses to the assigned course units
      const coursesData: any[] = assignedRawCourses.map((raw) => ({
        id: raw.id,
        course_code: raw.course_code,
        course_title: raw.course_title,
      }));

      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching lecturer courses:", error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    }
  };

  const filterQuizzes = () => {
    let filtered = [...quizzes];

    if (filterStatus !== "all") {
      filtered = filtered.filter((q) => q.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.title.toLowerCase().includes(query) ||
          q.courseTitle.toLowerCase().includes(query) ||
          q.description.toLowerCase().includes(query),
      );
    }

    setFilteredQuizzes(filtered);
  };

  useEffect(() => {
    if (user?.uid) {
      loadQuizzes();
      fetchLecturerCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    filterQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizzes, filterStatus, searchQuery]);

  const handleDeleteQuiz = async (quizId: string) => {
    try {
        await postBackend(`/api/quizzes/${quizId}/action/`, { action: "delete" });

        toast({
          title: "Success",
          description: "Quiz deleted successfully",
        });
        setQuizzes(quizzes.filter((q) => q.id !== quizId));
      } catch (error) {
        console.error("Error deleting quiz:", error);
        toast({
          title: "Error",
          description: "Failed to delete quiz",
          variant: "destructive",
        });
      }
  };

  const handleDuplicateQuiz = async (quiz: Quiz) => {
    try {
      const newQuizData = {
        title: `${quiz.title} (Copy)`,
        description: quiz.description,
        course_id: quiz.courseId,
        lecturer_id: user?.uid,
        total_questions: quiz.totalQuestions,
        total_points: quiz.totalPoints,
        time_limit: quiz.timeLimit,
        passing_score: quiz.passingScore,
        due_date: quiz.dueDate,
        status: "draft",
        attempts_allowed: quiz.attemptsAllowed,
        shuffle_questions: quiz.shuffleQuestions,
        show_answers: quiz.showAnswers,
        total_attempts: 0,
        average_score: 0,
        completion_rate: 0,
        highest_score: 0,
        lowest_score: 0,
      };

      const newQuiz = await postBackend<any>("/api/quizzes/", newQuizData);
      const newQuizId = newQuiz.id;

      toast({
        title: "Success",
        description: `Quiz "${quiz.title}" duplicated successfully`,
      });
      loadQuizzes();
    } catch (error) {
      console.error("Error duplicating quiz:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate quiz",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    return statusThemes[status]?.badge || statusThemes.closed.badge;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Play className="h-4 w-4" />;
      case "draft":
        return <AlertCircle className="h-4 w-4" />;
      case "closed":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const statusCounts = {
    all: quizzes.length,
    active: quizzes.filter((q) => q.status === "active").length,
    draft: quizzes.filter((q) => q.status === "draft").length,
    closed: quizzes.filter((q) => q.status === "closed").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-muted animate-pulse" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading your quizzes...
          </p>
        </div>
        <LecturerBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 text-foreground">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/10 blur-3xl rounded-full opacity-60" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-gradient-to-bl from-secondary/15 via-primary/10 to-transparent blur-3xl rounded-full opacity-40" />
        <div className="absolute bottom-10 left-1/3 w-72 h-72 bg-gradient-to-tr from-teal/10 to-transparent blur-3xl rounded-full opacity-50" />
      </div>

      <main className="px-4 pb-28 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto pt-6 lg:pt-10">
          {/* Hero Section */}
          <section className="relative overflow-hidden rounded-3xl hero-gradient text-white p-8 sm:p-12 shadow-2xl mb-8">
            {/* Decorative elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-28 -left-10 w-80 h-80 rounded-full bg-teal/20 blur-3xl" />
              <div className="absolute top-1/2 left-1/2 w-40 h-40 rounded-full bg-amber/20 blur-2xl animate-float" />
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
                  Quiz Management
                </motion.div>

                <div className="space-y-1.5">
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="text-sm font-medium text-white/60"
                  >
                    {buildGreeting()}, {displayName} · {todayLabel}
                  </motion.p>
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl sm:text-5xl font-display font-bold text-white"
                  >
                    Create & Manage Quizzes
                  </motion.h1>
                </div>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-base text-white/70 max-w-2xl leading-relaxed"
                >
                  Design engaging quizzes, track student performance, and
                  provide instant feedback. Customize difficulty levels, time
                  limits, and grading criteria.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col gap-5 w-full lg:w-auto"
              >
                {/* Quick summary chips */}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90">
                    <BookOpen className="h-3.5 w-3.5 text-amber-light" />
                    {stats.totalQuizzes} Quizzes
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/25 border border-emerald/40 px-3 py-1.5 text-xs font-semibold text-white">
                    <Play className="h-3.5 w-3.5" />
                    {stats.activeQuizzes} Active
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90">
                    <Users className="h-3.5 w-3.5 text-teal-light" />
                    {stats.totalAttempts} Attempts
                  </span>
                </div>

                {/* Course Selection for Quiz Creation */}
                <div className="flex flex-col gap-2 min-w-[250px]">
                  <label className="text-sm font-medium text-white/90">
                    Select Course for New Quiz{" "}
                    <span className="text-coral">*</span>
                  </label>
                  <select
                    value={selectedCourse === "all" ? "" : selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-white/25 bg-white/10 backdrop-blur text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber/60 [&>option]:text-navy [&>option]:bg-white"
                  >
                    <option value="">Choose a course...</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.course_code} - {course.course_title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                    onClick={() => navigate("/lecturer/assignments")}
                  >
                    View Assignments
                  </Button>
                  <Button
                    className="bg-gradient-amber text-navy hover:shadow-glow transition-all font-semibold"
                    onClick={() => {
                      if (selectedCourse && selectedCourse !== "all") {
                        navigate(
                          `/lecturer/quiz/create?course=${selectedCourse}`,
                        );
                      } else {
                        toast({
                          title: "Course Required",
                          description:
                            "Please select a course before creating a quiz.",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={!selectedCourse || selectedCourse === "all"}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Quiz
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[
              {
                label: "Total Quizzes",
                value: stats.totalQuizzes,
                icon: BookOpen,
                color: "primary",
                hint: "Quizzes you own",
              },
              {
                label: "Active Quizzes",
                value: stats.activeQuizzes,
                icon: Play,
                color: "emerald",
                hint: "Live right now",
              },
              {
                label: "Total Attempts",
                value: stats.totalAttempts,
                icon: Users,
                color: "blue",
                hint: "Student submissions",
              },
              {
                label: "Avg Completion",
                value: `${stats.averageCompletion}%`,
                icon: TrendingUp,
                color: "amber",
                hint: "Across all quizzes",
              },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                variants={rise}
                initial="hidden"
                animate="visible"
                custom={idx}
                className="group"
              >
                <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-gradient-to-br from-card to-card/70 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`h-1 w-full bg-gradient-to-r ${statThemes[stat.color].bar}`} />
                  <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
                    <CardTitle className="text-sm text-muted-foreground font-semibold">
                      {stat.label}
                    </CardTitle>
                    <div className={`p-2.5 rounded-xl ${statThemes[stat.color].icon} shadow-sm`}>
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-5">
                    <div className={`text-3xl font-bold ${statThemes[stat.color].value}`}>
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {stat.hint}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </section>

          {/* Filter Section */}
          <section className="mb-8 space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "All", value: "all" as const },
                  { label: "Active", value: "active" as const },
                  { label: "Draft", value: "draft" as const },
                  { label: "Closed", value: "closed" as const },
                ].map((filter) => (
                  <Button
                    key={filter.value}
                    variant={
                      filterStatus === filter.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setFilterStatus(filter.value)}
                    className={`text-xs rounded-full px-4 transition-all ${
                      filterStatus === filter.value
                        ? "shadow-primary"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    {filter.label}
                    <span
                      className={`ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full text-[10px] font-bold ${
                        filterStatus === filter.value
                          ? "bg-white/25 text-primary-foreground"
                          : "bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {statusCounts[filter.value]}
                    </span>
                  </Button>
                ))}
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {filteredQuizzes.length}
                </span>{" "}
                of <span className="font-semibold text-foreground">{quizzes.length}</span>{" "}
                quizzes
              </p>
              {filteredQuizzes.length > 0 && (
                <p className="hidden sm:block">
                  {filterStatus === "all"
                    ? "All statuses"
                    : `${filterStatus.charAt(0).toUpperCase()}${filterStatus.slice(1)} quizzes only`}
                </p>
              )}
            </div>
          </section>

          {/* Quizzes Grid */}
          <section className="grid gap-6">
            {filteredQuizzes.length > 0 ? (
              filteredQuizzes.map((quiz, idx) => {
                const theme = statusThemes[quiz.status] || statusThemes.closed;
                const due = formatDue(quiz.dueDate);
                return (
                  <motion.div
                    key={quiz.id}
                    variants={rise}
                    initial="hidden"
                    animate="visible"
                    custom={idx}
                  >
                    <Card className="relative overflow-hidden rounded-2xl border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 group">
                      {/* Status accent bar */}
                      <div className={`h-1.5 w-full ${theme.bar}`} />

                      <CardContent className="p-5 sm:p-6 pt-5 space-y-4 relative">
                        {/* Title + status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${theme.iconWrap} shadow-sm`}>
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-foreground truncate">
                                {quiz.title}
                              </h3>
                              {quiz.courseCode && (
                                <p className="text-xs font-mono font-medium text-muted-foreground">
                                  {quiz.courseCode}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`${theme.badge} flex items-center gap-1 shrink-0 shadow-sm`}
                          >
                            {getStatusIcon(quiz.status)}
                            {quiz.status.charAt(0).toUpperCase() +
                              quiz.status.slice(1)}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {quiz.description}
                        </p>

                        {/* Meta chips */}
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground">
                            <BookOpen className="h-3.5 w-3.5 text-primary opacity-70" />
                            {quiz.courseTitle}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground">
                            <Clock className="h-3.5 w-3.5 text-primary opacity-70" />
                            {quiz.timeLimit} mins
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground">
                            <AlertCircle className="h-3.5 w-3.5 text-primary opacity-70" />
                            {quiz.totalQuestions} questions
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground">
                            <Award className="h-3.5 w-3.5 text-primary opacity-70" />
                            {quiz.totalPoints} points
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-primary opacity-70" />
                            {new Date(quiz.dueDate).toLocaleDateString()}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${dueToneClasses[due.tone]}`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {due.label}
                          </span>
                        </div>

                        {/* Stats Row */}
                        {quiz.totalAttempts > 0 && (
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 py-4 border-t border-border/40">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase font-semibold">
                                Attempts
                              </p>
                              <p className="text-lg font-bold text-foreground">
                                {quiz.totalAttempts}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase font-semibold">
                                Avg Score
                              </p>
                              <p className={`text-lg font-bold ${theme.text}`}>
                                {quiz.averageScore?.toFixed(1)}/{quiz.totalPoints}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase font-semibold">
                                Completion
                              </p>
                              <p className={`text-lg font-bold ${theme.text}`}>
                                {quiz.completionRate}%
                              </p>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${theme.progress}`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      quiz.completionRate || 0,
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase font-semibold">
                                Range
                              </p>
                              <p className="text-sm text-muted-foreground font-medium">
                                {quiz.lowestScore} - {quiz.highestScore}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-border/40">
                          <Button
                            size="sm"
                            className="flex items-center gap-1 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-primary transition-all"
                            onClick={() => navigate(`/lecturer/quiz/${quiz.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 hover:bg-muted/60"
                            onClick={() =>
                              navigate(`/lecturer/quiz/${quiz.id}/results`)
                            }
                          >
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Results
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 hover:bg-muted/60"
                            onClick={() => handleDuplicateQuiz(quiz)}
                          >
                            <Copy className="h-4 w-4 text-primary" />
                            Duplicate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 hover:bg-muted/60"
                            onClick={() =>
                              navigate(`/lecturer/quiz/${quiz.id}/edit`)
                            }
                          >
                            <Edit2 className="h-4 w-4 text-primary" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="relative inline-flex mb-5">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-teal/20 blur-2xl" />
                  <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-border/60 shadow-lg">
                    <BookOpen className="h-9 w-9 text-primary/60" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-2">
                  No quizzes found
                </h3>
                <p className="text-muted-foreground mb-7">
                  {searchQuery
                    ? "Try adjusting your search criteria"
                    : "Create your first quiz to get started"}
                </p>
                {!searchQuery && (
                  <Button
                    className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-primary"
                    onClick={() => navigate("/lecturer/quiz/create")}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Quiz
                  </Button>
                )}
              </motion.div>
            )}
          </section>
        </div>
      </main>

      <LecturerBottomNav />
    </div>
  );
}