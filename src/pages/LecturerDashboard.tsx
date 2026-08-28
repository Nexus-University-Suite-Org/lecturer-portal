import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Flame,
  GraduationCap,
  Layers,
  Mail,
  MessageCircle,
  PlayCircle,
  Sparkles,
  Target,
  Users,
  BookOpen,
  Calculator,
  Users2,
  Clock,
  TrendingUp,
  AlertCircle,
  Award,
  Brain,
  Zap,
  Eye,
  Heart,
} from "lucide-react";
import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend } from "@/lib/backendApi";

type ScheduleItem = {
  time: string;
  title: string;
  type: string;
  room: string;
  mode: string;
};

type GradingQueueItem = {
  course: string;
  items: number;
  due: string;
  progress: number;
};

type AnnouncementItem = {
  title: string;
  audience: string;
  when: string;
};

type EngagementItem = {
  label: string;
  value: number;
};

type MessageItem = {
  from: string;
  text: string;
  time: string;
};

type InsightItem = {
  title: string;
  value: string;
  trend: string;
  icon: any;
  color: string;
};

const rise = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

export default function LecturerDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.full_name || user?.displayName || "Lecturer";
  const firstName = displayName.split(" ")[0];

  const [stats, setStats] = useState({
    courses: 0,
    students: 0,
    pendingMarks: 0,
    submissions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [gradingQueue, setGradingQueue] = useState<GradingQueueItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [engagement, setEngagement] = useState<EngagementItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const lecturerUid = user?.uid;
      if (!lecturerUid) return;

      const data = await getBackend<any>(
        `/api/lecturer/summary/?lecturer_id=${encodeURIComponent(lecturerUid)}`,
      );

      setStats({
        courses: data.assignments_count ?? 0,
        students: data.announcements_count ?? 0,
        pendingMarks: data.quizzes_count ?? 0,
        submissions: (data.messages_received ?? 0) + (data.messages_sent ?? 0),
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats({
        courses: 0,
        students: 0,
        pendingMarks: 0,
        submissions: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const quickStats = useMemo(
    () => [
      {
        label: "Courses",
        value: stats.courses,
        hint: "Teaching this semester",
        icon: Layers,
      },
      {
        label: "Students",
        value: stats.students,
        hint: "Across all courses",
        icon: Users2,
      },
      {
        label: "Pending marks",
        value: stats.pendingMarks,
        hint: "Need final exam grades",
        icon: Target,
      },
      {
        label: "Submissions",
        value: stats.submissions,
        hint: "This week",
        icon: CheckCircle2,
      },
    ],
    [stats],
  );

  useEffect(() => {
    if (!user?.uid) return;

    const formatRelativeTime = (value: any) => {
      const rawDate = value?.toDate?.() ?? (value ? new Date(value) : null);
      if (!(rawDate instanceof Date) || Number.isNaN(rawDate.getTime())) {
        return "Recently";
      }

      const diffMs = Date.now() - rawDate.getTime();
      const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.round(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays}d ago`;
    };

    const formatDueLabel = (value: any) => {
      const rawDate = value?.toDate?.() ?? (value ? new Date(value) : null);
      if (!(rawDate instanceof Date) || Number.isNaN(rawDate.getTime())) {
        return "No due date";
      }

      const now = new Date();
      const diffDays = Math.round(
        (rawDate.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / 86400000,
      );
      if (diffDays <= 0) return "Today";
      if (diffDays === 1) return "Tomorrow";
      return `In ${diffDays} days`;
    };

    const loadWidgets = async () => {
      try {
        let profileData: any = {};
        try {
          profileData = await getBackend<any>("/api/profiles/by-user/" + user.uid + "/");
        } catch (e) {
          // profile not found
        }

        let courseIds: string[] = (
          profileData.assigned_course_units || []
        ).filter(Boolean);
        if (courseIds.length === 0) {
          const coursesData = await getBackend<any[]>("/api/courses/");
          courseIds = coursesData.map((c: any) => c.id);
        }

        courseIds = Array.from(new Set(courseIds));

        const courseMap = new Map<string, any>();
        const courseUnitsData = await getBackend<any[]>("/api/course-units/");
        courseUnitsData.forEach((unit: any) => {
          courseMap.set(unit.id, unit);
        });
        const coursesDataAll = await getBackend<any[]>("/api/courses/");
        coursesDataAll.forEach((c: any) => {
          if (!courseMap.has(c.id)) {
            courseMap.set(c.id, c);
          }
        });

        const sessions: any[] = [];
        const announcementDocs: any[] = [];
        const submissionsByCourse = new Map<
          string,
          { total: number; graded: number; due?: any }
        >();
        const sessionsData = await getBackend<any[]>("/api/live-sessions/");
        sessionsData.forEach((s: any) => sessions.push(s));

        const announcementsData = await getBackend<any[]>("/api/announcements/");
        announcementsData.forEach((a: any) => announcementDocs.push(a));

        const assignmentsData = await getBackend<any[]>("/api/assignments/");
        const assignmentDocs = assignmentsData as any[];

        const submissionsData = await getBackend<any[]>("/api/submissions/");
        submissionsData.forEach((submission: any) => {
          const assignment = assignmentDocs.find(
            (item) => item.id === submission.assignment_id,
          );
          if (!assignment?.course_id) return;
          const current = submissionsByCourse.get(assignment.course_id) || {
            total: 0,
            graded: 0,
            due: assignment.due_date,
          };
          current.total += 1;
          if (
            submission.grade != null ||
            submission.score != null ||
            submission.status === "graded"
          ) {
            current.graded += 1;
          }
          current.due = assignment.due_date || current.due;
          submissionsByCourse.set(assignment.course_id, current);
        });

        const nextSchedule = sessions
          .sort((a, b) => {
            const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
            const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
            return aTime - bTime;
          })
          .slice(0, 5)
          .map((session) => {
            const course = courseMap.get(session.classroom_id) || {};
            const startDate = session.start_time ? new Date(session.start_time) : null;
            return {
              time: startDate
                ? startDate.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                : "TBA",
              title:
                course.name || course.title || session.title || "Class Session",
              type: session.title || session.session_type || "Session",
              room: session.meeting_link
                ? "Online"
                : course.room || course.location || "TBA",
              mode: session.status === "live" ? "Live" : "Scheduled",
            };
          });

        const nextGradingQueue = Array.from(submissionsByCourse.entries())
          .map(([courseId, value]) => {
            const course = courseMap.get(courseId) || {};
            const progress = value.total
              ? Math.round((value.graded / value.total) * 100)
              : 0;
            return {
              course: course.name || course.title || "Course",
              items: Math.max(0, value.total - value.graded),
              due: formatDueLabel(value.due),
              progress,
            };
          })
          .filter((item) => item.items > 0)
          .sort((a, b) => b.items - a.items)
          .slice(0, 5);

        const nextAnnouncements = announcementDocs
          .sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 5)
          .map((announcement) => {
            const course = courseMap.get(announcement.course_id) || {};
            return {
              title:
                announcement.title || announcement.content || "Announcement",
              audience: course.name || course.title || "Course cohort",
              when: formatRelativeTime(announcement.created_at),
            };
          });

        const attendanceRate = 0;
        const assignmentRate = nextGradingQueue.length
          ? Math.max(
              0,
              100 -
                Math.round(
                  nextGradingQueue.reduce((sum, item) => sum + item.items, 0) /
                    nextGradingQueue.length,
                ),
            )
          : 0;
        const liveRate = nextSchedule.length
          ? Math.round(
              (nextSchedule.filter((item) => item.mode === "Live").length /
                nextSchedule.length) *
                100,
            )
          : 0;
        const announcementRate = nextAnnouncements.length
          ? Math.min(100, nextAnnouncements.length * 20)
          : 0;

        const nextEngagement = [
          { label: "Attendance", value: attendanceRate },
          { label: "Assignments", value: assignmentRate },
          { label: "Live participation", value: liveRate },
          { label: "Announcements", value: announcementRate },
        ];

        const messagesData = await getBackend<any[]>("/api/messages/" + user.uid + "/");
        const nextMessages = messagesData
          .sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
          })
          .map((message) => ({
            from: message.sender_name || message.from_name || "Message",
            text: message.content || message.text || "New message received",
            time: formatRelativeTime(message.created_at),
          }));

        const nextInsights = [
          {
            title: "Attendance stability",
            value: `${attendanceRate}%`,
            trend: `${attendanceRate >= 70 ? "+" : ""}${attendanceRate}% current`,
            icon: Users,
            color: "emerald",
          },
          {
            title: "Assignment on-time",
            value: `${assignmentRate}%`,
            trend: `${nextGradingQueue.length} active queues`,
            icon: CheckCircle2,
            color: "blue",
          },
          {
            title: "Live join rate",
            value: `${liveRate}%`,
            trend: `${nextSchedule.filter((item) => item.mode === "Live").length} live sessions`,
            icon: PlayCircle,
            color: "cyan",
          },
          {
            title: "Feedback response",
            value: `${announcementRate}%`,
            trend: `${nextAnnouncements.length} recent posts`,
            icon: MessageCircle,
            color: "pink",
          },
        ];

        setSchedule(nextSchedule);
        setGradingQueue(nextGradingQueue);
        setAnnouncements(nextAnnouncements);
        setEngagement(nextEngagement);
        setMessages(nextMessages);
        setInsights(nextInsights);
      } catch (error) {
        console.error("Error loading lecturer dashboard widgets:", error);
        setSchedule([]);
        setGradingQueue([]);
        setAnnouncements([]);
        setEngagement([]);
        setMessages([]);
        setInsights([]);
      }
    };

    loadWidgets();
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 text-foreground">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/10 blur-3xl rounded-full opacity-60" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-gradient-to-bl from-secondary/15 via-primary/10 to-transparent blur-3xl rounded-full opacity-40" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-tr from-accent/10 to-transparent blur-3xl rounded-full opacity-50" />
      </div>

      <main className="px-4 pb-28 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto pt-6 lg:pt-10">
          {/* Hero Section with Enhanced Design */}
          <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/80 to-card/60 backdrop-blur-xl p-8 sm:p-12 shadow-2xl mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/10 pointer-events-none rounded-3xl" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/25 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-secondary/20 to-transparent rounded-full blur-3xl translate-y-1/4 -translate-x-1/4" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-4 flex-1">
                <div className="inline-block">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80 font-bold bg-gradient-to-r from-primary/15 to-secondary/10 px-4 py-1.5 rounded-full border border-primary/30"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Lecturer workspace
                  </motion.div>
                </div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl sm:text-5xl font-display font-bold flex items-center gap-3 text-foreground"
                >
                  Welcome back, {firstName}
                  <motion.div
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                  >
                    <Sparkles className="h-8 w-8 text-primary" />
                  </motion.div>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-base text-muted-foreground max-w-2xl leading-relaxed"
                >
                  Manage your courses, track student progress, conduct live
                  sessions, analyze performance trends, and stay connected with
                  your cohorts—all in one powerful dashboard.
                </motion.p>
              </div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <Button
                  variant="outline"
                  className="border-border/60 hover:bg-muted/50 gap-2 transition-all hover:shadow-lg"
                  onClick={() => navigate("/lecturer/messages")}
                >
                  <Mail className="h-4 w-4" /> Messages
                </Button>
                <Button
                  className="bg-gradient-to-r from-primary via-primary/90 to-secondary text-primary-foreground border-0 shadow-xl shadow-primary/40 hover:shadow-primary/60 gap-2 transition-all"
                  onClick={() => navigate("/lecturer/courses")}
                >
                  <BookOpen className="h-4 w-4" /> My Courses
                </Button>
              </motion.div>
            </div>
          </section>

          {/* Main Stats Grid */}
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickStats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                variants={rise}
                initial="hidden"
                animate="visible"
                custom={idx}
                className="group"
              >
                <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                    <CardTitle className="text-sm text-muted-foreground font-semibold">
                      {stat.label}
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <stat.icon className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-3xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      {stat.hint}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </section>

          <section className="mt-8 grid gap-4 xl:grid-cols-3">
            <motion.div
              variants={rise}
              initial="hidden"
              animate="visible"
              custom={1}
              className="space-y-4 xl:col-span-2"
            >
              {/* Today's Schedule Card */}
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="flex items-center justify-between relative">
                  <div>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Today's schedule
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Live sessions, labs, and seminars
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-primary/30"
                  >
                    <Zap className="h-3 w-3 mr-1" /> Focus mode
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {schedule.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No sessions scheduled yet.
                    </p>
                  )}

                  {schedule.map((item, idx) => (
                    <motion.div
                      key={item.time}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center justify-between rounded-2xl border border-border/60 bg-gradient-to-r from-muted/30 to-muted/10 px-4 py-3 hover:bg-muted/40 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center font-bold text-sm group-hover:shadow-lg transition-shadow">
                          {item.time}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.type} • {item.room}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-primary/40 text-primary bg-primary/5"
                      >
                        {item.mode}
                      </Badge>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {/* Grading Queue Card */}
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-amber/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="flex items-center justify-between relative">
                  <div>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <Target className="h-5 w-5 text-amber-500" />
                      Grading queue
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      What needs your attention now
                    </p>
                  </div>
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200/60">
                    <Flame className="h-3 w-3 mr-1" /> Auto-save on
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {gradingQueue.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No submissions waiting for grading.
                    </p>
                  )}

                  {gradingQueue.map((item, idx) => (
                    <motion.div
                      key={item.course}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="rounded-2xl border border-border/60 bg-gradient-to-r from-muted/30 to-muted/10 p-4 hover:shadow-lg transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.course}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.items} submissions • Due {item.due}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-primary/30"
                        >
                          {item.progress}% reviewed
                        </Badge>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-border/50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 1, delay: idx * 0.2 }}
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                        />
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Right Side Widgets */}
            <motion.div
              variants={rise}
              initial="hidden"
              animate="visible"
              custom={2}
              className="space-y-4"
            >
              {/* Announcements */}
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-blue-500" />
                      Announcements
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Push to cohorts instantly
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-primary/30 hover:bg-primary/30"
                  >
                    <Mail className="mr-2 h-4 w-4" /> New
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {announcements.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No announcements posted yet.
                    </p>
                  )}

                  {announcements.map((item, idx) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-3 hover:bg-muted/50 transition-colors group cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.audience}
                        </p>
                      </div>
                      <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                        {item.when}
                      </span>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {/* Engagement Pulse */}
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="flex items-center justify-between">
                  <CardTitle className="text-lg text-foreground flex items-center gap-2">
                    <Heart className="h-5 w-5 text-rose-500" />
                    Engagement pulse
                  </CardTitle>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Flame className="h-4 w-4 text-amber-500" />
                  </motion.div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {engagement.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Engagement metrics will appear when attendance and
                      submissions are recorded.
                    </p>
                  )}

                  {engagement.map((item, idx) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="font-bold text-primary">
                          {item.value}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-border/50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1.5, delay: idx * 0.2 }}
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                        />
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </section>

          {/* Insights Section */}
          <section className="mt-8 grid gap-4 lg:grid-cols-3">
            <motion.div
              variants={rise}
              initial="hidden"
              animate="visible"
              custom={3}
              className="space-y-4 lg:col-span-2"
            >
              {/* Cohort Insights */}
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="flex items-center justify-between relative">
                  <div>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      Cohort insights
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Health of your classes at a glance
                    </p>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-100 border-purple-300/30">
                    <Eye className="h-3 w-3 mr-1" />
                    Real-time
                  </Badge>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {insights.length === 0 && (
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      Cohort insights will appear once course activity is
                      recorded.
                    </p>
                  )}

                  {insights.map((item, idx) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`rounded-2xl border border-border/60 bg-gradient-to-br from-${item.color}-500/5 to-transparent p-4 hover:shadow-lg transition-all cursor-pointer group`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            {item.title}
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            {item.value}
                          </p>
                          <p className="text-xs text-primary font-semibold">
                            {item.trend}
                          </p>
                        </div>
                        <div
                          className={`h-12 w-12 rounded-xl bg-${item.color}-500/20 text-${item.color}-600 flex items-center justify-center group-hover:scale-110 transition-transform`}
                        >
                          <item.icon className="h-6 w-6" />
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-border/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r from-${item.color}-500 to-${item.color}-400`}
                          style={{ width: `${parseInt(item.value)}%` }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {/* Inbox/Messages */}
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-500" />
                      Inbox
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Latest communications across courses
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-primary/30"
                  >
                    Real-time
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No recent messages.
                    </p>
                  )}

                  {messages.map((item, idx) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-3 hover:bg-muted/50 transition-colors group cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.from}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.text}
                        </p>
                      </div>
                      <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded whitespace-nowrap ml-2">
                        {item.time}
                      </span>
                    </motion.div>
                  ))}
                  <Button
                    variant="secondary"
                    className="w-full bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-primary/30 hover:bg-primary/30"
                  >
                    View all messages
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right Column - Quick Actions & Course Signals */}
            <motion.div
              variants={rise}
              initial="hidden"
              animate="visible"
              custom={4}
              className="space-y-4"
            >
              {/* Quick Actions */}
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Quick actions
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Launch the things you do most
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {[
                    {
                      label: "My Courses",
                      icon: BookOpen,
                      action: () => navigate("/lecturer/courses"),
                      color: "blue",
                    },
                    {
                      label: "Grade Book",
                      icon: BarChart3,
                      action: () => navigate("/lecturer/gradebook"),
                      color: "emerald",
                    },
                    {
                      label: "Assignments",
                      icon: Target,
                      action: () => navigate("/lecturer/assignments"),
                      color: "purple",
                    },
                    {
                      label: "Classes",
                      icon: PlayCircle,
                      action: () => navigate("/lecturer/classes"),
                      color: "cyan",
                    },
                    {
                      label: "Messages",
                      icon: Mail,
                      action: () => navigate("/lecturer/messages"),
                      color: "pink",
                    },
                    {
                      label: "Attendance",
                      icon: Users2,
                      action: () => navigate("/lecturer/attendance"),
                      color: "amber",
                    },
                  ].map((action, idx) => (
                    <motion.div
                      key={action.label}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Button
                        variant="secondary"
                        className="justify-start w-full bg-gradient-to-r from-muted/60 to-muted/30 text-foreground border-border/60 hover:bg-muted hover:shadow-md transition-all group"
                        onClick={action.action}
                      >
                        <action.icon className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
                        {action.label}
                      </Button>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {/* Course Signals */}
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      Course signals
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Where to lean in this week
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { title: "Algorithms", status: "Stable", tag: "emerald" },
                    {
                      title: "Systems Design",
                      status: "Needs support",
                      tag: "amber",
                    },
                    { title: "Data Mining", status: "At risk", tag: "rose" },
                  ].map((course, idx) => (
                    <motion.div
                      key={course.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="rounded-xl border border-border/60 bg-muted/30 p-3 hover:shadow-lg transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {course.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold border-${course.tag}-300/40 text-${course.tag}-600 bg-${course.tag}-500/10`}
                        >
                          {course.status}
                        </Badge>
                      </div>
                      <div className="h-2 rounded-full bg-border/50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width:
                              course.tag === "emerald"
                                ? "82%"
                                : course.tag === "amber"
                                  ? "64%"
                                  : "42%",
                          }}
                          transition={{ duration: 1, delay: idx * 0.2 }}
                          className={`h-full rounded-full bg-${course.tag}-500`}
                        />
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {/* Performance Summary */}
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <Award className="h-5 w-5 text-gold-500" />
                      Workload summary
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your time allocation
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Teaching", value: "73%", icon: BookOpen },
                    { label: "Research", value: "46%", icon: Brain },
                    { label: "Admin", value: "32%", icon: Calculator },
                    { label: "Support", value: "58%", icon: Heart },
                  ].map((item, idx) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="rounded-xl border border-border/60 bg-muted/30 p-3 hover:shadow-lg transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground font-semibold">
                          {item.label}
                        </p>
                        <item.icon className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {item.value}
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-border/50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: item.value }}
                          transition={{ duration: 1.5, delay: idx * 0.2 }}
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                        />
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </section>
        </div>
      </main>

      <LecturerBottomNav />
    </div>
  );
}
