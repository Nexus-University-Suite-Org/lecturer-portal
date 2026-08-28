import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Download,
  Upload,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend } from "@/lib/backendApi";

interface AttendanceRecord {
  id: string;
  studentId: string;
  courseId: string;
  studentName: string;
  courseCode: string;
  date: string;
  status: "present" | "absent" | "late" | "excused" | "unmarked";
  remarks?: string;
}

interface CourseOption {
  id: string;
  code: string;
  title: string;
}

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

export default function LecturerAttendance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [savedRecords, setSavedRecords] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [searchStudent, setSearchStudent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setCourses([]);
      setRecords([]);
      setSavedRecords([]);
      setLoading(false);
      return;
    }

    const loadCourses = async () => {
      try {
        setLoading(true);

        const profiles = await getBackend<any[]>("/api/profiles/?role=lecturer");
        const lecturerProfile = profiles.find(
          (p: any) => p.email === user.email,
        );
        const courseIds: string[] = (
          lecturerProfile?.assigned_course_units || []
        ).filter(Boolean);

        if (courseIds.length === 0) {
          setCourses([]);
          return;
        }

        const courseUnitsData = await getBackend<any[]>("/api/course-units/");
        const resolvedCourses: CourseOption[] = [];
        courseUnitsData.forEach((cu: any) => {
          if (courseIds.includes(cu.id) || courseIds.includes(cu.course_id)) {
            resolvedCourses.push({
              id: cu.id || cu.course_id,
              code: cu.code || cu.course_unit_code || "COURSE",
              title: cu.name || cu.course_unit_name || "Course",
            });
          }
        });

        setCourses(resolvedCourses);
        setSelectedCourse((prev) => prev || resolvedCourses[0]?.id || "");
      } catch (error) {
        console.error("Error loading attendance courses:", error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedCourse) {
      setRecords([]);
      setSavedRecords([]);
      return;
    }

    const loadAttendance = async () => {
      try {
        setLoading(true);

        const selectedCourseData = courses.find(
          (course) => course.id === selectedCourse,
        );

        const enrollmentData = await getBackend<any[]>(
          `/api/enrollments/?course_ids=${encodeURIComponent(selectedCourse)}`,
        );
        const studentIds = Array.from(
          new Set(
            enrollmentData
              .filter((e: any) => e.status === "approved")
              .map((e: any) => e.student_id)
              .filter(Boolean),
          ),
        ) as string[];

        const allProfiles = await getBackend<any[]>("/api/profiles/");
        const profileMap = new Map<string, any>();
        allProfiles.forEach((p: any) => {
          if (studentIds.includes(p.id)) {
            profileMap.set(p.id, p);
          }
        });

        const mergedRecords: AttendanceRecord[] = studentIds
          .map((studentId) => {
            const profileData = profileMap.get(studentId) || {};
            return {
              id: `${selectedCourse}_${studentId}_${selectedDate}`,
              studentId,
              courseId: selectedCourse,
              studentName: profileData.full_name || "Unknown Student",
              courseCode: selectedCourseData?.code || "COURSE",
              date: selectedDate,
              status: "unmarked",
              remarks: undefined,
            };
          })
          .sort((a, b) => a.studentName.localeCompare(b.studentName));

        setRecords(mergedRecords);
        setSavedRecords(mergedRecords);
      } catch (error) {
        console.error("Error loading attendance:", error);
        setRecords([]);
        setSavedRecords([]);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [courses, selectedCourse, selectedDate]);

  const handleExport = () => {
    const header = "Student Name,Course Code,Date,Status,Remarks";
    const rows = filteredRecords.map(
      (r) =>
        `"${r.studentName}","${r.courseCode}","${r.date}","${r.status}","${r.remarks || ""}"`,
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${selectedCourse}-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Attendance exported as CSV." });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").slice(1).filter(Boolean);
      const imported: AttendanceRecord[] = lines.map((line, i) => {
        const cols = line.split(",").map((c) => c.replace(/^"|"$/g, ""));
        return {
          id: `import-${i}`,
          studentId: `${selectedCourse}-${i}`,
          courseId: selectedCourse,
          studentName: cols[0] || "",
          courseCode: cols[1] || selectedCourse,
          date: cols[2] || selectedDate,
          status: (cols[3] as AttendanceRecord["status"]) || "unmarked",
          remarks: cols[4] || undefined,
        };
      });
      setRecords((prev) => [
        ...prev.filter(
          (r) =>
            !imported.some(
              (im) => im.studentName === r.studentName && im.date === r.date,
            ),
        ),
        ...imported,
      ]);
      toast({
        title: "Imported",
        description: `${imported.length} records imported.`,
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCancel = () => {
    setRecords(savedRecords);
    toast({ title: "Cancelled", description: "Changes have been discarded." });
  };

  const handleSaveAttendance = async () => {
    try {
      setSavedRecords(records);
      toast({
        title: "Attendance Saved",
        description: `${filteredRecords.length} records updated for ${selectedDate}.`,
      });
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast({
        title: "Save failed",
        description: "Could not save attendance records.",
        variant: "destructive",
      });
    }
  };

  const filteredRecords = records.filter(
    (r) =>
      r.courseId === selectedCourse &&
      r.date === selectedDate &&
      r.studentName.toLowerCase().includes(searchStudent.toLowerCase()),
  );

  const stats = {
    present: filteredRecords.filter((r) => r.status === "present").length,
    absent: filteredRecords.filter((r) => r.status === "absent").length,
    late: filteredRecords.filter((r) => r.status === "late").length,
    excused: filteredRecords.filter((r) => r.status === "excused").length,
  };

  const attendanceRate =
    Math.round(
      ((stats.present + stats.late + stats.excused) /
        Math.max(1, filteredRecords.length)) *
        100,
    ) || 0;

  const handleStatusChange = (
    id: string,
    newStatus: "present" | "absent" | "late" | "excused" | "unmarked",
  ) => {
    setRecords(
      records.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-emerald-500/20 text-emerald-700 border-emerald-300/30";
      case "absent":
        return "bg-red-500/20 text-red-700 border-red-300/30";
      case "late":
        return "bg-amber-500/20 text-amber-700 border-amber-300/30";
      case "excused":
        return "bg-blue-500/20 text-blue-700 border-blue-300/30";
      case "unmarked":
        return "bg-muted/60 text-muted-foreground border-border/60";
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
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Attendance Management</h1>
                <p className="text-sm text-muted-foreground">
                  Track and manage student attendance
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImport}
              />
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => importInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Import
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-emerald-500/10 border-emerald-300/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-emerald-700">
                    {stats.present}
                  </p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="bg-red-500/10 border-red-300/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-red-700">
                    {stats.absent}
                  </p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-amber-500/10 border-amber-300/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-amber-700">
                    {stats.late}
                  </p>
                  <p className="text-xs text-muted-foreground">Late</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="bg-blue-500/10 border-blue-300/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-700">
                    {stats.excused}
                  </p>
                  <p className="text-xs text-muted-foreground">Excused</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-3xl font-bold text-primary">
                    {attendanceRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">Rate</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-wrap gap-4 items-end"
        >
          <div className="flex-1 min-w-64">
            <label className="text-sm font-medium block mb-2">
              Select Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {courses.length === 0 ? (
                <option value="">No courses available</option>
              ) : (
                courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex-1 min-w-64">
            <label className="text-sm font-medium block mb-2">Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-64">
            <label className="text-sm font-medium block mb-2">
              Search Student
            </label>
            <Input
              placeholder="Type student name..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Attendance List */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-lg">
          <CardHeader>
            <CardTitle>{filteredRecords.length} Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {loading ? "Loading attendance..." : "No records found"}
                </div>
              ) : (
                filteredRecords.map((record, i) => (
                  <motion.div
                    key={record.id}
                    variants={rise}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {record.studentName}
                      </p>
                      {record.remarks && (
                        <p className="text-xs text-muted-foreground">
                          Remarks: {record.remarks}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(
                        [
                          "present",
                          "absent",
                          "late",
                          "excused",
                          "unmarked",
                        ] as const
                      ).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(record.id, status)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                            record.status === status
                              ? getStatusColor(status)
                              : "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/60"
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={handleSaveAttendance}
          >
            Save Attendance
          </Button>
        </div>
      </main>

      <LecturerBottomNav />
    </div>
  );
}
