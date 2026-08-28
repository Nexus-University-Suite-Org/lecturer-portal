import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface Survey {
  id: string;
  title: string;
  course: string;
  courseCode: string;
  instructor: string;
  deadline: string;
  status: "pending" | "completed" | "expired";
  questions: number;
  assigned_to?: string; 
}

export function useEvaluations() {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setSurveys([]);
      setLoading(false);
      return;
    }

    const fetchEvaluations = async () => {
      try {
        setSurveys([]);
      } catch (err: any) {
        console.error("Error fetching evaluations:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [user]);

  const submitEvaluation = async (_surveyId: string, _ratings: Record<string, number>, _feedback: string) => {
    return { error: null };
  };

  return { surveys, loading, error, submitEvaluation };
}
