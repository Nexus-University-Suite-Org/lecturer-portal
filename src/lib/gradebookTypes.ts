export interface GradeThreshold {
  grade: string;
  min: number;
  gp: number;
}

export interface GradebookScheme {
  course_id?: number;
  coursework_weight: number;
  exam_weight: number;
  exam_mode: "THEORY" | "THEORY_PRACTICAL";
  exam_theory_weight: number;
  exam_practical_weight: number;
  quiz_weight: number;
  best_n: number;
  manual_coursework_items: number;
  item_labels: string[];
  grade_scale: GradeThreshold[];
  updated_at?: string;
}

export const DEFAULT_GRADE_SCALE: GradeThreshold[] = [
  { grade: "A", min: 90, gp: 4.0 },
  { grade: "B+", min: 80, gp: 3.3 },
  { grade: "B", min: 70, gp: 3.0 },
  { grade: "C", min: 60, gp: 2.0 },
  { grade: "D", min: 50, gp: 1.0 },
  { grade: "F", min: 0, gp: 0 },
];

export const defaultScheme = (courseId?: number): GradebookScheme => ({
  course_id: courseId,
  coursework_weight: 40,
  exam_weight: 60,
  exam_mode: "THEORY",
  exam_theory_weight: 60,
  exam_practical_weight: 0,
  quiz_weight: 0,
  best_n: 2,
  manual_coursework_items: 3,
  item_labels: ["Coursework 1", "Coursework 2", "Coursework 3"],
  grade_scale: DEFAULT_GRADE_SCALE,
});

export function parseScheme(raw: any): GradebookScheme {
  const fallback = defaultScheme(raw?.course_id);
  if (!raw || typeof raw !== "object") return fallback;

  let labels: string[] = [];
  try {
    labels =
      typeof raw.item_labels === "string"
        ? JSON.parse(raw.item_labels)
        : Array.isArray(raw.item_labels)
          ? raw.item_labels
          : [];
  } catch {
    labels = [];
  }

  let scale: GradeThreshold[] = [];
  try {
    scale =
      typeof raw.grade_scale === "string"
        ? JSON.parse(raw.grade_scale)
        : Array.isArray(raw.grade_scale)
          ? raw.grade_scale
          : [];
  } catch {
    scale = [];
  }

  const count = Math.max(1, Number(raw.manual_coursework_items ?? 3) || 3);
  const mode: "THEORY" | "THEORY_PRACTICAL" =
    raw.exam_mode === "THEORY_PRACTICAL" ? "THEORY_PRACTICAL" : "THEORY";

  return {
    course_id: raw.course_id ?? raw.courseId ?? fallback.course_id,
    coursework_weight:
      Number(raw.coursework_weight ?? fallback.coursework_weight) || 0,
    exam_weight: Number(raw.exam_weight ?? 100) || 0,
    exam_mode: mode,
    exam_theory_weight:
      Number(raw.exam_theory_weight ?? fallback.exam_theory_weight) || 0,
    exam_practical_weight:
      Number(raw.exam_practical_weight ?? fallback.exam_practical_weight) || 0,
    quiz_weight: Number(raw.quiz_weight ?? fallback.quiz_weight) || 0,
    best_n: Math.max(1, Number(raw.best_n ?? 1) || 1),
    manual_coursework_items: count,
    item_labels:
      labels.length >= count
        ? labels.slice(0, count)
        : Array.from(
            { length: count },
            (_, i) => labels[i] || `Coursework ${i + 1}`,
          ),
    grade_scale:
      scale.length > 0
        ? scale.some((t) => t.min <= 0)
          ? scale
          : [...scale, { grade: "F", min: 0, gp: 0 }]
        : fallback.grade_scale,
    updated_at: raw.updated_at,
  };
}

export function gradeFromTotal(
  total: number,
  scale: GradeThreshold[],
): { grade: string; gp: number } {
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  for (const t of sorted) {
    if (total >= t.min) return { grade: t.grade, gp: t.gp };
  }
  const lowest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  if (!lowest) return { grade: "F", gp: 0 };
  return lowest.min <= 0
    ? { grade: lowest.grade, gp: lowest.gp }
    : { grade: "F", gp: 0 };
}

const clamp101 = (v: number) => Math.max(0, Math.min(100, v));

export interface StudentMarks {
  quiz: number | null;
  manual: (number | null)[];
  theory: number | null;
  practical: number | null;
}

export interface MarksBreakdown {
  quiz: number;
  coursework: number;
  theory: number;
  practical: number;
}

export function computeTotal(
  scheme: GradebookScheme,
  marks: StudentMarks,
): { total: number; breakdown: MarksBreakdown } {
  const cw = scheme.coursework_weight || 0;
  const qw = scheme.quiz_weight || 0;
  const m = scheme.manual_coursework_items || 0;
  const k = Math.max(1, scheme.best_n || 1);

  const quiz =
    qw > 0 && marks.quiz != null ? (qw / 100) * clamp101(marks.quiz) : 0;

  let coursework = 0;
  const share = m > 0 ? Math.max(0, cw - qw) / k : 0;
  if (share > 0 && m > 0) {
    const values = marks.manual.slice(0, m).map((v) => clamp101(v ?? 0));
    const kept = [...values].sort((a, b) => b - a).slice(0, k);
    coursework = (share / 100) * kept.reduce((s, v) => s + v, 0);
  }

  const tw = scheme.exam_theory_weight || 0;
  const pw =
    scheme.exam_mode === "THEORY_PRACTICAL"
      ? scheme.exam_practical_weight || 0
      : 0;

  const theory = tw > 0 ? (tw / 100) * clamp101(marks.theory ?? 0) : 0;
  const practical =
    pw > 0 ? (pw / 100) * clamp101(marks.practical ?? 0) : 0;

  const total = quiz + coursework + theory + practical;
  return { total, breakdown: { quiz, coursework, theory, practical } };
}

export function marksToJson(marks: StudentMarks): string {
  return JSON.stringify({
    quiz: marks.quiz,
    manual: marks.manual.map((score) =>
      score == null ? null : { score },
    ),
    theory: marks.theory,
    practical: marks.practical,
  });
}

export function parseMarksJson(
  raw: string | null | undefined,
): StudentMarks | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      quiz:
        parsed.quiz != null
          ? typeof parsed.quiz === "number"
            ? parsed.quiz
            : null
          : null,
      manual: Array.isArray(parsed.manual)
        ? parsed.manual.map((item: any) =>
            typeof item === "number"
              ? item
              : item?.score != null
                ? Number(item.score)
                : null,
          )
        : [],
      theory:
        parsed.theory != null
          ? typeof parsed.theory === "number"
            ? parsed.theory
            : null
          : null,
      practical:
        parsed.practical != null
          ? typeof parsed.practical === "number"
            ? parsed.practical
            : null
          : null,
    };
  } catch {
    return null;
  }
}