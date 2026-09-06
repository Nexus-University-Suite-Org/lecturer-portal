import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Mail,
  Phone,
  MapPin,
  Search,
  Download,
  Calendar,
  BadgeCheck,
  GraduationCap,
  MessageCircle,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend } from "@/lib/backendApi";

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  studentId: string;
  status: "active" | "inactive" | "graduated";
  gpa: number;
  enrollmentDate: string;
  track: string;
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

export default function LecturerRoster() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [user]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      if (!user?.uid) return;

      const data = await getBackend<any[]>("/api/students/");
      const studentProfiles = data.map((item) => ({
        id: item.id,
        name: item.full_name || "Unknown Student",
        email: item.email || "",
        phone: item.phone || "",
        studentId: item.student_number || item.registration_number || item.id,
        status: "active" as const,
        gpa: 0,
        enrollmentDate: new Date().toISOString(),
        track: item.programme || "General",
      }));

      setStudents(studentProfiles);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageStudent = (student: Student) => {
    // Navigate to messages page - could pass student ID as a parameter
    navigate("/lecturer/messages");
  };

  const handleViewProfile = (student: Student) => {
    setSelectedStudent(student);
    setShowProfileModal(true);
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrack = selectedTrack === "all" || s.track === selectedTrack;
    const matchesStatus =
      selectedStatus === "all" || s.status === selectedStatus;
    return matchesSearch && matchesTrack && matchesStatus;
  });

  const stats = {
    total: students.length,
    active: students.filter((s) => s.status === "active").length,
    inactive: students.filter((s) => s.status === "inactive").length,
    avgGPA: students.length
      ? (
          students.reduce((acc, s) => acc + s.gpa, 0) / students.length
        ).toFixed(2)
      : "0.00",
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald/15 text-emerald border-emerald/40";
      case "inactive":
        return "bg-amber/15 text-amber-dark border-amber/40";
      case "graduated":
        return "bg-blue-500/15 text-blue-600 border-blue-500/30";
      default:
        return "bg-muted/60 text-muted-foreground border-border/60";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-lavender/10 blur-3xl" />
      </div>
      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="relative overflow-hidden rounded-3xl hero-gradient p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-teal/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <Users className="h-3.5 w-3.5" />
                Class Roster
              </span>
              <h1 className="mt-4 text-3xl font-display font-bold text-white sm:text-4xl">
                {buildGreeting()}, {user?.email?.split("@")[0] || "Lecturer"}
              </h1>
              <p className="mt-1.5 text-sm font-medium text-white/80">
                Manage and view all enrolled students
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm">
                  <Calendar className="h-3.5 w-3.5" />
                  {todayLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {stats.total} students
                </span>
                <button
                  onClick={() => {}}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total Students",
                value: stats.total,
                accent: "from-primary to-secondary",
                iconBg: "bg-primary/10 text-primary",
                Icon: Users,
              },
              {
                label: "Active",
                value: stats.active,
                accent: "from-teal to-emerald",
                iconBg: "bg-emerald/15 text-emerald",
                Icon: BadgeCheck,
              },
              {
                label: "Inactive",
                value: stats.inactive,
                accent: "from-amber to-amber-dark",
                iconBg: "bg-amber/15 text-amber-dark",
                Icon: Users,
              },
              {
                label: "Class GPA Avg",
                value: stats.avgGPA,
                accent: "from-blue-500 to-blue-600",
                iconBg: "bg-blue-500/15 text-blue-600",
                Icon: GraduationCap,
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
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur-lg"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all">All Tracks</option>
                <option value="Advanced">Advanced</option>
                <option value="Standard">Standard</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Student Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl py-16 text-muted-foreground">
            <div className="rounded-2xl bg-primary/10 p-4">
              <Users className="h-8 w-8 animate-pulse text-primary" />
            </div>
            <p className="text-sm font-medium">Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card/50 py-16 text-center">
            <div className="rounded-2xl bg-primary/10 p-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">
                No Students Found
              </h3>
              <p className="text-sm text-muted-foreground">
                {students.length === 0
                  ? "No students are enrolled in your courses yet."
                  : "No students match your current filters."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((student, i) => (
              <motion.div
                key={student.id}
                variants={rise}
                initial="hidden"
                animate="visible"
                custom={i}
              >
                <Card className="h-full overflow-hidden border-border/60 bg-card/70 backdrop-blur-lg transition-shadow hover:shadow-lg">
                  <div className="h-1 bg-gradient-to-r from-primary via-teal to-lavender" />
                  <CardContent className="pt-5">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${
                            i % 3 === 0
                              ? "bg-gradient-to-br from-primary to-secondary"
                              : i % 3 === 1
                                ? "bg-gradient-to-br from-teal to-emerald"
                                : "bg-gradient-to-br from-lavender to-blue-500"
                          }`}
                        >
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-semibold text-foreground">
                            {student.name}
                          </h3>
                          <p className="truncate text-sm text-muted-foreground">
                            {student.studentId}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 shrink-0 text-teal" />
                          <a
                            href={`mailto:${student.email}`}
                            className="truncate text-primary hover:underline"
                          >
                            {student.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 shrink-0 text-lavender" />
                          <span className="text-muted-foreground">
                            {student.phone}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={getStatusColor(student.status)}
                        >
                          {student.status}
                        </Badge>
                        <Badge variant="secondary">{student.track}</Badge>
                        <Badge variant="outline">GPA: {student.gpa}</Badge>
                      </div>

                      <div className="flex gap-2 border-t border-border/60 pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1"
                          onClick={() => handleMessageStudent(student)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Message
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 gap-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                          onClick={() => handleViewProfile(student)}
                        >
                          <Users className="h-4 w-4" />
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Student Profile Modal */}
      <AnimatePresence>
        {showProfileModal && selectedStudent && (
          <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedStudent.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Student ID: {selectedStudent.studentId}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <a
                        href={`mailto:${selectedStudent.email}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {selectedStudent.email}
                      </a>
                    </div>
                  </div>

                  {selectedStudent.phone && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <a
                          href={`tel:${selectedStudent.phone}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {selectedStudent.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Programme</p>
                      <p className="text-sm text-foreground">
                        {selectedStudent.track}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <Badge
                        className={`text-xs ${
                          selectedStudent.status === "active"
                            ? "bg-emerald/15 text-emerald border-emerald/40"
                            : "bg-amber/15 text-amber-dark border-amber/40"
                        }`}
                      >
                        {selectedStudent.status}
                      </Badge>
                    </div>
                  </div>

                  {selectedStudent.gpa > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">GPA</p>
                        <p className="text-sm text-foreground">
                          {selectedStudent.gpa.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Enrolled</p>
                      <p className="text-sm text-foreground">
                        {new Date(
                          selectedStudent.enrollmentDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleMessageStudent(selectedStudent)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                    onClick={() => setShowProfileModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      <LecturerBottomNav />
    </div>
  );
}
