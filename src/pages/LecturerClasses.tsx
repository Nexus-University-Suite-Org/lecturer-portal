import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  PlayCircle,
  Plus,
  Video,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Copy,
  Link as LinkIcon,
  Calendar,
  Pencil,
  Trash2,
  Ban,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend, putBackend, deleteBackend } from "@/lib/backendApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ClassSession {
  id: string;
  courseName?: string;
  courseUnitId?: number;
  title: string;
  scheduledAt: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  meetLink?: string;
  attendees: number;
  duration?: number;
  recordingUrl?: string;
  imageUrl?: string;
}

interface LiveSessionDoc {
  id: string;
  title: string;
  course_name?: string;
  course_unit_id?: number | null;
  scheduled_at: string;
  duration_minutes?: number | null;
  meet_link?: string | null;
  attendees?: number | null;
  status?: "scheduled" | "ongoing" | "completed" | "cancelled";
  recording_url?: string | null;
  image_url?: string | null;
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

function toDocs(data: any[]): LiveSessionDoc[] {
  return data.map((d: any) => ({
    id: d.id,
    title: d.title,
    course_name: d.course_name,
    course_unit_id: d.course_unit_id,
    scheduled_at: d.scheduled_at,
    duration_minutes: d.duration_minutes,
    meet_link: d.meet_link,
    attendees: d.attendees,
    status: d.status,
    image_url: d.image_url,
  }));
}

function mapSessions(data: LiveSessionDoc[]): ClassSession[] {
  const docs = [...data].sort((a, b) =>
    (a.scheduled_at || "").localeCompare(b.scheduled_at || ""),
  );
  const now = new Date();
  return docs.map((doc) => {
    const start = new Date(doc.scheduled_at);
    const duration = doc.duration_minutes ?? 60;
    const end = new Date(start.getTime() + duration * 60000);
    let status: ClassSession["status"] = "scheduled";

    if (doc.status && doc.status !== "scheduled") {
      status = doc.status;
    } else if (now >= start && now <= end) {
      status = "ongoing";
    } else if (now > end) {
      status = "completed";
    }

    return {
      id: doc.id,
      courseName: doc.course_name,
      courseUnitId: doc.course_unit_id ?? undefined,
      title: doc.title,
      scheduledAt: doc.scheduled_at,
      status,
      meetLink: doc.meet_link || undefined,
      attendees: doc.attendees ?? 0,
      duration: doc.duration_minutes ?? undefined,
      imageUrl: doc.image_url || undefined,
    };
  });
}

export default function LecturerClasses() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "scheduled" | "ongoing" | "completed" | "cancelled"
  >("all");
  const [isLoading, setIsLoading] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseUnitId, setNewCourseUnitId] = useState<number | null>(null);
  const [unitChoice, setUnitChoice] = useState<string>("none");
  const [courseUnits, setCourseUnits] = useState<
    { id: number; code: string; name: string }[]
  >([]);
  const [newDescription, setNewDescription] = useState("");
  const [newMeetLink, setNewMeetLink] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDuration, setNewDuration] = useState("60");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [isUploadingResource, setIsUploadingResource] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(
    null,
  );

  const fetchSessions = async (): Promise<ClassSession[]> => {
    const data = await getBackend<any[]>("/api/live-sessions/");
    return mapSessions(toDocs(data));
  };

  useEffect(() => {
    if (!user || profile?.role !== "lecturer") {
      setSessions([]);
      return;
    }

    getBackend<any[]>("/api/course-units/")
      .then((units) =>
        setCourseUnits(
          (units || []).map((u: any) => ({
            id: u.id,
            code: u.code,
            name: u.name,
          })),
        ),
      )
      .catch((error) =>
        console.error("Failed to load course units", error),
      );

    const loadSessions = async () => {
      try {
        setIsLoading(true);
        setSessions(await fetchSessions());
      } catch (error) {
        console.error("Failed to load live sessions", error);
        toast({
          title: "Could not load sessions",
          description: "Live classes will still work, please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, [user, toast]);

  const filteredSessions =
    filter === "all" ? sessions : sessions.filter((s) => s.status === filter);

  const stats = {
    scheduled: sessions.filter((s) => s.status === "scheduled").length,
    ongoing: sessions.filter((s) => s.status === "ongoing").length,
    completed: sessions.filter((s) => s.status === "completed").length,
    cancelled: sessions.filter((s) => s.status === "cancelled").length,
    totalAttendees: sessions.reduce((acc, s) => acc + s.attendees, 0),
  };

  const counts = {
    all: sessions.length,
    scheduled: stats.scheduled,
    ongoing: stats.ongoing,
    completed: stats.completed,
    cancelled: stats.cancelled,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500/15 text-blue-600 border-blue-400/40";
      case "ongoing":
        return "bg-emerald/15 text-emerald border-emerald/40 animate-pulse";
      case "completed":
        return "bg-muted/60 text-muted-foreground border-border/60";
      case "cancelled":
        return "bg-red-500/15 text-red-600 border-red-400/40";
      default:
        return "bg-muted/60 text-muted-foreground border-border/60";
    }
  };

  const getAccentBar = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-gradient-to-r from-blue-500 to-teal";
      case "ongoing":
        return "bg-gradient-to-r from-emerald to-teal-light animate-pulse";
      case "completed":
        return "bg-gradient-to-r from-lavender to-blue-400";
      case "cancelled":
        return "bg-gradient-to-r from-red-500 to-coral";
      default:
        return "bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return Clock;
      case "ongoing":
        return PlayCircle;
      case "completed":
        return CheckCircle;
      case "cancelled":
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Meeting link copied to clipboard.",
    });
  };

  const handleStartSession = (link: string) => {
    window.open(link, "_blank");
  };

  const handleOpenRecording = (url: string) => {
    window.open(url, "_blank");
  };

  const mediaUrl = (url?: string) => {
    if (!url) return undefined;
    return url.startsWith("http") ? url : `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8084"}${url}`;
  };

  const uploadResource = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8084"}/api/attachments/upload`,
      { method: "POST", body: formData },
    );
    if (!response.ok) {
      throw new Error("Upload failed");
    }
    const data = await response.json();
    return (data.url as string) || "";
  };

  const handleResourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setResourceFile(file);
    setNewImagePreview(file ? URL.createObjectURL(file) : null);
    setNewImageUrl("");
  };

  const resetNewSessionForm = () => {
    setEditingSession(null);
    setNewTitle("");
    setNewCourseName("");
    setNewCourseUnitId(null);
    setUnitChoice("none");
    setNewDescription("");
    setNewMeetLink("");
    setNewDate("");
    setNewTime("");
    setNewDuration("60");
    setResourceFile(null);
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setNewImagePreview(null);
    setNewImageUrl("");
    setIsUploadingResource(false);
    setIsSaving(false);
  };

  const handleNewSession = () => {
    if (!user || profile?.role !== "lecturer") {
      toast({
        title: "Sign in required",
        description: "Only lecturers can create online classes.",
        variant: "destructive",
      });
      return;
    }
    resetNewSessionForm();
    setShowNewSessionDialog(true);
  };

  const handleCourseUnitChoice = (choice: string) => {
    setUnitChoice(choice);
    if (choice === "custom") {
      return;
    }
    if (choice === "none") {
      setNewCourseUnitId(null);
      setNewCourseName("");
      return;
    }
    const unit = courseUnits.find((u) => String(u.id) === choice);
    if (unit) {
      setNewCourseUnitId(unit.id);
      setNewCourseName(`${unit.code} - ${unit.name}`);
    }
  };

  const handleEditSession = (session: ClassSession) => {
    const d = new Date(session.scheduledAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    let choice = "custom";
    if (session.courseUnitId != null) {
      const unit = courseUnits.find((u) => u.id === session.courseUnitId);
      if (unit) {
        choice = String(unit.id);
        setNewCourseName(`${unit.code} - ${unit.name}`);
      }
    } else if (session.courseName) {
      choice = "custom";
      setNewCourseName(session.courseName);
    } else {
      choice = "none";
      setNewCourseName("");
    }
    setUnitChoice(choice);
    setNewCourseUnitId(session.courseUnitId ?? null);
    setNewTitle(session.title);
    setNewDescription("");
    setNewMeetLink(session.meetLink || "");
    setNewDate(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    );
    setNewTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setNewDuration(String(session.duration ?? 60));
    setResourceFile(null);
    setNewImagePreview(null);
    setNewImageUrl(session.imageUrl || "");
    setEditingSession(session);
    setShowNewSessionDialog(true);
  };

  const handleCancelSession = async (session: ClassSession) => {
    if (
      !window.confirm(`Cancel "${session.title}"? Students will no longer see this class.`)
    ) {
      return;
    }
    try {
      setIsSaving(true);
      await putBackend(`/api/live-sessions/${session.id}`, {
        status: "cancelled",
      });
      toast({
        title: "Class cancelled",
        description: `"${session.title}" has been cancelled.`,
      });
      setSessions(await fetchSessions());
    } catch (error) {
      console.error("Failed to cancel live session", error);
      toast({
        title: "Could not cancel class",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSession = async (session: ClassSession) => {
    if (
      !window.confirm(`Delete "${session.title}"? This cannot be undone.`)
    ) {
      return;
    }
    try {
      setIsSaving(true);
      await deleteBackend(`/api/live-sessions/${session.id}`);
      toast({
        title: "Class deleted",
        description: `"${session.title}" was removed.`,
      });
      setSessions(await fetchSessions());
    } catch (error) {
      console.error("Failed to delete live session", error);
      toast({
        title: "Could not delete class",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSession = async () => {
    if (!user) return;
    if (!newTitle.trim() || !newDate || !newTime) {
      toast({
        title: "Missing details",
        description: "Please add a title, date and time for the class.",
        variant: "destructive",
      });
      return;
    }

    const scheduledAt = new Date(`${newDate}T${newTime}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      toast({
        title: "Invalid date or time",
        description: "Please check the scheduled date and time.",
        variant: "destructive",
      });
      return;
    }

    const durationMinutes = parseInt(newDuration || "60", 10) || 60;

    try {
      setIsSaving(true);

      let imageUrl = newImageUrl;
      if (resourceFile) {
        setIsUploadingResource(true);
        imageUrl = await uploadResource(resourceFile);
      }

      const payload: any = {
        course_unit_id: newCourseUnitId ?? null,
        title: newTitle.trim(),
        course_name: newCourseName.trim() || null,
        scheduled_at: `${newDate}T${newTime}:00`,
        duration_minutes: durationMinutes,
        meet_link: newMeetLink.trim() || null,
        image_url: imageUrl || null,
      };

      if (editingSession) {
        await putBackend(`/api/live-sessions/${editingSession.id}`, {
          ...payload,
          ...(editingSession.status === "cancelled"
            ? { status: "cancelled" }
            : {}),
        });
        toast({
          title: "Live class updated",
          description: "Your Google Meet session has been updated.",
        });
      } else {
        await postBackend<any>("/api/live-sessions/", payload);
        toast({
          title: "Live class scheduled",
          description:
            "Your Google Meet session is now scheduled for students.",
        });
      }

      setShowNewSessionDialog(false);
      resetNewSessionForm();
      setResourceFile(null);

      setSessions(await fetchSessions());
    } catch (error) {
      console.error("Failed to create live session", error);
      toast({
        title: "Could not schedule class",
        description:
          "Please try again. If the problem persists, contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setIsUploadingResource(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-lavender/10 blur-3xl" />
      </div>

      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl hero-gradient text-white p-5 sm:p-8 shadow-2xl">
            <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                    <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium uppercase tracking-widest text-white/70">
                    Virtual Classes
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-4xl text-white leading-tight">
                  {buildGreeting()}, {user?.email?.split("@")[0] || "Lecturer"}
                </h1>
                <p className="max-w-md text-xs sm:text-sm text-white/80 leading-relaxed">
                  Manage and conduct online class sessions with Google Meet.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] sm:text-xs text-white">
                    <Calendar className="h-3 w-3" />
                    {todayLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] sm:text-xs text-white">
                    <Video className="h-3 w-3" />
                    {sessions.length} sessions
                  </span>
                  {stats.ongoing > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-success px-3 py-1 text-[11px] sm:text-xs font-semibold text-white shadow-glow">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      {stats.ongoing} live now
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
                <Button
                  className="bg-gradient-amber text-navy gap-2 px-5 py-3 text-sm sm:text-base hover:shadow-glow font-semibold w-full lg:w-auto"
                  onClick={handleNewSession}
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> New Session
                </Button>
                <p className="hidden lg:block text-[11px] text-white/60 text-right">
                  Schedule a live Google Meet above
                </p>
              </div>
            </div>
          </section>

          {/* Stats Grid */}
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden border-blue-400/30 bg-gradient-to-b from-blue-500/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-teal" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Scheduled</p>
                      <p className="text-lg sm:text-2xl font-bold text-blue-600">
                        {stats.scheduled}
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 text-blue-500" />
                    upcoming sessions
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="overflow-hidden border-emerald/40 bg-gradient-to-b from-emerald/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-success" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Live Now</p>
                      <p className="text-lg sm:text-2xl font-bold text-emerald">
                        {stats.ongoing}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald/10 p-1.5 text-emerald">
                      <span className="relative flex h-4 w-4">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald/40 animate-ping" />
                        <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-background bg-emerald" />
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <PlayCircle className="h-3 w-3 text-emerald" />
                    happening right now
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="overflow-hidden border-lavender/40 bg-gradient-to-b from-lavender/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-to-r from-lavender to-blue-400" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-lg sm:text-2xl font-bold text-lavender">
                        {stats.completed}
                      </p>
                    </div>
                    <div className="rounded-lg bg-lavender/10 p-1.5 text-lavender">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-lavender" />
                    finished sessions
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="overflow-hidden border-primary/30 bg-gradient-to-b from-primary/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total Attendees
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-primary">
                        {stats.totalAttendees}
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <Users className="h-3 w-3 text-primary" />
                    across all sessions
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex gap-2 flex-wrap"
        >
          {(["all", "scheduled", "ongoing", "completed", "cancelled"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === tab
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-card/70 border border-border/60 text-foreground hover:bg-primary/5"
                }`}
              >
                {tab === "ongoing" && filter !== "ongoing" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
                )}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    filter === tab
                      ? "bg-white/20 text-white"
                      : "bg-muted/80 text-muted-foreground"
                  }`}
                >
                  {counts[tab]}
                </span>
              </button>
            ),
          )}
        </motion.div>

        {/* Sessions Grid */}
        <div className="space-y-3">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-3"
            >
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 animate-pulse" />
                <Video className="h-6 w-6 text-primary absolute inset-0 m-auto animate-pulse" />
              </div>
              Loading your virtual classes...
            </motion.div>
          ) : filteredSessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 rounded-3xl border border-dashed border-border/60 bg-card/50 backdrop-blur-lg"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Video className="h-8 w-8 text-primary/60" />
              </div>
              <p className="font-semibold text-foreground">No sessions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a new virtual class to get started.
              </p>
              <Button
                onClick={handleNewSession}
                className="mt-4 bg-gradient-amber text-navy hover:shadow-glow font-semibold"
              >
                <Plus className="h-4 w-4 mr-1" /> New Session
              </Button>
            </motion.div>
          ) : (
            filteredSessions.map((session, i) => {
              const StatusIcon = getStatusIcon(session.status);
              return (
                <motion.div
                  key={session.id}
                  variants={rise}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                >
                  <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-lg hover:shadow-lg transition-shadow hover:border-primary/20">
                    <div className={`h-1 w-full ${getAccentBar(session.status)}`} />
                    <CardContent className="pt-5">
                      <div className="grid gap-4 lg:grid-cols-4 lg:items-center">
                        <div className="lg:col-span-2">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div
                              className={`p-2.5 rounded-xl border ${getStatusColor(
                                session.status,
                              )}`}
                            >
                              <StatusIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate text-sm sm:text-base">
                                {session.title}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {session.courseName || "Online class"}
                              </p>
                              <div className="flex gap-2 mt-3 flex-wrap">
                                <Badge variant="outline" className="text-[11px] sm:text-xs border-border/60 bg-muted/30">
                                  <Calendar className="h-3 w-3 mr-1 inline" />
                                  {new Date(
                                    session.scheduledAt,
                                  ).toLocaleString()}
                                </Badge>
                                <Badge variant="outline" className="text-[11px] sm:text-xs border-border/60 bg-muted/30">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {session.duration
                                    ? `${session.duration} min`
                                    : "60 min"}
                                </Badge>
                                <Badge variant="outline" className="text-[11px] sm:text-xs border-border/60 bg-muted/30">
                                  <Users className="h-3 w-3 mr-1" />
                                  {session.attendees} attendees
                                </Badge>
                              </div>
                              {session.imageUrl && (
                                <img
                                  src={mediaUrl(session.imageUrl)}
                                  alt={session.title}
                                  className="mt-3 rounded-xl border border-border/60 h-32 w-full object-cover"
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-1 flex items-center gap-2 flex-wrap lg:justify-start">
                          <Badge className={getStatusColor(session.status)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {session.status.charAt(0).toUpperCase() +
                              session.status.slice(1)}
                          </Badge>
                        </div>

                        <div className="lg:col-span-1 flex gap-2 justify-end flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Edit class"
                            className="border-border/60"
                            onClick={() => handleEditSession(session)}
                            disabled={isSaving}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {session.status === "ongoing" && (
                            <Button
                              size="sm"
                              className="bg-gradient-success text-white hover:shadow-glow"
                              onClick={() =>
                                session.meetLink &&
                                window.open(session.meetLink, "_blank")
                              }
                            >
                              <PlayCircle className="h-4 w-4 mr-1" /> Join Now
                            </Button>
                          )}
                          {(session.status === "scheduled" ||
                            session.status === "ongoing") && (
                            <Button
                              size="sm"
                              variant="outline"
                              title="Cancel class"
                              className="text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleCancelSession(session)}
                              disabled={isSaving}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          {session.status === "scheduled" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Copy meet link"
                                className="border-border/60"
                                onClick={() =>
                                  session.meetLink &&
                                  handleCopyLink(session.meetLink)
                                }
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-glow"
                                onClick={() =>
                                  session.meetLink &&
                                  handleStartSession(session.meetLink)
                                }
                              >
                                <PlayCircle className="h-4 w-4 mr-1" /> Start
                              </Button>
                            </>
                          )}
                          {session.status === "completed" &&
                            session.recordingUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-border/60"
                                onClick={() =>
                                  handleOpenRecording(session.recordingUrl!)
                                }
                              >
                                <Download className="h-4 w-4 mr-1" /> Recording
                              </Button>
                            )}
                          <Button
                            size="sm"
                            variant="outline"
                            title="Delete class"
                            className="text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteSession(session)}
                            disabled={isSaving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </main>

      {/* New Live Session Dialog */}
      <Dialog
        open={showNewSessionDialog}
        onOpenChange={setShowNewSessionDialog}
      >
        <DialogContent className="sm:max-w-lg w-[calc(100%-1rem)] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSession ? "Edit Google Meet Class" : "Schedule Google Meet Class"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g., Algorithms – Sorting Live Class"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Course Unit (optional)
              </label>
              <p className="text-xs text-muted-foreground">
                Students enrolled in this course unit get notified when the
                class starts.
              </p>
              <select
                value={unitChoice}
                onChange={(e) => handleCourseUnitChoice(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="none">General class (no course unit)</option>
                {courseUnits.map((unit) => (
                  <option key={unit.id} value={String(unit.id)}>
                    {unit.code} - {unit.name}
                  </option>
                ))}
                <option value="custom">Other / custom class name...</option>
              </select>
              {unitChoice === "custom" && (
                <Input
                  placeholder="e.g., CS101 - Algorithms"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Duration (minutes, optional)
              </label>
              <Input
                type="number"
                min={10}
                max={300}
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 flex-wrap">
                Google Meet Link
                <span className="text-xs text-muted-foreground">
                  (paste the Meet URL here)
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={newMeetLink}
                  onChange={(e) => setNewMeetLink(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-1 w-full sm:w-auto"
                  onClick={() =>
                    window.open("https://meet.google.com/new", "_blank")
                  }
                >
                  <LinkIcon className="h-4 w-4" />
                  Meet
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Description / Notes (optional)
              </label>
              <Textarea
                rows={3}
                placeholder="Any instructions for students about this online class."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Upload Resource / Image (optional)
              </label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*"
                onChange={handleResourceChange}
              />
              {isUploadingResource && (
                <p className="text-xs text-muted-foreground">
                  Uploading image, please wait…
                </p>
              )}
              {(newImagePreview || newImageUrl) && (
                <div className="mt-2">
                  <img
                    src={newImagePreview || mediaUrl(newImageUrl)}
                    alt="Class preview"
                    className="rounded-xl border border-border/60 h-40 w-full object-cover"
                  />
                  {newImagePreview && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Preview of{" "}
                      {resourceFile ? resourceFile.name : "selected file"} — will
                      upload when you save.
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Attach a slides, notes, or an image for this online class.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowNewSessionDialog(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-gradient-to-r from-primary to-secondary"
                onClick={handleCreateSession}
                disabled={isSaving || isUploadingResource}
              >
                {isSaving || isUploadingResource
                  ? "Saving..."
                  : editingSession
                    ? "Save Changes"
                    : "Schedule Class"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LecturerBottomNav />
    </div>
  );
}
