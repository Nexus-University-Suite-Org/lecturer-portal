import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Edit2, Save, X, Calculator, Download, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getBackend, postBackend } from "@/lib/backendApi";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { useToast } from "@/hooks/use-toast";

interface StudentMark {
  id: string;
  student_id: string;
  student_name: string;
  coursework: number;
  test: number;
  quiz: number;
  assignment: number;
  mid_exam: number;
  final_exam: number;
  total: number;
  grade: string;
  gp: number;
}

interface Course {
  id: string;
  code: string;
  title: string;
}

const rise = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

const calculateGrade = (total: number) => {
  if (total >= 80) return { grade: "A", gp: 4.0 };
  if (total >= 75) return { grade: "A-", gp: 3.7 };
  if (total >= 70) return { grade: "B+", gp: 3.3 };
  if (total >= 65) return { grade: "B", gp: 3.0 };
  if (total >= 60) return { grade: "B-", gp: 2.7 };
  if (total >= 55) return { grade: "C+", gp: 2.3 };
  if (total >= 50) return { grade: "C", gp: 2.0 };
  if (total >= 45) return { grade: "C-", gp: 1.7 };
  if (total >= 40) return { grade: "D", gp: 1.0 };
  return { grade: "F", gp: 0 };
};

const calculateSemesterRemark = (gp: number, grade: string): string => {
  if (gp >= 3.5) return "Excellent";
  if (gp >= 3.0) return "Very Good";
  if (gp >= 2.5) return "Good";
  if (gp >= 2.0) return "Satisfactory";
  if (gp >= 1.0) return "Pass";
  return "Fail";
};

