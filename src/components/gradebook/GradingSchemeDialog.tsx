import { useEffect, useState } from "react";
import { Settings2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GradeThreshold,
  GradebookScheme,
  defaultScheme,
} from "@/lib/gradebookTypes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseLabel: string;
  scheme: GradebookScheme;
  saving: boolean;
  onSave: (scheme: GradebookScheme) => Promise<void>;
}

export default function GradingSchemeDialog({
  open,
  onOpenChange,
  courseLabel,
  scheme,
  saving,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<GradebookScheme>(() => ({ ...scheme }));
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft({
        ...scheme,
        item_labels: [...scheme.item_labels],
        grade_scale: scheme.grade_scale.map((t) => ({ ...t })),
      });
      setError("");
    }
  }, [open, scheme]);

  const num = (v: any, fallback = 0) =>
    Number.isFinite(Number(v)) ? Number(v) : fallback;

  const set = <K extends keyof GradebookScheme>(key: K, value: GradebookScheme[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const cw = num(draft.coursework_weight);
  const ew = num(draft.exam_weight);
  const tw = num(draft.exam_theory_weight);
  const pw = num(draft.exam_practical_weight);
  const qw = num(draft.quiz_weight);

  const splitsOk =
    draft.exam_mode === "THEORY_PRACTICAL"
      ? Math.abs(tw + pw - 100) < 0.01
      : Math.abs(tw - 100) < 0.01;
  const cwOk = Math.abs(cw + ew - 100) < 0.01;

  const handleSave = async () => {
    if (!cwOk) {
      setError("Coursework + Final Exam must total 100%.");
      return;
    }
    if (!splitsOk) {
      setError(
        "Final Exam theory/practical split must total 100%.",
      );
      return;
    }
    if (draft.quiz_weight > 0 && draft.quiz_weight >= draft.coursework_weight) {
      setError("Quiz weight must be less than the total coursework weight.");
      return;
    }
    if (draft.best_n > draft.manual_coursework_items) {
      setError("Best-K cannot exceed the number of coursework items.");
      return;
    }
    setError("");
    await onSave(draft);
  };

  const updateScale = (index: number, field: keyof GradeThreshold, val: string) => {
    setDraft((prev) => {
      const scale = prev.grade_scale.map((t, i) =>
        i === index
          ? {
              ...t,
              [field]:
                field === "grade"
                  ? val
                  : field === "gp"
                    ? parseFloat(val)
                    : parseFloat(val),
            }
          : t,
      );
      return { ...prev, grade_scale: scale };
    });
  };

  const removeScale = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      grade_scale: prev.grade_scale.filter((_, i) => i !== index),
    }));
  };

  const addScale = () => {
    setDraft((prev) => ({
      ...prev,
      grade_scale: [...prev.grade_scale, { grade: "A", min: 0, gp: 0.0 }],
    }));
  };

  const updateLabel = (index: number, val: string) => {
    setDraft((prev) => {
      const labels = prev.item_labels.map((l, i) => (i === index ? val : l));
      return { ...prev, item_labels: labels };
    });
  };

  const manualCount = Math.max(1, num(draft.manual_coursework_items, 1));
  const labels = Array.from(
    { length: manualCount },
    (_, i) => draft.item_labels[i] || `Coursework ${i + 1}`,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Grading Scheme
          </DialogTitle>
          <DialogDescription>
            Configure coursework vs exam weighting for {courseLabel}. Weights
            determine the final total automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Coursework vs Exam */}
          <section className="space-y-2 rounded-lg border border-border/60 p-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Coursework vs Final Exam
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Coursework %</Label>
                <Input
                  type="number"
                  value={draft.coursework_weight}
                  onChange={(e) => set("coursework_weight", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Final Exam %</Label>
                <Input
                  type="number"
                  value={draft.exam_weight}
                  onChange={(e) => set("exam_weight", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <p
              className={`text-xs ${cwOk ? "text-emerald-600" : "text-red-600"}`}
            >
              Sum: {cw.toFixed(0)}% + {ew.toFixed(0)}% = {(cw + ew).toFixed(0)}%
              {cwOk ? " (OK)" : " (must be 100)"}
            </p>

            <div className="flex items-center gap-3 pt-1">
              <Label className="text-xs cursor-pointer" htmlFor="quiz-toggle">
                Count quizzes toward coursework (auto from best attempt)
              </Label>
              <Switch
                id="quiz-toggle"
                checked={qw > 0}
                onCheckedChange={(checked) =>
                  set("quiz_weight", checked ? Math.min(15, cw) : 0)
                }
              />
              {qw > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Quiz weight %</Label>
                  <Input
                    type="number"
                    value={qw}
                    onChange={(e) =>
                      set("quiz_weight", parseFloat(e.target.value) || 0)
                    }
                    className="w-20"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Manual coursework items */}
          <section className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Manual Coursework Items
              </Label>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Count</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={manualCount}
                  onChange={(e) =>
                    set("manual_coursework_items", Math.max(1, parseFloat(e.target.value) || 1))
                  }
                  className="w-16"
                />
                <Label className="text-xs">Best</Label>
                <Input
                  type="number"
                  min={1}
                  max={manualCount}
                  value={draft.best_n}
                  onChange={(e) =>
                    set("best_n", Math.max(1, parseFloat(e.target.value) || 1))
                  }
                  className="w-14"
                />
              </div>
            </div>
            {labels.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <Input
                  value={label}
                  onChange={(e) => updateLabel(i, e.target.value)}
                  placeholder={`Coursework ${i + 1}`}
                  className="flex-1"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Best-{draft.best_n} of {manualCount} items are kept. Each item
              shares {(100 - qw) / manualCount > 0 ? ((cw - qw) / Math.max(1, draft.best_n)).toFixed(1) : 0}% of the
              coursework weight.
            </p>
          </section>

          {/* Exam split */}
          <section className="space-y-2 rounded-lg border border-border/60 p-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Final Exam
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Mode</Label>
                <select
                  value={draft.exam_mode}
                  onChange={(e) =>
                    set(
                      "exam_mode",
                      e.target.value === "THEORY_PRACTICAL"
                        ? "THEORY_PRACTICAL"
                        : "THEORY",
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border/60 bg-muted/50 text-foreground focus:outline-none text-sm"
                >
                  <option value="THEORY">Theory only</option>
                  <option value="THEORY_PRACTICAL">Theory + Practical</option>
                </select>
              </div>
              <div />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Theory % of exam</Label>
                <Input
                  type="number"
                  value={tw}
                  onChange={(e) => set("exam_theory_weight", parseFloat(e.target.value) || 0)}
                />
              </div>
              {draft.exam_mode === "THEORY_PRACTICAL" ? (
                <div>
                  <Label className="text-xs">Practical % of exam</Label>
                  <Input
                    type="number"
                    value={pw}
                    onChange={(e) =>
                      set("exam_practical_weight", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground pt-4">
                  Practical not part of the exam for this course.
                </div>
              )}
            </div>
            {draft.exam_mode === "THEORY_PRACTICAL" && (
              <p
                className={`text-xs ${splitsOk ? "text-emerald-600" : "text-red-600"}`}
              >
                Split: {tw.toFixed(0)}% + {pw.toFixed(0)}% = {(tw + pw).toFixed(0)}%
                {splitsOk ? " (OK)" : " (must be 100)"}
              </p>
            )}
          </section>

          {/* Grade scale */}
          <section className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Grade Scale (letter + GP)
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addScale}
                className="gap-1 text-xs"
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
            {draft.grade_scale.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={t.grade}
                  onChange={(e) => updateScale(i, "grade", e.target.value)}
                  className="w-20"
                  placeholder="A"
                />
                <Label className="text-xs text-muted-foreground">min</Label>
                <Input
                  type="number"
                  value={t.min}
                  onChange={(e) => updateScale(i, "min", e.target.value)}
                  className="w-20"
                />
                <Label className="text-xs text-muted-foreground">GP</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={t.gp}
                  onChange={(e) => updateScale(i, "gp", e.target.value)}
                  className="w-20"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeScale(i)}
                  className="ml-auto"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </section>

          {error && (
            <p className="text-sm font-medium text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Scheme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}