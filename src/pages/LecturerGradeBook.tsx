import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Download,
  Save,
  Search,
  Settings2,
  TrendingUp,
  Upload,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend, putBackend } from "@/lib/backendApi";
import GradingSchemeDialog from "@/components/gradebook/GradingSchemeDialog";
import {
  GradebookScheme,
  StudentMarks,
  computeTotal,
  defaultScheme,
  gradeFromTotal,
  marksToJson,
  parseMarksJson,
  parseScheme,
} from "@/lib/gradebookTypes";

interface StudentRow {
  id: string;
  student_id: string;
  name: string;
  email: string;
  quiz: number | null;
  manual: (number | null)[];
  theory: number | null;
  practical: number | null;
  total: number;
  grade: string;
  gp: number;
  status: "excellent" | "good" | "average" | "warning" | "failing";
  grade_id?: string;
}

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "excellent":
      return "bg-emerald/15 text-emerald border-emerald/40";
    case "good":
      return "bg-blue-500/15 text-blue-600 border-blue-400/40";
    case "average":
      return "bg-amber/15 text-amber-dark border-amber/40";
    case "warning":
      return "bg-orange-500/15 text-orange-600 border-orange-400/40";
    case "failing":
      return "bg-red-500/15 text-red-600 border-red-300/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
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

const ACADEMIC_YEAR = "2026/2027";

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