export default function MarksManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<StudentMark>>({});

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await getBackend<Course[]>("/api/courses/");
      setCourses(data || []);
      if (data && data.length > 0) {
        loadStudents(data[0]);
        setSelectedCourse(data[0]);
      }
    } catch (error) {
      console.error("Error loading courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (course: Course) => {
    try {
      const enrollments = await getBackend<any[]>("/api/enrollments/?course_id=" + course.id);
      const studentIds: string[] = enrollments.map((e) => e.student_id).filter(Boolean);

      if (studentIds.length === 0) {
        setStudents([]);
        return;
      }

      const profiles = await getBackend<any[]>("/api/profiles/");
      const profileMap = new Map<string, any>();
      profiles.forEach((p) => profileMap.set(p.id, p));

      const grades = await getBackend<any[]>("/api/student-grades/?course_id=" + course.id);
      const gradesMap = new Map<string, any>();
      grades.forEach((g) => gradesMap.set(g.student_id, g));

      const marks = studentIds.map((sid) => {
        const p = profileMap.get(sid);
        const existingGrade = gradesMap.get(sid);
        const coursework = Number(existingGrade?.assignment1 ?? 0);
        const test = Number(existingGrade?.assignment2 ?? 0);
        const quiz = Number(existingGrade?.participation ?? 0);
        const assignment = Number(existingGrade?.coursework_extra ?? 0);
        const mid_exam = Number(existingGrade?.midterm ?? 0);
        const final_exam = Number(existingGrade?.final_exam ?? 0);
        const total = Number(
          existingGrade?.total ??
            Math.round(
              (coursework + test + quiz + assignment + mid_exam + final_exam) *
                10,
            ) / 10,
        );
        const computed = calculateGrade(total);

        return {
          id: sid,
          student_id: sid,
          student_name: p?.full_name || "Unknown Student",
          coursework,
          test,
          quiz,
          assignment,
          mid_exam,
          final_exam,
          total,
          grade: existingGrade?.grade || computed.grade,
          gp: Number(existingGrade?.gp ?? computed.gp),
        };
      });

      setStudents(
        marks.sort((a, b) => a.student_name.localeCompare(b.student_name)),
      );
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const handleEdit = (student: StudentMark) => {
    setEditing(student.id);
    setEditValues(student);
  };

  const handleSave = async (student: StudentMark) => {
    if (!selectedCourse || !user) return;

    const cw = editValues.coursework ?? student.coursework;
    const test = editValues.test ?? student.test;
    const quiz = editValues.quiz ?? student.quiz;
    const assign = editValues.assignment ?? student.assignment;
    const mid = editValues.mid_exam ?? student.mid_exam;
    const final = editValues.final_exam ?? student.final_exam;
    const total =
      Math.round((cw + test + quiz + assign + mid + final) * 10) / 10;
    const { grade, gp } = calculateGrade(total);

    const updated = {
      ...student,
      coursework: cw,
      test,
      quiz,
      assignment: assign,
      mid_exam: mid,
      final_exam: final,
      total,
      grade,
      gp,
    };

    try {
      await postBackend("/api/student-grades/", {
        student_id: student.student_id,
        course_id: selectedCourse.id,
        lecturer_id: user.uid,
        assignment1: cw,
        assignment2: test,
        participation: quiz,
        coursework_extra: assign,
        midterm: mid,
        final_exam: final,
        total,
        grade,
        gp,
      });

      setStudents(students.map((s) => (s.id === student.id ? updated : s)));
      setEditing(null);
      setEditValues({});
      toast({
        title: "Marks saved",
        description: `${student.student_name}'s marks were updated successfully.`,
      });
    } catch (error) {
      console.error("Error saving marks:", error);
      toast({
        title: "Save failed",
        description: "Could not persist marks. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
        <LecturerHeader />
        <div className="flex items-center justify-center h-screen">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">
      <LecturerHeader />
      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Marks Management</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" /> Import
              </Button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => {
                  setSelectedCourse(course);
                  loadStudents(course);
                }}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  selectedCourse?.id === course.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 hover:bg-muted"
                }`}
              >
                {course.code}
              </button>
            ))}
          </div>
        </motion.div>

        {selectedCourse && (
          <Card className="border-border/60 bg-card/70 backdrop-blur-lg">
            <CardHeader>
              <CardTitle>
                {selectedCourse.code} - {selectedCourse.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {students.length} students
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="px-3 py-2 text-left">Student</th>
                      <th className="px-2 py-2 text-center">CW</th>
                      <th className="px-2 py-2 text-center">Test</th>
                      <th className="px-2 py-2 text-center">Quiz</th>
                      <th className="px-2 py-2 text-center">Assign</th>
                      <th className="px-2 py-2 text-center">Mid</th>
                      <th className="px-2 py-2 text-center">Final</th>
                      <th className="px-2 py-2 text-center">Total</th>
                      <th className="px-2 py-2 text-center">Grade</th>
                      <th className="px-2 py-2 text-center">GP</th>
                      <th className="px-2 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <motion.tr
                        key={s.id}
                        variants={rise}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        className="border-b border-border/60 hover:bg-muted/30"
                      >
                        <td className="px-3 py-2 font-medium">
                          {s.student_name}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing === s.id ? (
                            <Input
                              type="number"
                              step="0.5"
                              max="30"
                              value={editValues.coursework ?? s.coursework}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  coursework: parseFloat(e.target.value),
                                })
                              }
                              className="w-12 h-8 text-center text-xs"
                            />
                          ) : (
                            s.coursework
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing === s.id ? (
                            <Input
                              type="number"
                              step="0.5"
                              max="10"
                              value={editValues.test ?? s.test}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  test: parseFloat(e.target.value),
                                })
                              }
                              className="w-12 h-8 text-center text-xs"
                            />
                          ) : (
                            s.test
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing === s.id ? (
                            <Input
                              type="number"
                              step="0.5"
                              max="10"
                              value={editValues.quiz ?? s.quiz}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  quiz: parseFloat(e.target.value),
                                })
                              }
                              className="w-12 h-8 text-center text-xs"
                            />
                          ) : (
                            s.quiz
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing === s.id ? (
                            <Input
                              type="number"
                              step="0.5"
                              max="20"
                              value={editValues.assignment ?? s.assignment}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  assignment: parseFloat(e.target.value),
                                })
                              }
                              className="w-12 h-8 text-center text-xs"
                            />
                          ) : (
                            s.assignment
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing === s.id ? (
                            <Input
                              type="number"
                              step="0.5"
                              max="15"
                              value={editValues.mid_exam ?? s.mid_exam}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  mid_exam: parseFloat(e.target.value),
                                })
                              }
                              className="w-12 h-8 text-center text-xs"
                            />
                          ) : (
                            s.mid_exam
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing === s.id ? (
                            <Input
                              type="number"
                              step="0.5"
                              max="100"
                              value={editValues.final_exam ?? s.final_exam}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  final_exam: parseFloat(e.target.value),
                                })
                              }
                              className="w-12 h-8 text-center text-xs"
                            />
                          ) : (
                            s.final_exam
                          )}
                        </td>
                        <td className="px-2 py-2 text-center font-semibold">
                          {s.total}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Badge
                            variant={
                              ["A", "A-", "B+", "B"].includes(s.grade)
                                ? "default"
                                : "secondary"
                            }
                          >
                            {s.grade}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-center">
                          {s.gp.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {editing === s.id ? (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => handleSave(s)}
                                className="p-1 hover:bg-green-100 rounded"
                              >
                                <Save className="h-4 w-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => setEditing(null)}
                                className="p-1 hover:bg-red-100 rounded"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(s)}
                              className="p-1 hover:bg-blue-100 rounded"
                            >
                              <Edit2 className="h-4 w-4 text-primary" />
                            </button>
                          )}
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
      <LecturerBottomNav />
    </div>
  );
}
