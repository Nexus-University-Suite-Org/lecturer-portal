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

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700";
    case "closed":
      return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700";
    case "graded":
      return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700";
    case "draft":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
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
    <div className="min-h-screen bg-background pb-28">
      <main className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {courses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-8 text-center"
          >
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground mb-2 font-medium">No courses assigned yet.</p>
            <p className="text-muted-foreground mb-6">Select the courses you teach to manage assignments.</p>
            <Button onClick={() => navigate("/lecturer/courses")}>Select Courses</Button>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
                <p className="text-muted-foreground mt-1">Create and manage course assignments</p>
              </div>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Assignment
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.activeCount}</p>
                  </div>
                  <Clock className="h-6 w-6 text-muted-foreground/40" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Closed</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.closedCount}</p>
                  </div>
                  <AlertCircle className="h-6 w-6 text-muted-foreground/40" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Graded</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.gradedCount}</p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-muted-foreground/40" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-foreground">{assignments.length}</p>
                  </div>
                  <FileText className="h-6 w-6 text-muted-foreground/40" />
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4 mt-4">
            <div className="flex gap-2 flex-wrap">
              {(["all", "active", "closed", "graded"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {filteredAssignments.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-medium">No assignments yet</p>
                  <p className="text-muted-foreground mt-1">Create your first assignment to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAssignments.map((assignment, i) => (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="hover:shadow-lg transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-foreground">{assignment.title}</h3>
                              <Badge variant="outline" className={`text-xs ${getStatusColor(assignment.status)}`}>
                                {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                              </Badge>
                            </div>
                            {assignment.description && (
                              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{assignment.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {assignment.courseTitle && (
                                <Badge variant="secondary" className="gap-1">
                                  <FileText className="h-3 w-3" />
                                  {assignment.courseTitle}
                                </Badge>
                              )}
                              <Badge variant="outline" className="gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(assignment.dueDate).toLocaleDateString()}
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                {assignment.totalPoints} pts
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setViewing(assignment); loadSubmissions(assignment.id); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDeleteAssignment(assignment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground font-medium">No assignments yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="p-4 rounded-xl border border-border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-foreground">{assignment.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {assignment.submissions}/{assignment.totalStudents} submitted
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setViewing(assignment); loadSubmissions(assignment.id); }}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                        </div>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Create Assignment</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Course *</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
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
                  <label className="text-sm font-medium text-foreground mb-1 block">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Midterm Exam"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the assignment..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Due Date *</label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Points *</label>
                    <Input
                      type="number"
                      value={formData.totalPoints}
                      onChange={(e) => setFormData({ ...formData, totalPoints: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Instructions (Optional)</label>
                  <Input
                    type="file"
                    accept=".doc,.docx,.pdf,.txt"
                    onChange={(e) => setFormData({ ...formData, instructionDocument: e.target.files?.[0] || null })}
                    disabled={uploadingDocument}
                    className="text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1" disabled={loading || uploadingDocument}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAssignment} disabled={loading || uploadingDocument} className="flex-1">
                  {uploadingDocument ? "Uploading..." : loading ? "Creating..." : "Create"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* View Assignment Modal */}
        {viewing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">{viewing.title}</h2>
                <button onClick={() => { setViewing(null); setViewingSubmissions([]); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">{viewing.description || "No description"}</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-muted-foreground">Due Date</p>
                    <p className="font-medium text-foreground">{new Date(viewing.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-muted-foreground">Points</p>
                    <p className="font-medium text-foreground">{viewing.totalPoints}</p>
                  </div>
                  {viewing.courseTitle && (
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-muted-foreground">Course</p>
                      <p className="font-medium text-foreground">{viewing.courseTitle}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-muted-foreground">Status</p>
                    <Badge className={`mt-1 text-xs ${getStatusColor(viewing.status)}`}>
                      {viewing.status.charAt(0).toUpperCase() + viewing.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {viewing.instructionDocumentUrl && (
                  <a
                    href={resolveUrl(viewing.instructionDocumentUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    📎 {viewing.instructionDocumentName || "Download Instructions"}
                  </a>
                )}

                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold text-foreground mb-3">
                    Submissions ({loadingSubmissions ? "..." : viewingSubmissions.length})
                  </h3>
                  {loadingSubmissions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : viewingSubmissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No submissions yet</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {viewingSubmissions.map((sub) => (
                        <div key={sub.id} className="p-3 rounded-lg border border-border bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">{sub.student_name}</p>
                              <p className="text-xs text-muted-foreground">{sub.student_email}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
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