export default function LecturerGradeBook() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "total" | "grade">("name");
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changedGrades, setChangedGrades] = useState<Set<string>>(new Set());
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [scheme, setScheme] = useState<GradebookScheme>(() => defaultScheme());
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [schemeSaving, setSchemeSaving] = useState(false);
  const saveTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      fetchLecturerCourses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCourse) {
      loadScheme();
      fetchStudentsAndGrades();
    }
  }, [selectedCourse]);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      Object.values(timers).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    setStudents((prev) =>
      prev.map((student) =>
        recomputeRow(student, {
          quiz: student.quiz,
          manual: student.manual,
          theory: student.theory,
          practical: student.practical,
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheme]);

  const fetchLecturerCourses = async () => {
    try {
      if (!user?.uid) return;

      const profiles = await getBackend<any[]>("/api/profiles/?role=lecturer");
      const lecturerProfile = profiles.find(
        (p: any) => p.email === user.email,
      );
      const assignedCourseUnits: string[] =
        lecturerProfile?.assigned_course_units || [];

      const assignedRawCourses: any[] = [];
      if (assignedCourseUnits.length > 0) {
        const courseUnitsData = await getBackend<any[]>("/api/course-units/");
        courseUnitsData.forEach((cu: any) => {
          if (assignedCourseUnits.includes(cu.id) || assignedCourseUnits.includes(cu.course_id)) {
            assignedRawCourses.push({
              id: cu.id || cu.course_id,
              code: cu.code || cu.course_unit_code || "Unknown",
              title: cu.name || cu.course_unit_name || "Unknown Course",
              credits: cu.credits || 3,
              semester: cu.semester || "1",
            });
          }
        });
      }

      const coursesData: any[] = assignedRawCourses.map((raw) => ({
        id: raw.id || `temp-${Date.now()}`,
        code: raw.code || "Unknown",
        title: raw.title || "Unknown Course",
        credits: raw.credits || 3,
        semester: raw.semester || "1",
      }));
      setCourses(coursesData);

      const courseParam = searchParams.get("course");
      if (
        courseParam &&
        coursesData.some((course) => course.id === courseParam)
      ) {
        setSelectedCourse(courseParam);
      } else if (coursesData.length > 0 && !selectedCourse) {
        setSelectedCourse(coursesData[0].id);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const loadScheme = async () => {
    try {
      const raw = await getBackend<any>(`/api/gradebook-schemes/${selectedCourse}/`);
      const parsed =
        raw && Object.keys(raw).length > 0
          ? parseScheme(raw)
          : defaultScheme(Number(selectedCourse));
      setScheme(parsed);
    } catch (error) {
      console.error("Error loading scheme:", error);
      setScheme(defaultScheme(Number(selectedCourse)));
    }
  };

  const recomputeRow = (student: StudentRow, marks: StudentMarks): StudentRow => {
    const { total } = computeTotal(scheme, marks);
    const { grade, gp } = gradeFromTotal(total, scheme.grade_scale);
    let status: StudentRow["status"] = "average";
    if (total >= 90) status = "excellent";
    else if (total >= 80) status = "good";
    else if (total >= 60) status = "average";
    else if (total >= 50) status = "warning";
    else status = "failing";
    return {
      ...student,
      quiz: marks.quiz,
      manual: [...marks.manual],
      theory: marks.theory,
      practical: marks.practical,
      total,
      grade,
      gp,
      status,
    };
  };

  const fetchStudentsAndGrades = async () => {
    if (!selectedCourse || !user) return;

    try {
      setLoading(true);
      const courseSemester = courses.find((c) => c.id === selectedCourse)?.semester || "1";

      const enrollmentData = await getBackend<any[]>(
        `/api/enrollments/?course_ids=${encodeURIComponent(selectedCourse)}`,
      );
      const approvedEnrollments = enrollmentData.filter(
        (e: any) => e.status === "approved",
      );
      const studentIds = approvedEnrollments.map((e: any) => String(e.student_id));

      if (studentIds.length === 0) {
        setStudents([]);
        setQuizResults([]);
        return;
      }

      const allProfiles = await getBackend<any[]>("/api/profiles/");
      const profilesMap: Record<string, any> = {};
      allProfiles.forEach((p: any) => {
        if (studentIds.includes(String(p.id))) {
          profilesMap[String(p.id)] = p;
        }
      });

      const gradesData = await getBackend<any[]>("/api/student-grades/");
      const gradesMap: Record<string, any> = {};
      gradesData.forEach((g: any) => {
        if (String(g.course_id) === String(selectedCourse)) {
          gradesMap[String(g.student_id)] = g;
        }
      });

      // Best quiz attempt % per student, restricted to quizzes of this course
      let quizBestMap: Record<string, number> = {};
      let attemptsAll: any[] = [];
      try {
        const quizzes = await getBackend<any[]>("/api/quizzes/");
        const courseQuizIds = new Set(
          quizzes
            .filter((q: any) => String(q.course_id) === String(selectedCourse))
            .map((q: any) => String(q.id)),
        );
        attemptsAll = await getBackend<any[]>("/api/quiz-attempts/");
        studentIds.forEach((sid) => {
          let best = 0;
          attemptsAll.forEach((a: any) => {
            if (
              String(a.student_id) === sid &&
              courseQuizIds.has(String(a.quiz_id)) &&
              Number.isFinite(Number(a.percentage))
            ) {
              best = Math.max(best, Number(a.percentage));
            }
          });
          if (best > 0) quizBestMap[sid] = best;
        });
      } catch {
        console.log("No quiz attempts data");
      }

      const rows: StudentRow[] = studentIds.map((sid) => {
        const profile = profilesMap[sid];
        const existingGrade = gradesMap[sid];

        let quiz = quizBestMap[sid] ?? null;
        let manual: (number | null)[] = [];
        let theory: number | null = null;
        let practical: number | null = null;

        const parsed = existingGrade ? parseMarksJson(existingGrade.marks_json) : null;
        if (parsed) {
          if (parsed.quiz != null && quizBestMap[sid] == null) quiz = parsed.quiz;
          manual = parsed.manual;
          theory = parsed.theory;
          practical = parsed.practical;
        } else if (existingGrade) {
          // Legacy columns fallback
          const legacy = [
            existingGrade.assignment1,
            existingGrade.assignment2,
            existingGrade.midterm,
            existingGrade.participation,
          ].filter((v) => v != null && Number(v) > 0);
          manual = legacy.length > 0 ? legacy : Array(3).fill(null);
          theory = existingGrade.final_exam ? Number(existingGrade.final_exam) : null;
        }

        // Normalize lengths to the configured item count
        const mcount = Math.max(1, scheme.manual_coursework_items || 1);
        if (manual.length < mcount) {
          manual = [...Array(mcount)].map((_, i) => manual[i] ?? null);
        }

        return recomputeRow(
          {
            id: sid,
            student_id: sid,
            name: profile?.full_name || "Unknown",
            email: profile?.email || "",
            quiz,
            manual,
            theory,
            practical,
            total: 0,
            grade: "F",
            gp: 0,
            status: "average",
            grade_id: existingGrade?.id,
          },
          { quiz, manual, theory, practical },
        );
      });

      setStudents(rows);

      // Quiz results panel (attempts for enrolled students)
      try {
        const enrolledAttempts = attemptsAll.filter((a: any) =>
          studentIds.includes(String(a.student_id)),
        );
        const quizIds = [...new Set(enrolledAttempts.map((a: any) => String(a.quiz_id)))];
        const quizMap: Record<string, string> = {};
        for (const qid of quizIds) {
          try {
            const qData = await getBackend<any>(`/api/quizzes/${qid}/`);
            quizMap[String(qid)] = qData.title || "Quiz";
          } catch {}
        }
        const enriched = enrolledAttempts.map((a: any) => ({
          ...a,
          quiz_title: quizMap[String(a.quiz_id)] || "Quiz",
          student_name: profilesMap[String(a.student_id)]?.full_name || a.student_name || "Unknown",
        }));
        setQuizResults(enriched);
      } catch {
        console.log("Failed to fetch quiz results");
      }
    } catch (error) {
      console.error("Error fetching students and grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateManual = (studentId: string, index: number, value: number) => {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== studentId) return student;
        const manual = [...student.manual];
        manual[index] = value;
        const next = recomputeRow(student, {
          quiz: student.quiz,
          manual,
          theory: student.theory,
          practical: student.practical,
        });
        scheduleAutoSave(next);
        return next;
      }),
    );
  };

  const updateTheory = (studentId: string, value: number) => {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== studentId) return student;
        const next = recomputeRow(student, {
          quiz: student.quiz,
          manual: student.manual,
          theory: value,
          practical: student.practical,
        });
        scheduleAutoSave(next);
        return next;
      }),
    );
  };

  const updatePractical = (studentId: string, value: number) => {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== studentId) return student;
        const next = recomputeRow(student, {
          quiz: student.quiz,
          manual: student.manual,
          theory: student.theory,
          practical: value,
        });
        scheduleAutoSave(next);
        return next;
      }),
    );
  };

  const scheduleAutoSave = (student: StudentRow) => {
    setChangedGrades((prev) => new Set(prev).add(student.id));
    if (saveTimers.current[student.id]) {
      window.clearTimeout(saveTimers.current[student.id]);
    }
    const snapshot = { ...student, manual: [...student.manual] };
    saveTimers.current[student.id] = window.setTimeout(() => {
      saveStudent(snapshot, true);
    }, 2000);
  };

  const saveStudent = async (student: StudentRow, silent: boolean) => {
    if (!selectedCourse || !user) return;

    try {
      const semester = courses.find((c) => c.id === selectedCourse)?.semester || "1";
      const gradeData = {
        student_id: student.student_id,
        course_id: selectedCourse,
        lecturer_id: user.uid,
        assignment1: student.manual[0] ?? null,
        assignment2: student.manual[1] ?? null,
        midterm: student.manual[2] ?? null,
        participation: student.manual[3] ?? null,
        final_exam: student.theory ?? null,
        total: round1(student.total),
        grade: student.grade,
        gp: round2(student.gp),
        academic_year: ACADEMIC_YEAR,
        semester,
        marks_json: marksToJson({
          quiz: student.quiz,
          manual: student.manual,
          theory: student.theory,
          practical: student.practical,
        }),
      };

      const saved = await postBackend("/api/student-grades/", gradeData);

      if (!silent) {
        await sendGradeUpdateNotification(student);
      }

      setChangedGrades((prev) => {
        const newSet = new Set(prev);
        newSet.delete(student.id);
        return newSet;
      });

      return saved;
    } catch (error) {
      console.error("Error saving grade:", error);
      return null;
    }
  };

  const sendGradeUpdateNotification = async (student: StudentRow) => {
    if (!selectedCourse || !user) return;

    try {
      const courseData = courses.find((c) => c.id === selectedCourse);
      const courseName = courseData?.title || courseData?.code || "Course";

      await postBackend("/api/notifications/", {
        user_id: student.student_id,
        type: "grade_update",
        title: "Grade Updated",
        message: `Your grades for ${courseName} have been updated. Total: ${student.total.toFixed(
          1,
        )}%, Grade: ${student.grade}`,
        related_id: selectedCourse,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const saveAllGrades = async () => {
    try {
      setSaving(true);
      const ids = Array.from(changedGrades);
      for (const id of ids) {
        const student = students.find((s) => s.id === id);
        if (!student) continue;
        if (saveTimers.current[id]) {
          window.clearTimeout(saveTimers.current[id]);
        }
        await saveStudent(
          { ...student, manual: [...student.manual] },
          false,
        );
      }
      setChangedGrades(new Set());
      alert("Grades saved successfully!");
      fetchStudentsAndGrades();
    } catch (error) {
      console.error("Error saving grades:", error);
      alert("Failed to save some grades. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScheme = async (nextScheme: GradebookScheme) => {
    if (!selectedCourse) return;
    setSchemeSaving(true);
    try {
      await putBackend(`/api/gradebook-schemes/${selectedCourse}/`, {
        course_id: Number(selectedCourse),
        coursework_weight: nextScheme.coursework_weight,
        exam_weight: nextScheme.exam_weight,
        exam_mode: nextScheme.exam_mode,
        exam_theory_weight: nextScheme.exam_theory_weight,
        exam_practical_weight: nextScheme.exam_practical_weight,
        quiz_weight: nextScheme.quiz_weight,
        best_n: nextScheme.best_n,
        manual_coursework_items: nextScheme.manual_coursework_items,
        item_labels: JSON.stringify(nextScheme.item_labels),
        grade_scale: JSON.stringify(nextScheme.grade_scale),
      });
      setScheme(parseScheme({ ...nextScheme, course_id: Number(selectedCourse) }));
      setSchemeOpen(false);
      alert("Grading scheme saved!");
      // Recompute everything with the new weights
      setStudents((prev) =>
        prev.map((student) =>
          recomputeRow(student, {
            quiz: student.quiz,
            manual: student.manual,
            theory: student.theory,
            practical: student.practical,
          }),
        ),
      );
    } catch (error) {
      console.error("Error saving scheme:", error);
      alert("Failed to save scheme. Please try again.");
    } finally {
      setSchemeSaving(false);
    }
  };

  const columnMeta = {
    hasQuiz: scheme.quiz_weight > 0,
    hasPractical: scheme.exam_mode === "THEORY_PRACTICAL",
    manualLabels: scheme.item_labels,
    manualCount: scheme.manual_coursework_items || 0,
  };

  const exportHeaders = [
    "Name",
    "Email",
    ...(columnMeta.hasQuiz ? ["Quiz"] : []),
    ...columnMeta.manualLabels,
    "Theory",
    ...(columnMeta.hasPractical ? ["Practical"] : []),
    "Total",
    "Grade",
    "GP",
  ];

  const handleExportGrades = () => {
    if (students.length === 0) {
      alert("No data to export");
      return;
    }

    const rows = students.map((student) => [
      student.name,
      student.email,
      ...(columnMeta.hasQuiz ? [student.quiz ?? ""] : []),
      ...columnMeta.manualLabels.map((_, i) => student.manual[i] ?? ""),
      student.theory ?? "",
      ...(columnMeta.hasPractical ? [student.practical ?? ""] : []),
      student.total.toFixed(1),
      student.grade,
      student.gp.toFixed(2),
    ]);

    const csvContent = [
      exportHeaders.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grades_${selectedCourse}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleImportGrades = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      alert("Please select a CSV file");
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        if (lines.length < 2) {
          alert("CSV file is empty or invalid");
          setImporting(false);
          return;
        }

        const headerTokens = (lines[0] ?? "")
          .match(/"[^"]*"|[^,]+/g)
          ?.map((v) => v.replace(/^"|"$/g, "").trim().toLowerCase()) ?? [];
        const findCol = (keywords: string[]) =>
          headerTokens.find((h) => keywords.some((k) => h.includes(k)));

        const colManual = columnMeta.manualLabels.map((label, i) => {
          const idx = headerTokens.indexOf(label.toLowerCase());
          return idx >= 0 ? idx : undefined;
        });
        const colTheory = findCol(["theor"]) != null ? headerTokens.indexOf(findCol(["theor"])!) : -1;
        const colPractical = columnMeta.hasPractical && findCol(["pract"]) != null ? headerTokens.indexOf(findCol(["pract"])!) : -1;
        const colQuiz = findCol(["quiz"]) != null ? headerTokens.indexOf(findCol(["quiz"])!) : -1;
        const colEmail = headerTokens.findIndex((h) => h.includes("email"));

        if (colEmail < 0) {
          alert("CSV must contain an Email column");
          setImporting(false);
          return;
        }

        let matchedCount = 0;

        const importedRows: Record<string, Partial<StudentRow>> = {};
        lines.slice(1).forEach((line) => {
          const values =
            line.match(/"[^"]*"|[^,]+/g)?.map((v) => v.replace(/^"|"$/g, "")) ?? [];
          const email = (values[colEmail] || "").trim().toLowerCase();
          if (!email) return;

          const manual: (number | null)[] = colManual.map((idx) =>
            idx != null && values[idx] != null
              ? parseFloat(values[idx])
              : NaN,
          );
          const theoryVal =
            colTheory >= 0 && values[colTheory] != null
              ? parseFloat(values[colTheory])
              : NaN;
          const practicalVal =
            colPractical >= 0 && values[colPractical] != null
              ? parseFloat(values[colPractical])
              : NaN;
          const quizVal =
            colQuiz >= 0 && values[colQuiz] != null
              ? parseFloat(values[colQuiz])
              : NaN;

          importedRows[email] = {
            manual: manual.map((v) => (Number.isFinite(v) ? v : null)),
            theory: Number.isFinite(theoryVal) ? theoryVal : null,
            practical: Number.isFinite(practicalVal) ? practicalVal : null,
            quiz: Number.isFinite(quizVal) ? quizVal : null,
          };
        });

        setStudents((prev) =>
          prev.map((student) => {
            const imported = importedRows[student.email.toLowerCase()];
            if (!imported) return student;
            matchedCount += 1;
            return recomputeRow(student, {
              quiz: imported.quiz ?? student.quiz,
              manual:
                imported.manual && imported.manual.some((v) => v != null)
                  ? imported.manual
                  : student.manual,
              theory: imported.theory ?? student.theory,
              practical: imported.practical ?? student.practical,
            });
          }),
        );

        if (matchedCount === 0) {
          alert("No matching students found. Check emails in CSV.");
        } else {
          setChangedGrades((prev) => new Set(prev));
          alert(
            `Imported marks for ${matchedCount} student(s). Click "Save All" to save.`,
          );
        }
      } catch (error) {
        console.error("Error importing CSV:", error);
        alert("Failed to import CSV file. Please check the file format.");
      } finally {
        setImporting(false);
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      alert("Failed to read file");
      setImporting(false);
    };

    reader.readAsText(file);
  };

  const filteredStudents = students
    .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "total") return b.total - a.total;
      return b.gp - a.gp;
    });

  const stats = {
    classAverage:
      students.length > 0
        ? (students.reduce((acc, s) => acc + s.total, 0) / students.length).toFixed(1)
        : "0.0",
    highestScore:
      students.length > 0 ? Math.max(...students.map((s) => s.total)) : 0,
    lowestScore:
      students.length > 0 ? Math.min(...students.map((s) => s.total)) : 0,
    excellentCount: students.filter((s) => s.status === "excellent").length,
    failingCount: students.filter((s) => s.status === "failing").length,
  };

  const totalCols =
    1 + 1 +
    (columnMeta.hasQuiz ? 1 : 0) +
    columnMeta.manualCount +
    1 +
    (columnMeta.hasPractical ? 1 : 0) +
    3 +
    1 +
    1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-lavender/10 blur-3xl" />
      </div>

      <main className="px-3 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 sm:space-y-4"
        >
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl hero-gradient text-white p-5 sm:p-8 shadow-2xl">
            <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                    <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium uppercase tracking-widest text-white/70">
                    Grade Management
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-4xl text-white leading-tight">
                  {buildGreeting()}, {user?.email?.split("@")[0] || "Lecturer"}
                </h1>
                <p className="max-w-md text-xs sm:text-sm text-white/80 leading-relaxed">
                  Track, manage and compute student grades with a configurable grading scheme.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] sm:text-xs text-white">
                    <Award className="h-3 w-3" />
                    {todayLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] sm:text-xs text-white">
                    {students.length} students
                  </span>
                  {changedGrades.size > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-amber px-3 py-1 text-[11px] sm:text-xs font-semibold text-navy shadow-glow">
                      {changedGrades.size} unsaved
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full lg:w-auto">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="px-3 sm:px-4 py-2.5 rounded-xl border border-white/25 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 text-xs sm:text-sm [&>option]:bg-white [&>option]:text-navy w-full lg:w-72"
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.title}
                    </option>
                  ))}
                </select>

                <div className="flex gap-1 sm:gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 flex-1 sm:flex-none border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    onClick={() => setSchemeOpen(true)}
                    disabled={!selectedCourse}
                  >
                    <Settings2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Grading Scheme</span>
                    <span className="sm:hidden">Scheme</span>
                  </Button>

                  <Button
                    onClick={saveAllGrades}
                    disabled={saving || students.length === 0}
                    className="bg-gradient-to-r from-emerald to-teal gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 flex-1 sm:flex-none text-white hover:shadow-glow"
                  >
                    <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">
                      {saving ? "Saving..." : "Save All"}
                    </span>
                    <span className="sm:hidden">{saving ? "..." : "Save"}</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 flex-1 sm:flex-none border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    onClick={handleExportGrades}
                    disabled={students.length === 0}
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>

                  <Button
                    className="bg-gradient-to-r from-primary to-accent gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 flex-1 sm:flex-none text-primary-foreground hover:shadow-glow"
                    onClick={() =>
                      document.getElementById("grade-import")?.click()
                    }
                    disabled={importing}
                  >
                    <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">
                      {importing ? "Importing..." : "Import"}
                    </span>
                  </Button>

                  <input
                    id="grade-import"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleImportGrades}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Stats Grid */}
          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-5">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="overflow-hidden border-primary/30 bg-gradient-to-b from-primary/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Class Average</p>
                      <p className="text-lg sm:text-2xl font-bold">{stats.classAverage}</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3 text-emerald" />
                    across students
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="overflow-hidden border-emerald/30 bg-gradient-to-b from-emerald/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-to-r from-emerald to-teal" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Highest</p>
                      <p className="text-lg sm:text-2xl font-bold text-emerald">{stats.highestScore}</p>
                    </div>
                    <div className="rounded-lg bg-emerald/10 p-1.5 text-emerald">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3 text-emerald" />
                    top score
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="overflow-hidden border-red-300/30 bg-gradient-to-b from-red-500/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-to-r from-red-500 to-orange-500" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Lowest</p>
                      <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.lowestScore}</p>
                    </div>
                    <div className="rounded-lg bg-red-500/10 p-1.5 text-red-600">
                      <ArrowDownRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                    bottom score
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="hidden sm:block">
              <Card className="overflow-hidden border-blue-400/30 bg-gradient-to-b from-blue-500/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-teal" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Excellent</p>
                      <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.excellentCount}</p>
                    </div>
                    <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600">
                      <Award className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-emerald" />
                    A-grade students
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="hidden sm:block">
              <Card className="overflow-hidden border-orange-400/30 bg-gradient-to-b from-orange-500/10 to-card/70">
                <CardContent className="pt-0">
                  <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-coral" />
                  <div className="flex items-start justify-between gap-2 pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Failing</p>
                      <p className="text-lg sm:text-2xl font-bold text-orange-600">{stats.failingCount}</p>
                    </div>
                    <div className="rounded-lg bg-orange-500/10 p-1.5 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                    need attention
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 bg-card/70 backdrop-blur-lg rounded-2xl border border-border/60 p-3 sm:px-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-xs sm:text-sm"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {changedGrades.size > 0 && (
                <Badge className="bg-amber/15 text-amber-dark border-amber/40 whitespace-nowrap text-xs">
                  {changedGrades.size} unsaved
                </Badge>
              )}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 sm:px-4 py-2 rounded-lg border border-border/60 bg-muted/50 text-foreground focus:outline-none text-xs sm:text-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="total">Sort by Score</option>
                <option value="grade">Sort by Grade</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Grade Table */}
        <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-lg">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-teal" />
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              {filteredStudents.length} Students
              <span className="text-xs font-normal text-muted-foreground">
                (CW {scheme.coursework_weight}% / Exam {scheme.exam_weight}%
                {scheme.quiz_weight > 0 ? `, quiz ${scheme.quiz_weight}%` : ""}
                {scheme.exam_mode === "THEORY_PRACTICAL" ? `, T${scheme.exam_theory_weight}/P${scheme.exam_practical_weight}` : ""}
                , best-{scheme.best_n})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs sm:text-sm min-w-max">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold sticky left-0 bg-muted z-10 uppercase text-[11px] tracking-wide">
                      Student
                    </th>
                    {columnMeta.hasQuiz && (
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap uppercase text-[11px] tracking-wide bg-primary/5">
                        Quiz{scheme.quiz_weight > 0 ? ` ${scheme.quiz_weight}%` : ""}
                      </th>
                    )}
                    {columnMeta.manualLabels.map((label, i) => (
                      <th key={i} className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap uppercase text-[11px] tracking-wide">
                        {label}
                      </th>
                    ))}
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap uppercase text-[11px] tracking-wide">
                      Theory {scheme.exam_theory_weight}%
                    </th>
                    {columnMeta.hasPractical && (
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap uppercase text-[11px] tracking-wide">
                        Practical {scheme.exam_practical_weight}%
                      </th>
                    )}
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap uppercase text-[11px] tracking-wide">
                      Total
                    </th>
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap uppercase text-[11px] tracking-wide">
                      Grade
                    </th>
                    <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold whitespace-nowrap uppercase text-[11px] tracking-wide">
                      GP
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 text-center font-semibold whitespace-nowrap uppercase text-[11px] tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={totalCols} className="px-4 py-6 sm:py-8 text-center text-muted-foreground">
                        Loading students and grades...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={totalCols} className="px-4 py-6 sm:py-8 text-center text-muted-foreground">
                        {selectedCourse
                          ? "No enrolled students found"
                          : "Please select a course"}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, i) => (
                      <motion.tr
                        key={student.id}
                        variants={rise}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold text-foreground text-xs sm:text-sm sticky left-0 bg-card z-10">
                          <div className="flex flex-col">
                            <span className="truncate">{student.name}</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                              {student.email}
                            </span>
                          </div>
                        </td>
                        {columnMeta.hasQuiz && (
                          <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                            <span className={`text-xs sm:text-sm font-semibold ${
                              student.quiz != null && student.quiz >= 70
                                ? "text-emerald"
                                : student.quiz != null && student.quiz >= 50
                                  ? "text-amber-dark"
                                  : student.quiz != null
                                    ? "text-red-600"
                                    : "text-muted-foreground"
                            }`}>
                              {student.quiz != null ? `${student.quiz}%` : "—"}
                            </span>
                          </td>
                        )}
                        {columnMeta.manualLabels.map((_, idx) => (
                          <td key={idx} className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={student.manual[idx] ?? ""}
                              onChange={(e) =>
                                updateManual(student.id, idx, parseFloat(e.target.value) || 0)
                              }
                              className="w-12 sm:w-14 px-1 sm:px-2 py-1 text-center text-xs sm:text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                          </td>
                        ))}
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={student.theory ?? ""}
                            onChange={(e) =>
                              updateTheory(student.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-12 sm:w-14 px-1 sm:px-2 py-1 text-center text-xs sm:text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                          />
                        </td>
                        {columnMeta.hasPractical && (
                          <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={student.practical ?? ""}
                              onChange={(e) =>
                                updatePractical(student.id, parseFloat(e.target.value) || 0)
                              }
                              className="w-12 sm:w-14 px-1 sm:px-2 py-1 text-center text-xs sm:text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                            />
                          </td>
                        )}
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary text-xs sm:text-sm">
                            {student.total.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                          <Badge className={getStatusColor(student.status)}>
                            {student.grade}
                          </Badge>
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold text-xs sm:text-sm">
                          {student.gp.toFixed(2)}
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 text-center">
                          <Badge className={getStatusColor(student.status)}>
                            {student.status}
                          </Badge>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Results */}
        {quizResults.length > 0 && (
          <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-lg">
            <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-teal" />
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Quiz Results ({quizResults.length} attempts)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-max">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40">
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold uppercase text-[11px] tracking-wide">Student</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold uppercase text-[11px] tracking-wide">Quiz</th>
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold uppercase text-[11px] tracking-wide">Score</th>
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold uppercase text-[11px] tracking-wide">%</th>
                      <th className="hidden sm:table-cell px-3 py-3 text-center font-semibold uppercase text-[11px] tracking-wide">Time</th>
                      <th className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold uppercase text-[11px] tracking-wide">Status</th>
                      <th className="hidden sm:table-cell px-3 py-3 text-center font-semibold uppercase text-[11px] tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizResults.map((attempt: any, idx: number) => (
                      <motion.tr
                        key={attempt.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-border/30 hover:bg-muted/20"
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium">{attempt.student_name}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-muted-foreground">{attempt.quiz_title}</td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center font-semibold">
                          {attempt.score}/{attempt.total_points}
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                          <span className={`font-semibold ${
                            attempt.percentage >= 70 ? "text-emerald" :
                            attempt.percentage >= 50 ? "text-amber-dark" : "text-red-600"
                          }`}>
                            {attempt.percentage}%
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 text-center text-muted-foreground">
                          {attempt.time_taken != null ? `${Math.floor(attempt.time_taken / 60)}:${String(attempt.time_taken % 60).padStart(2, "0")}` : "-"}
                        </td>
                        <td className="px-1 sm:px-3 py-2 sm:py-3 text-center">
                          <Badge className={attempt.passed ? "bg-emerald/15 text-emerald border-emerald/40" : "bg-red-500/15 text-red-600 border-red-300/40"}>
                            {attempt.passed ? "Passed" : "Failed"}
                          </Badge>
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 text-center text-muted-foreground text-xs">
                          {attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString() : "-"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <GradingSchemeDialog
        open={schemeOpen}
        onOpenChange={setSchemeOpen}
        courseLabel={
          courses.find((c) => c.id === selectedCourse)?.code ||
          "this course"
        }
        scheme={scheme}
        saving={schemeSaving}
        onSave={handleSaveScheme}
      />

      <LecturerBottomNav />
    </div>
  );
}