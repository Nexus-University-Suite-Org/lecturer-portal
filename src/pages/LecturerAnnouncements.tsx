import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Megaphone,
  Plus,
  Trash2,
  Eye,
  MessageSquare,
  Heart,
  Loader2,
  Calendar,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend, deleteBackend } from "@/lib/backendApi";

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  audience: string;
  views: number;
  likes: number;
  commentsCount: number;
  priority: "high" | "normal" | "low";
}

interface EngagementData {
  views: number;
  likes: number;
  comments_count: number;
  has_liked: boolean;
  comments: Array<{
    id: number;
    student_name: string;
    content: string;
    created_at: string;
  }>;
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

export default function LecturerAnnouncements() {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewEngagement, setViewEngagement] = useState<EngagementData | null>(
    null,
  );
  const [loadingEngagement, setLoadingEngagement] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    audience: "All Students",
    priority: "normal" as const,
    course_id: "",
  });

  useEffect(() => {
    if (!user) return;
    fetchAnnouncements();
  }, [user]);

  const fetchAnnouncements = async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      const data = await getBackend<any[]>(
        `/api/announcements/?author_id=${encodeURIComponent(user.uid)}`,
      );

      const transformed = data.map((ann) => ({
        id: ann.id,
        title: ann.title,
        content: ann.content,
        date: ann.created_at
          ? new Date(ann.created_at).toLocaleDateString()
          : new Date().toLocaleDateString(),
        audience: "All Students",
        views: 0,
        likes: 0,
        commentsCount: 0,
        priority: ann.priority || "normal",
      }));
      setAnnouncements(transformed);

      for (const ann of transformed) {
        try {
          const eng = await getBackend<EngagementData>(
            `/api/announcements/${ann.id}/engagement?role=lecturer`,
          );
          setAnnouncements((prev) =>
            prev.map((a) =>
              a.id === ann.id
                ? {
                    ...a,
                    views: eng.views,
                    likes: eng.likes,
                    commentsCount: eng.comments_count,
                  }
                : a,
            ),
          );
        } catch {
          // keep defaults
        }
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    totalAnnouncements: announcements.length,
    totalViews: announcements.reduce((acc, a) => acc + a.views, 0),
    totalLikes: announcements.reduce((acc, a) => acc + a.likes, 0),
    totalComments: announcements.reduce((acc, a) => acc + a.commentsCount, 0),
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/15 text-red-600 border-red-500/30";
      case "normal":
        return "bg-blue-500/15 text-blue-600 border-blue-500/30";
      case "low":
        return "bg-muted/60 text-muted-foreground border-border/60";
      default:
        return "bg-muted/60 text-muted-foreground border-border/60";
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!user || !formData.title || !formData.content) return;
    try {
      setIsPublishing(true);
      const payload = {
        course_id: formData.course_id || "",
        author_id: user.uid,
        author_name: profile?.full_name || user?.displayName || "",
        title: formData.title,
        content: formData.content,
        priority: formData.priority,
      };

      const created = await postBackend<any>("/api/announcements/", payload);
      setAnnouncements((current) => [
        {
          id: created.id,
          title: created.title,
          content: created.content,
          date: created.created_at
            ? new Date(created.created_at).toLocaleDateString()
            : new Date().toLocaleDateString(),
          audience: "All Students",
          views: 0,
          likes: 0,
          commentsCount: 0,
          priority: created.priority || "normal",
        },
        ...current,
      ]);
      setFormData({
        title: "",
        content: "",
        audience: "All Students",
        priority: "normal",
        course_id: "",
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating announcement:", error);
      alert("Failed to publish announcement.");
    } finally {
      setIsPublishing(false);
    }
  };

  const fetchEngagementDetails = async (announcementId: string) => {
    try {
      setLoadingEngagement(true);
      setViewEngagement(null);
      const data = await getBackend<EngagementData>(
        `/api/announcements/${announcementId}/engagement?role=lecturer`,
      );
      setViewEngagement(data);
    } catch (error) {
      console.error("Error fetching engagement details:", error);
    } finally {
      setLoadingEngagement(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    try {
      setDeletingId(announcementId);
      await deleteBackend(`/api/announcements/${announcementId}/`);
      setAnnouncements((current) =>
        current.filter((a) => a.id !== announcementId),
      );
    } catch (error) {
      console.error("Error deleting announcement:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-lavender/10 blur-3xl" />
      </div>
      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl hero-gradient p-6 sm:p-8"
        >
          <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-teal/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <Megaphone className="h-3.5 w-3.5" />
              Announcements Center
            </span>
            <h1 className="mt-4 text-3xl font-display font-bold text-white sm:text-4xl">
              {buildGreeting()}, {user?.email?.split("@")[0] || "Lecturer"}
            </h1>
            <p className="mt-1.5 text-sm font-medium text-white/80">
              Broadcast important messages to your class
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm">
                <Calendar className="h-3.5 w-3.5" />
                {todayLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm">
                <Eye className="h-3.5 w-3.5" />
                {stats.totalViews} views
              </span>
              {stats.totalComments > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber px-3 py-1.5 text-navy">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {stats.totalComments} comments
                </span>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber to-amber-dark px-4 py-1.5 font-semibold text-navy shadow-glow transition-transform hover:scale-[1.03]"
              >
                <Plus className="h-4 w-4" />
                New Announcement
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Announcements",
              value: stats.totalAnnouncements,
              accent: "from-primary to-secondary",
              iconBg: "bg-primary/10 text-primary",
              Icon: Megaphone,
            },
            {
              label: "Total Views",
              value: stats.totalViews,
              accent: "from-teal to-emerald",
              iconBg: "bg-teal/15 text-teal",
              Icon: Eye,
            },
            {
              label: "Total Likes",
              value: stats.totalLikes,
              accent: "from-red-500 to-orange-500",
              iconBg: "bg-red-500/15 text-red-600",
              Icon: Heart,
            },
            {
              label: "Total Comments",
              value: stats.totalComments,
              accent: "from-blue-500 to-blue-600",
              iconBg: "bg-blue-500/15 text-blue-600",
              Icon: MessageSquare,
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

        {/* Announcements List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-muted-foreground">
              <div className="rounded-xl bg-primary/10 p-3">
                <Megaphone className="h-6 w-6 animate-pulse text-primary" />
              </div>
              <p className="text-sm font-medium">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card/50 py-16 text-center"
            >
              <div className="rounded-2xl bg-primary/10 p-4">
                <Megaphone className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">
                  No announcements yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Publish your first announcement to reach your students
                </p>
              </div>
              <Button
                className="mt-2 bg-gradient-to-r from-amber to-amber-dark font-semibold text-navy shadow-glow hover:opacity-90"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" /> Create Announcement
              </Button>
            </motion.div>
          ) : (
            announcements.map((announcement, i) => (
              <motion.div
                key={announcement.id}
                variants={rise}
                initial="hidden"
                animate="visible"
                custom={i}
              >
                <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-lg transition-shadow hover:shadow-lg">
                  <div
                    className={`h-1 ${
                      announcement.priority === "high"
                        ? "bg-gradient-to-r from-red-500 to-orange-500"
                        : announcement.priority === "low"
                          ? "bg-muted"
                          : "bg-gradient-to-r from-blue-500 to-blue-600"
                    }`}
                  />
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-1 gap-3">
                        <div className="shrink-0 rounded-xl bg-lavender/15 p-2.5">
                          <Megaphone className="h-5 w-5 text-lavender" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={getPriorityColor(
                                announcement.priority,
                              )}
                            >
                              {announcement.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {announcement.date}
                            </span>
                          </div>
                          <h3 className="mt-1.5 text-lg font-semibold text-foreground">
                            {announcement.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {announcement.content}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Eye className="h-4 w-4 text-blue-600" />
                              {announcement.views} views
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Heart className="h-4 w-4 text-red-500" />
                              {announcement.likes} likes
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <MessageSquare className="h-4 w-4 text-teal" />
                              {announcement.commentsCount} comments
                            </span>
                            <Badge variant="outline">
                              {announcement.audience}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                          onClick={() => {
                            setViewingId(announcement.id);
                            fetchEngagementDetails(announcement.id);
                          }}
                          title="View engagement details"
                        >
                          <Eye className="h-4 w-4" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10"
                          onClick={() =>
                            handleDeleteAnnouncement(announcement.id)
                          }
                          disabled={deletingId === announcement.id}
                          title="Delete announcement"
                        >
                          {deletingId === announcement.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Create Announcement Modal */}
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border/60 rounded-2xl p-6 max-w-md w-full space-y-4"
            >
              <h2 className="text-2xl font-bold">Create Announcement</h2>

              <div>
                <label className="text-sm font-medium block mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Announcement title"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Message
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Write your announcement..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Audience
                  </label>
                  <select
                    value={formData.audience}
                    onChange={(e) =>
                      setFormData({ ...formData, audience: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option>All Students</option>
                    <option>Advanced Track</option>
                    <option>Beginner Track</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                  disabled={isPublishing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAnnouncement}
                  disabled={
                    isPublishing || !formData.title || !formData.content
                  }
                  className="flex-1 bg-gradient-to-r from-amber to-amber-dark font-semibold text-navy shadow-glow hover:opacity-90"
                >
                  {isPublishing ? "Publishing..." : "Publish"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* View Announcement Modal - Lecturer sees all comments */}
        {viewingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border/60 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-4"
            >
              {(() => {
                const announcement = announcements.find(
                  (a) => a.id === viewingId,
                );
                return announcement ? (
                  <>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">
                        {announcement.title}
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{announcement.date}</span>
                        <Badge
                          className={getPriorityColor(announcement.priority)}
                        >
                          {announcement.priority}
                        </Badge>
                        <Badge variant="outline">{announcement.audience}</Badge>
                      </div>
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-foreground whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                    </div>

                    {/* Impression counts */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/60">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald">
                          {viewEngagement?.views ?? announcement.views}
                        </p>
                        <p className="text-xs text-muted-foreground">Views</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {viewEngagement?.likes ?? announcement.likes}
                        </p>
                        <p className="text-xs text-muted-foreground">Likes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {viewEngagement?.comments_count ??
                            announcement.commentsCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Comments
                        </p>
                      </div>
                    </div>

                    {/* All student comments */}
                    {loadingEngagement ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : viewEngagement &&
                      viewEngagement.comments.length > 0 ? (
                      <div className="space-y-3 pt-4 border-t border-border/60">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                          Student Comments (
                          {viewEngagement.comments.length})
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {viewEngagement.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="px-3 py-2 bg-muted/50 rounded-lg space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">
                                  {comment.student_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(
                                    comment.created_at,
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-foreground">
                                {comment.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : viewEngagement ? (
                      <div className="text-center py-4 text-sm text-muted-foreground border-t border-border/60">
                        No student comments yet
                      </div>
                    ) : null}

                    <div className="flex gap-2 pt-4">
                      <Button
                      onClick={() => {
                        setViewingId(null);
                        setViewEngagement(null);
                      }}
                      className="flex-1 bg-gradient-to-r from-amber to-amber-dark font-semibold text-navy shadow-glow hover:opacity-90"
                    >
                      Close
                    </Button>
                    </div>
                  </>
                ) : null;
              })()}
            </motion.div>
          </motion.div>
        )}
      </main>

      <LecturerBottomNav />
    </div>
  );
}
