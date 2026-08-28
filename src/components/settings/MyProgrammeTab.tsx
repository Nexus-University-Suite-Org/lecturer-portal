import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Award,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  FileText,
  Building,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend } from "@/lib/backendApi";

export function MyProgrammeTab() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programmeData, setProgrammeData] = useState({
    totalCredits: 0,
    completedCredits: 0,
    requiredCredits: 120,
    gpa: 0,
    currentYear: 1,
    totalYears: 3,
    coursesCompleted: 0,
    coursesRemaining: 0,
  });

  const [programmeInfo, setProgrammeInfo] = useState({
    name: "Loading...",
    code: "...",
    department: profile?.department || "Loading...",
    college: profile?.college || "Loading...",
    duration: "...",
    duration_years: 3,
    intake: "August 2023",
    expectedGraduation: "...",
    mode: "Full-time",
    campus: "Main Campus",
  });

  useEffect(() => {
    const fetchProgrammeData = async () => {
      if (!profile || !user?.uid) {
        setLoading(false);
        return;
      }

      try {
        let targetCourseId = profile.course_id;
        let resolvedTotalYears = 3;

        // Find course ID if missing
        if (!targetCourseId && profile.programme) {
          const courses = await getBackend<any[]>(
            `/api/courses/?name=${encodeURIComponent(profile.programme)}`,
          );
          if (courses.length > 0) {
            targetCourseId = courses[0].id;
          }
        }

        // Fetch course details
        if (targetCourseId) {
          const courseData = await getBackend<any>(
            `/api/courses/${targetCourseId}/`,
          );
          const durationYears = courseData.duration_years || 3;
          resolvedTotalYears = durationYears;
          setProgrammeData((prev) => ({
            ...prev,
            totalYears: durationYears,
          }));

          setProgrammeInfo((prev) => ({
            ...prev,
            name: courseData.name || profile.programme || prev.name,
            code: courseData.code || prev.code,
            department:
              courseData.department || profile.department || prev.department,
            college: courseData.college || profile.college || prev.college,
            duration: `${durationYears} Years`,
            duration_years: durationYears,
          }));
        } else if (profile.programme) {
          setProgrammeInfo((prev) => ({
            ...prev,
            name: profile.programme || prev.name,
          }));
        }

        const safeTotalYears = Math.max(1, resolvedTotalYears || 3);

        // Determine required credits from the selected course where available.
        let requiredCredits = 120;
        if (targetCourseId) {
          const courseData = await getBackend<any>(
            `/api/courses/${targetCourseId}/`,
          );
          requiredCredits =
            Number(courseData.required_credits) ||
            Number(courseData.total_credits) ||
            requiredCredits;
        }

        // Pull results from student_grades
        let resultRows: any[] = [];
        try {
          resultRows = await getBackend<any[]>(
            `/api/student-grades/?student_id=${user.uid}`,
          );
        } catch {
          resultRows = [];
        }

        // Build a map of course credits for weighted GPA and credit completion.
        const courseIds = Array.from(
          new Set(resultRows.map((r: any) => r.course_id).filter(Boolean)),
        );
        const creditMap = new Map<string, number>();

        if (courseIds.length > 0) {
          const courseUnits = await getBackend<any[]>("/api/course-units/");
          courseUnits.forEach((cu: any) => {
            if (courseIds.includes(cu.id)) {
              creditMap.set(cu.id, Number(cu.credits) || 3);
            }
          });

          // Try courses for any remaining
          const courses = await getBackend<any[]>("/api/courses/");
          courses.forEach((c: any) => {
            if (courseIds.includes(c.id) && !creditMap.has(c.id)) {
              creditMap.set(c.id, Number(c.credits) || 3);
            }
          });
        }

        let totalWeightedPoints = 0;
        let totalWeightedCredits = 0;
        let completedCredits = 0;

        resultRows.forEach((row: any) => {
          const credits = creditMap.get(row.course_id) || 3;
          const gp = Number(row.gp ?? row.grade_point ?? 0);
          totalWeightedPoints += gp * credits;
          totalWeightedCredits += credits;

          if (gp > 0) {
            completedCredits += credits;
          }
        });

        const cgpa =
          totalWeightedCredits > 0
            ? Number((totalWeightedPoints / totalWeightedCredits).toFixed(2))
            : 0;

        const coursesCompleted = resultRows.filter(
          (row: any) => Number(row.gp ?? row.grade_point ?? 0) > 0,
        ).length;
        const approxTotalCourses = Math.max(
          coursesCompleted,
          Math.ceil(requiredCredits / 3),
        );
        const coursesRemaining = Math.max(
          0,
          approxTotalCourses - coursesCompleted,
        );
        const currentYear = Math.min(
          safeTotalYears,
          Math.max(
            1,
            Math.ceil(
              (completedCredits / Math.max(1, requiredCredits)) *
                safeTotalYears,
            ),
          ),
        );

        setProgrammeData((prev) => ({
          ...prev,
          requiredCredits,
          completedCredits,
          totalCredits: totalWeightedCredits,
          gpa: cgpa,
          currentYear,
          coursesCompleted,
          coursesRemaining,
        }));
      } catch (error) {
        console.error("Error fetching programme data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgrammeData();
  }, [profile, user?.uid]);

  const progressPercentage =
    (programmeData.completedCredits / programmeData.requiredCredits) * 100 || 0;
  const yearProgress =
    (programmeData.currentYear / programmeData.totalYears) * 100 || 0;

  // Dynamically generate milestones based on total years
  const milestones = Array.from(
    { length: Math.min(programmeData.totalYears, 7) },
    (_, i) => {
      const year = i + 1;
      let name = "Development Phase";
      if (year === 1) name = "Foundation Year";
      else if (year === programmeData.totalYears) name = "Final Year";
      else if (year === programmeData.totalYears - 1) name = "Specialization";

      let status = "upcoming";
      if (year < programmeData.currentYear) status = "completed";
      else if (year === programmeData.currentYear) status = "current";

      return {
        year,
        name,
        status,
        courses: 10,
        credits: 30,
      };
    },
  );

  const coreAreas = [
    {
      name: "Programming & Software",
      progress: 80,
      color: "from-primary to-primary/50",
    },
    {
      name: "Mathematics & Theory",
      progress: 65,
      color: "from-secondary to-secondary/50",
    },
    {
      name: "Systems & Networks",
      progress: 45,
      color: "from-accent to-accent/50",
    },
    {
      name: "Project & Research",
      progress: 20,
      color: "from-amber-500 to-amber-500/50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Programme Header */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-transparent to-secondary/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl" />
        <CardContent className="pt-6 relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {programmeInfo.name}
                </h2>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="outline">{programmeInfo.code}</Badge>
                  <Badge variant="secondary">{programmeInfo.mode}</Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-0">
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {programmeInfo.department} • {programmeInfo.college}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm">
                <p className="text-3xl font-bold text-primary">
                  {programmeData.gpa}
                </p>
                <p className="text-xs text-muted-foreground">Current CGPA</p>
              </div>
              <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm">
                <p className="text-3xl font-bold text-secondary">
                  Year {programmeData.currentYear}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {programmeData.totalYears}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Degree Progress
            </CardTitle>
            <CardDescription>Track your journey to graduation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Credit Completion</span>
                <span className="text-sm text-muted-foreground">
                  {programmeData.completedCredits} /{" "}
                  {programmeData.requiredCredits} credits
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                {progressPercentage.toFixed(0)}% of total credits completed
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Course Completion</span>
                <span className="text-sm text-muted-foreground">
                  {programmeData.coursesCompleted} /{" "}
                  {programmeData.coursesCompleted +
                    programmeData.coursesRemaining}{" "}
                  courses
                </span>
              </div>
              <Progress
                value={
                  (programmeData.coursesCompleted /
                    (programmeData.coursesCompleted +
                      programmeData.coursesRemaining)) *
                  100
                }
                className="h-3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <Calendar className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Expected Graduation
                </p>
                <p className="font-semibold text-sm">
                  {programmeInfo.expectedGraduation}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <Clock className="h-5 w-5 mx-auto mb-2 text-secondary" />
                <p className="text-xs text-muted-foreground">Time Remaining</p>
                <p className="font-semibold text-sm">2 Years, 8 Months</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              Core Areas Progress
            </CardTitle>
            <CardDescription>
              Competency in different programme areas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {coreAreas.map((area, i) => (
              <motion.div
                key={area.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{area.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {area.progress}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${area.progress}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={`h-full rounded-full bg-gradient-to-r ${area.color}`}
                  />
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Programme Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" />
            Programme Milestones
          </CardTitle>
          <CardDescription>
            Your academic journey through the years
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-muted" />

            <div className="space-y-6">
              {milestones.map((milestone, i) => (
                <motion.div
                  key={milestone.year}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="relative flex gap-4"
                >
                  <div
                    className={`relative z-10 h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      milestone.status === "completed"
                        ? "bg-emerald-500 text-white"
                        : milestone.status === "current"
                          ? "bg-gradient-to-br from-primary to-secondary text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="text-lg font-bold">Y{milestone.year}</span>
                  </div>
                  <div
                    className={`flex-1 p-4 rounded-xl ${
                      milestone.status === "current"
                        ? "bg-primary/10 border-2 border-primary/20"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{milestone.name}</h4>
                        <Badge
                          className={`${
                            milestone.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : milestone.status === "current"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {milestone.status === "completed"
                            ? "Completed"
                            : milestone.status === "current"
                              ? "In Progress"
                              : "Upcoming"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {milestone.courses} Courses
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {milestone.credits} Credits
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Programme Details */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building, label: "Campus", value: programmeInfo.campus },
          { icon: Calendar, label: "Intake", value: programmeInfo.intake },
          { icon: Clock, label: "Duration", value: programmeInfo.duration },
          { icon: Users, label: "Mode", value: programmeInfo.mode },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="pt-6 text-center">
                <item.icon className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground mb-1">
                  {item.label}
                </p>
                <p className="font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
