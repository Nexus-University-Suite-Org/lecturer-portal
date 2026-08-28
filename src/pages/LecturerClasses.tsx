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
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend } from "@/lib/backendApi";
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
  title: string;
  scheduledAt: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  meetLink?: string;
  attendees: number;
  duration?: number;
  recordingUrl?: string;
}

interface LiveSessionDoc {
  id: string;
  title: string;
  course_name?: string;
  scheduled_at: string;
  duration_minutes?: number | null;
  meet_link?: string | null;
  attendees?: number | null;
  status?: "scheduled" | "ongoing" | "completed" | "cancelled";
  recording_url?: string | null;
}
const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

export default function LecturerClasses() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "scheduled" | "ongoing" | "completed"
  >("all");
  const [isLoading, setIsLoading] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMeetLink, setNewMeetLink] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDuration, setNewDuration] = useState("60");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [isUploadingResource, setIsUploadingResource] = useState(false);

  useEffect(() => {
    if (!user || profile?.role !== "lecturer") {
      setSessions([]);
      return;
    }

    const loadSessions = async () => {
      try {
        setIsLoading(true);
        const data = await getBackend<any[]>("/api/live-sessions/");

        const docs: LiveSessionDoc[] = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          course_name: d.course_name,
          scheduled_at: d.scheduled_at,
          duration_minutes: d.duration_minutes,
          meet_link: d.meet_link,
          attendees: d.attendees,
          status: d.status,
        }));

        docs.sort((a, b) =>
          (a.scheduled_at || "").localeCompare(b.scheduled_at || ""),
        );

        const now = new Date();
        const mapped: ClassSession[] = docs.map((doc) => {
          const start = new Date(doc.scheduled_at);
          const duration = doc.duration_minutes ?? 60;
          const end = new Date(start.getTime() + duration * 60000);
          let status: ClassSession["status"] = "scheduled";

          if (doc.status) {
            status = doc.status;
          } else if (now >= start && now <= end) {
            status = "ongoing";
          } else if (now > end) {
            status = "completed";
          }

          return {
            id: doc.id,
            courseName: doc.course_name,
            title: doc.title,
            scheduledAt: doc.scheduled_at,
            status,
            meetLink: doc.meet_link || undefined,
            attendees: doc.attendees ?? 0,
            duration: doc.duration_minutes ?? undefined,
          };
        });

        setSessions(mapped);
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
    totalAttendees: sessions.reduce((acc, s) => acc + s.attendees, 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500/20 text-blue-700 border-blue-300/30";
      case "ongoing":
        return "bg-emerald-500/20 text-emerald-700 border-emerald-300/30 animate-pulse";
      case "completed":
        return "bg-muted/60 text-muted-foreground border-border/60";
      case "cancelled":
        return "bg-red-500/20 text-red-700 border-red-300/30";
      default:
        return "bg-muted/60";
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

  const resetNewSessionForm = () => {
    setNewTitle("");
    setNewCourseName("");
    setNewDescription("");
    setNewMeetLink("");
    setNewDate("");
    setNewTime("");
    setNewDuration("60");
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

      const payload: any = {
        course_id: newCourseName.trim() || "general",
        title: newTitle.trim(),
        course_name: newCourseName.trim() || null,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: durationMinutes,
        meet_link: newMeetLink.trim() || null,
      };

      const created = await postBackend<any>("/api/live-sessions/", payload);

      toast({
        title: "Live class scheduled",
        description:
          "Your Google Meet session is now scheduled for students.",
      });

      setShowNewSessionDialog(false);
      resetNewSessionForm();
      setResourceFile(null);

      // Refresh list
      const data = await getBackend<any[]>("/api/live-sessions/");
      const docs: LiveSessionDoc[] = data.map((d: any) => ({
        id: d.id,
        title: d.title,
        course_name: d.course_name,
        scheduled_at: d.scheduled_at,
        duration_minutes: d.duration_minutes,
        meet_link: d.meet_link,
        attendees: d.attendees,
        status: d.status,
      }));
      docs.sort((a, b) =>
        (a.scheduled_at || "").localeCompare(b.scheduled_at || ""),
      );
      const now = new Date();
      const mapped: ClassSession[] = docs.map((doc) => {
        const start = new Date(doc.scheduled_at);
        const duration = doc.duration_minutes ?? 60;
        const end = new Date(start.getTime() + duration * 60000);
        let status: ClassSession["status"] = "scheduled";

        if (doc.status) {
          status = doc.status;
        } else if (now >= start && now <= end) {
          status = "ongoing";
        } else if (now > end) {
          status = "completed";
        }

        return {
          id: doc.id,
          courseName: doc.course_name,
          title: doc.title,
          scheduledAt: doc.scheduled_at,
          status,
          meetLink: doc.meet_link || undefined,
          attendees: doc.attendees ?? 0,
          duration: doc.duration_minutes ?? undefined,
        };
      });
      setSessions(mapped);
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
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">


      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Virtual Classes</h1>
                <p className="text-sm text-muted-foreground">
                  Manage and conduct online class sessions
                </p>
              </div>
            </div>
            <Button
              className="bg-gradient-to-r from-primary to-secondary gap-2"
              onClick={handleNewSession}
            >
              <Plus className="h-4 w-4" /> New Session
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-blue-500/10 border-blue-300/30">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {stats.scheduled}
                      </p>
                    </div>
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-emerald-500/10 border-emerald-300/30">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Live Now</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {stats.ongoing}
                      </p>
                    </div>
                    <PlayCircle className="h-5 w-5 text-emerald-600 animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-purple-500/10 border-purple-300/30">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-purple-700">
                        {stats.completed}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Attendees
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {stats.totalAttendees}
                      </p>
                    </div>
                    <Users className="h-5 w-5 text-primary" />
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
          {(["all", "scheduled", "ongoing", "completed"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground hover:bg-muted"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              className="text-center py-12 text-muted-foreground text-sm"
            >
              Loading your virtual classes...
            </motion.div>
          ) : filteredSessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Video className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No sessions found</p>
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
                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="grid gap-4 lg:grid-cols-4 lg:items-center">
                        <div className="lg:col-span-2">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg ${getStatusColor(
                                session.status,
                              )}`}
                            >
                              <StatusIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {session.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {session.courseName || "Online class"}
                              </p>
                              <div className="flex gap-2 mt-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  <Calendar className="h-3 w-3 mr-1 inline" />
                                  {new Date(
                                    session.scheduledAt,
                                  ).toLocaleString()}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {session.attendees} attendees
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-1 flex items-center justify-between lg:justify-start gap-3">
                          <Badge className={getStatusColor(session.status)}>
                            {session.status.charAt(0).toUpperCase() +
                              session.status.slice(1)}
                          </Badge>
                          {session.duration && (
                            <Badge variant="outline" className="text-xs">
                              {session.duration}m
                            </Badge>
                          )}
                        </div>

                        <div className="lg:col-span-1 flex gap-2 justify-end">
                          {session.status === "ongoing" && (
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-emerald-600 to-emerald-700"
                              onClick={() =>
                                session.meetLink &&
                                window.open(session.meetLink, "_blank")
                              }
                            >
                              <PlayCircle className="h-4 w-4 mr-1" /> Join Now
                            </Button>
                          )}
                          {session.status === "scheduled" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  session.meetLink &&
                                  handleCopyLink(session.meetLink)
                                }
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-primary to-secondary"
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
                                onClick={() =>
                                  handleOpenRecording(session.recordingUrl!)
                                }
                              >
                                <Download className="h-4 w-4 mr-1" /> Recording
                              </Button>
                            )}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Google Meet Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                Course / Class Name (optional)
              </label>
              <Input
                placeholder="e.g., CS101 – Algorithms"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
              />
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
              <label className="text-sm font-medium flex items-center gap-2">
                Google Meet Link
                <span className="text-xs text-muted-foreground">
                  (paste the Meet URL here)
                </span>
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={newMeetLink}
                  onChange={(e) => setNewMeetLink(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-1"
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
                Upload Resource (optional)
              </label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*"
                onChange={(e) => setResourceFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Attach slides, notes, or any document for this online class.
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
