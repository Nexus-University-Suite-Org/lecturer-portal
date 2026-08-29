import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Send,
  Trash2,
  Archive,
  Pin,
  Search,
  Filter,
  Plus,
  X,
  User,
  Inbox,
  Star,
  Clock,
  Paperclip,
  FileText,
  Loader2,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend } from "@/lib/backendApi";
import { MiniStomp } from "@/lib/stompClient";

const MESSAGING_WS_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:8084").replace(
    /^http/,
    "ws",
  );

interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  subject: string;
  body: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  is_deleted_by_sender: boolean;
  is_deleted_by_recipient: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  from_profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  to_profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

type ViewType = "inbox" | "sent" | "starred";

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

export default function LecturerMessages() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedView, setSelectedView] = useState<ViewType>("inbox");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeToId, setComposeToId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const stompRef = useRef<MiniStomp | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const participantIdRef = useRef<string | null>(null);

  // Resolve the current user's shared participant id by email so a stale
  // cached numeric uid (e.g. after the lecturer was renumbered) can't break
  // inbox/topic routing.
  useEffect(() => {
    const email = profile?.email || user?.email || "";
    if (!email) return;
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8084";
    fetch(`${base}/api/participants/resolve?email=${encodeURIComponent(email)}`)
      .then((r) => r.json().catch(() => null))
      .then((data: any) => {
        if (data && data.found && data.id != null) {
          setParticipantId(String(data.id));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  useEffect(() => {
    if (participantId) {
      participantIdRef.current = participantId;
    }
  }, [participantId]);

  const uid = () => participantIdRef.current || user?.uid || "";

  const downloadAttachment = async (
    attachmentPath: string,
    attachmentName: string,
  ) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8084";
      const fullUrl = attachmentPath.startsWith("http")
        ? attachmentPath
        : `${baseUrl}${attachmentPath}`;
      const a = document.createElement("a");
      a.href = fullUrl;
      a.download = attachmentName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast.error("Failed to download attachment");
    }
  };

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedView, participantId]);

  useEffect(() => {
    const uid = participantId || user?.uid;
    if (!uid) return;
    if (!stompRef.current) {
      stompRef.current = new MiniStomp(`${MESSAGING_WS_BASE}/ws`);
      stompRef.current.connect(() => {
        stompRef.current?.subscribe(`/topic/messages/${uid}`, async (payload) => {
          if (payload && payload.messageId != null) {
            const updated = await fetchMessages();
            const incoming = updated.find(
              (m) =>
                m.id === String(payload.messageId) &&
                m.to_user_id === uid,
            );
            if (incoming) {
              toast("New message", {
                description: `From ${incoming.from_profile?.full_name || "Unknown"}: ${incoming.subject}`,
              });
            }
            window.dispatchEvent(new Event("notifications-updated"));
          }
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, participantId]);

  const fetchStudents = async () => {
    try {
      if (!user?.uid) return;

      const data = await getBackend<any[]>("/api/students/");
      const studentsData = data
        .map((item) => ({
          id: item.id,
          name: item.full_name || "Unknown Student",
          email: item.email || "",
          phone: item.phone || "",
          studentId: item.student_number || item.registration_number || item.id,
          status: "active" as const,
          gpa: 0,
          enrollmentDate: new Date().toISOString(),
          track: item.programme || "General",
        }))
        .filter((p) => String(p.id) !== uid());

      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchMessages = async (): Promise<Message[]> => {
    const me = uid();
    if (!me) return [];

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("view", selectedView);
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const data = await getBackend<any[]>(
        `/api/messages/${encodeURIComponent(me)}/?${params.toString()}`,
      );

      const messagesData: Message[] = data.map((msg) => ({
        ...msg,
        created_at: msg.created_at,
        from_profile: msg.from_profile
          ? {
              id: String(msg.from_profile.id ?? msg.from_user_id),
              full_name:
                typeof msg.from_profile.full_name === "string"
                  ? msg.from_profile.full_name
                  : String(msg.from_user_id),
              email: msg.from_profile.email || "",
              avatar_url: msg.from_profile.avatar_url ?? null,
            }
          : {
              id: String(msg.from_user_id),
              full_name: String(msg.from_user_id),
              email: "",
              avatar_url: null,
            },
        to_profile: msg.to_profile
          ? {
              id: String(msg.to_profile.id ?? msg.to_user_id),
              full_name:
                typeof msg.to_profile.full_name === "string"
                  ? msg.to_profile.full_name
                  : String(msg.to_user_id),
              email: msg.to_profile.email || "",
              avatar_url: msg.to_profile.avatar_url ?? null,
            }
          : {
              id: String(msg.to_user_id),
              full_name: String(msg.to_user_id),
              email: "",
              avatar_url: null,
            },
      }));

      setMessages(messagesData);
      return messagesData;
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (
      !user ||
      !composeToId ||
      !composeSubject.trim() ||
      !composeBody.trim()
    ) {
      toast.error("Please fill in all fields and select a recipient.");
      return;
    }

    try {
      setSending(true);

      const me = uid();
      if (!me) {
        toast.error("Could not resolve your messaging account. Please sign in again.");
        return;
      }

      let attachmentUrl = null;
      let attachmentName = null;
      let attachmentSize = null;

      // Upload attachment if present
      if (attachmentFile) {
        setUploadingAttachment(true);
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(attachmentFile);
        });
        const uploadResp = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8084"}/api/attachments/base64`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file_name: attachmentFile.name,
              content_type: attachmentFile.type,
              size: attachmentFile.size,
              data: base64Data,
            }),
          },
        );
        if (uploadResp.ok) {
          const uploadData = await uploadResp.json();
          attachmentUrl = uploadData.url;
          attachmentName = attachmentFile.name;
          attachmentSize = attachmentFile.size;
        }
        setUploadingAttachment(false);
      }

      const messageData = {
        from_user_id: me,
        to_user_id: composeToId,
        subject: composeSubject,
        body: composeBody,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_size: attachmentSize,
      };

      await postBackend("/api/messages/send/", messageData);

      // Reset compose form
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setComposeToId(null);
      setAttachmentFile(null);
      setIsComposeOpen(false);

      // Refresh messages
      fetchMessages();

      toast.success("Message sent successfully!");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Error: " + (error as any).message);
    } finally {
      setSending(false);
    }
  };

  const handleReply = (message: Message) => {
    setComposeToId(message.from_user_id);
    setComposeTo(message.from_profile?.email || "");
    setComposeSubject(`Re: ${message.subject}`);
    setComposeBody("");
    setIsComposeOpen(true);
  };

  const handleToggleStar = async (messageId: string, currentValue: boolean) => {
    const me = uid();
    if (!me) return;
    try {
      await postBackend(`/api/messages/${messageId}/action/`, {
        action: "star",
        user_id: me,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_starred: !currentValue } : m,
        ),
      );
    } catch (error) {
      console.error("Error toggling star:", error);
    }
  };

  const handleDelete = async (messageId: string) => {
    const me = uid();
    if (!me) return;

    try {
      await postBackend(`/api/messages/${messageId}/action/`, {
        action: "delete",
        user_id: me,
      });

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setSelectedMessage(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const markAsRead = async (messageId: string) => {
    const me = uid();
    if (!me) return;

    try {
      await postBackend(`/api/messages/${messageId}/action/`, {
        action: "read",
        user_id: me,
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m)),
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    if (!message.is_read && message.to_user_id === uid()) {
      markAsRead(message.id);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const query = searchQuery.toLowerCase();
    return (
      msg.subject.toLowerCase().includes(query) ||
      msg.body.toLowerCase().includes(query) ||
      msg.from_profile?.full_name.toLowerCase().includes(query) ||
      msg.from_profile?.email.toLowerCase().includes(query) ||
      msg.to_profile?.full_name.toLowerCase().includes(query) ||
      msg.to_profile?.email.toLowerCase().includes(query)
    );
  });

  const unreadCount = messages.filter(
    (m) => !m.is_read && m.to_user_id === uid(),
  ).length;

  const getInitials = (name: unknown) => {
    if (!name || typeof name !== "string") return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Messages</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your inbox and communications
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsComposeOpen(true)}
              className="bg-gradient-to-r from-primary to-secondary gap-2 w-full sm:w-auto"
            >
              <Send className="h-4 w-4" /> New Message
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-2 md:gap-4">
            <Badge variant="outline" className="px-3 py-1.5">
              <Mail className="h-3 w-3 mr-1" />
              {messages.length} Messages
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5">
              {unreadCount} Unread
            </Badge>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 min-w-0">
              <label className="text-sm font-medium block mb-2">
                Search Messages
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by sender, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex gap-2 flex-wrap">
            <Select
              value={selectedView}
              onValueChange={(value) => setSelectedView(value as ViewType)}
            >
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inbox">
                  <span className="flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    Inbox
                  </span>
                </SelectItem>
                <SelectItem value="sent">
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Sent
                  </span>
                </SelectItem>
                <SelectItem value="starred">
                  <span className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Starred
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Messages List */}
        <div className="space-y-2">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3 animate-spin" />
              <p className="text-muted-foreground">Loading messages...</p>
            </motion.div>
          ) : filteredMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No messages found</p>
            </motion.div>
          ) : (
            filteredMessages.map((message, i) => {
              const displayProfile =
                selectedView === "sent"
                  ? message.to_profile
                  : message.from_profile;
              return (
                <motion.div
                  key={message.id}
                  variants={rise}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                >
                  <Card
                    className={`border-border/60 cursor-pointer transition-all hover:shadow-md ${
                      !message.is_read && message.to_user_id === uid()
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card/70 backdrop-blur-lg"
                    } ${
                      selectedMessage?.id === message.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => handleMessageClick(message)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={displayProfile?.avatar_url} />
                            <AvatarFallback>
                              {displayProfile?.full_name
                                ? getInitials(displayProfile.full_name)
                                : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p
                                className={`font-semibold truncate text-sm md:text-base ${
                                  !message.is_read &&
                                  message.to_user_id === uid()
                                    ? "font-bold text-foreground"
                                    : "text-foreground"
                                }`}
                              >
                                {displayProfile?.full_name || "Unknown User"}
                              </p>
                              {!message.is_read &&
                                message.to_user_id === uid() && (
                                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                                )}
                            </div>
                            <p className="text-sm text-foreground font-medium truncate">
                              {message.subject}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {message.body}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(
                                new Date(message.created_at),
                                {
                                  addSuffix: true,
                                },
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStar(message.id, message.is_starred);
                            }}
                            className="p-2 hover:bg-primary/10 rounded-lg transition-colors touch-manipulation"
                            title={message.is_starred ? "Unstar" : "Star"}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                message.is_starred
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(message.id);
                            }}
                            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors text-muted-foreground touch-manipulation"
                            title="Delete message"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Compose Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto mx-2 md:mx-auto p-4 md:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl md:text-2xl font-semibold">
              New Message to Student
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Send a message to your students
            </p>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-3 block text-foreground">
                To
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <select
                  value={composeToId || ""}
                  onChange={(e) => {
                    const selectedStudent = students.find(
                      (s) => s.id === e.target.value,
                    );
                    setComposeToId(e.target.value);
                    setComposeTo(selectedStudent?.email || "");
                  }}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary h-12 text-base"
                >
                  <option value="">Select a student...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} ({student.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-3 block text-foreground">
                Subject
              </label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Enter message subject..."
                className="h-12 text-base"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-3 block text-foreground">
                Message
              </label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Type your message here..."
                rows={8}
                className="min-h-[200px] md:min-h-[300px] resize-none text-base leading-relaxed"
              />
            </div>

            {/* Attachment Section */}
            <div>
              <label className="text-sm font-medium mb-3 block text-foreground">
                Attachment (Optional)
              </label>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    id="lecturer-attachment-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10485760) {
                          toast.error("File size must be less than 10MB");
                          return;
                        }
                        setAttachmentFile(file);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document
                        .getElementById("lecturer-attachment-upload")
                        ?.click()
                    }
                    disabled={uploadingAttachment}
                    className="flex items-center gap-2 h-12 px-4 text-base"
                  >
                    <Paperclip className="h-4 w-4" />
                    {attachmentFile ? "Change File" : "Attach File"}
                  </Button>
                  <p className="text-xs text-muted-foreground self-center">
                    Max 10MB
                  </p>
                </div>
                {attachmentFile && (
                  <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[200px] sm:max-w-[300px]">
                      {attachmentFile.name} (
                      {(attachmentFile.size / 1024).toFixed(1)} KB)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAttachmentFile(null)}
                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Supported: PDF, Word, Excel, Images, ZIP (Max 10MB)
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsComposeOpen(false);
                setComposeTo("");
              }}
              disabled={sending}
              className="w-full sm:w-auto h-12 text-base order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={
                sending ||
                !composeToId ||
                !composeSubject.trim() ||
                !composeBody.trim()
              }
              className="w-full sm:w-auto h-12 bg-gradient-to-r from-primary to-secondary text-base order-1 sm:order-2"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Detail Dialog */}
      <AnimatePresence>
        {selectedMessage && (
          <Dialog
            open={!!selectedMessage}
            onOpenChange={(open) => {
              if (!open) setSelectedMessage(null);
            }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto mx-4 md:mx-auto">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl pr-8">
                  {selectedMessage.subject}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] md:max-h-[400px] pr-4">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage
                        src={
                          selectedView === "sent"
                            ? selectedMessage.to_profile?.avatar_url
                            : selectedMessage.from_profile?.avatar_url
                        }
                      />
                      <AvatarFallback>
                        {selectedView === "sent"
                          ? selectedMessage.to_profile?.full_name
                            ? getInitials(selectedMessage.to_profile.full_name)
                            : "?"
                          : selectedMessage.from_profile?.full_name
                            ? getInitials(
                                selectedMessage.from_profile.full_name,
                              )
                            : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm md:text-base">
                        {selectedView === "sent"
                          ? selectedMessage.to_profile?.full_name
                          : selectedMessage.from_profile?.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {selectedView === "sent"
                          ? selectedMessage.to_profile?.email
                          : selectedMessage.from_profile?.email}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(
                        new Date(selectedMessage.created_at),
                        { addSuffix: true },
                      )}
                    </p>
                  </div>
                  <div className="prose max-w-none whitespace-pre-wrap text-sm md:text-base leading-relaxed">
                    {selectedMessage.body}
                  </div>

                  {/* Attachment */}
                  {selectedMessage.attachment_url && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Attachment:</p>
                      {/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(
                        selectedMessage.attachment_name || "",
                      ) ? (
                        <a
                          href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8084"}${selectedMessage.attachment_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8084"}${selectedMessage.attachment_url}`}
                            alt={selectedMessage.attachment_name || "Attachment"}
                            className="max-w-full max-h-80 rounded-lg border object-contain"
                          />
                        </a>
                      ) : null}
                      <Button
                        variant="outline"
                        onClick={() =>
                          downloadAttachment(
                            selectedMessage.attachment_url!,
                            selectedMessage.attachment_name || "attachment",
                          )
                        }
                        className="gap-2 w-full sm:w-auto justify-start h-12 mt-2"
                      >
                        <Paperclip className="h-4 w-4" />
                        {selectedMessage.attachment_name}{" "}
                        {selectedMessage.attachment_size &&
                          `(${(selectedMessage.attachment_size / 1024).toFixed(
                            1,
                          )} KB)`}
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                {selectedView === "inbox" && (
                  <Button
                    onClick={() => {
                      handleReply(selectedMessage);
                      setSelectedMessage(null);
                    }}
                    className="gap-2 w-full sm:w-auto h-12 bg-gradient-to-r from-primary to-secondary"
                  >
                    <Send className="h-4 w-4" /> Reply
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedMessage(null)}
                  className="w-full sm:w-auto h-12"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      <LecturerBottomNav />
    </div>
  );
}
