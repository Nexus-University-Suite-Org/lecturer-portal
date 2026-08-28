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
  Filter,
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
    avgGPA: (
      students.reduce((acc, s) => acc + s.gpa, 0) / students.length
    ).toFixed(2),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/20 text-emerald-700 border-emerald-300/30";
      case "inactive":
        return "bg-amber-500/20 text-amber-700 border-amber-300/30";
      case "graduated":
        return "bg-blue-500/20 text-blue-700 border-blue-300/30";
      default:
        return "bg-muted/60";
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Class Roster</h1>
                <p className="text-sm text-muted-foreground">
                  Manage and view all enrolled students
                </p>
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>

          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {stats.total}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-emerald-500/10 border-emerald-300/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {stats.active}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-amber-500/10 border-amber-300/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {stats.inactive}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-blue-500/10 border-blue-300/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Class GPA Avg</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {stats.avgGPA}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="space-y-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium block mb-2">
                Search Student
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border/60 bg-muted/50 text-foreground focus:outline-none"
              >
                <option value="all">All Tracks</option>
                <option value="Advanced">Advanced</option>
                <option value="Standard">Standard</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border/60 bg-muted/50 text-foreground focus:outline-none"
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
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading students...</p>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Students Found
            </h3>
            <p className="text-muted-foreground">
              {students.length === 0
                ? "No students are enrolled in your courses yet."
                : "No students match your current filters."}
            </p>
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
                <Card className="border-border/60 bg-card/70 backdrop-blur-lg hover:shadow-lg transition-shadow h-full">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {student.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {student.studentId}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`mailto:${student.email}`}
                            className="text-primary hover:underline"
                          >
                            {student.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {student.phone}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={getStatusColor(student.status)}
                        >
                          {student.status}
                        </Badge>
                        <Badge variant="secondary">{student.track}</Badge>
                        <Badge variant="outline">GPA: {student.gpa}</Badge>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-border/60">
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
                          className="flex-1 bg-gradient-to-r from-primary to-secondary"
                          onClick={() => handleViewProfile(student)}
                        >
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
                            ? "bg-emerald-500/20 text-emerald-700 border-emerald-300/30"
                            : "bg-amber-500/20 text-amber-700 border-amber-300/30"
                        }`}
                      >
                        {selectedStudent.status}
                      </Badge>
                    </div>
                  </div>

                  {selectedStudent.gpa > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">GPA</p>
                        <p className="text-sm text-foreground">
                          {selectedStudent.gpa.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
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
                    className="flex-1"
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
