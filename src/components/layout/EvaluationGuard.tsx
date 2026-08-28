import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Star, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useEvaluations, Survey } from "@/hooks/useEvaluations";
import { useAuth } from "@/contexts/AuthContext";

interface StarRatingProps {
  rating: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
}

const StarRating = ({ rating, onRate, disabled }: StarRatingProps) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        onClick={() => !disabled && onRate(star)}
        disabled={disabled}
        className={`p-1 transition-transform hover:scale-110 ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <Star
          className={`h-8 w-8 ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      </button>
    ))}
  </div>
);

const surveyQuestions = [
  { id: "clarity", text: "How clear were the course objectives and expectations?" },
  { id: "knowledge", text: "How would you rate the instructor's knowledge of the subject?" },
  { id: "materials", text: "How helpful were the course materials and resources?" },
  { id: "engagement", text: "How engaging were the lectures and discussions?" },
  { id: "feedback", text: "How timely and helpful was the feedback on assignments?" },
  { id: "overall", text: "Overall, how satisfied are you with this course?" },
];

export function EvaluationGuard({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const { surveys, loading, submitEvaluation } = useEvaluations();
  const { toast } = useToast();
  
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Guard only applies to students
  if (!user || profile?.role !== "student") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="h-8 w-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse">Checking records...</p>
      </div>
    );
  }

  const pendingSurveys = surveys.filter(s => s.status === "pending");

  if (pendingSurveys.length === 0) {
    return <>{children}</>;
  }

  // There is a pending survey. We take the first one.
  const activeSurvey = pendingSurveys[0];

  const handleSubmit = async () => {
    if (Object.keys(ratings).length < surveyQuestions.length) {
      toast({
        title: "Incomplete Survey",
        description: "Please rate all questions before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await submitEvaluation(activeSurvey.id, ratings, feedback);
    setSubmitting(false);

    if (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error saving your response. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Survey Submitted",
        description: "Thank you for your feedback!",
      });
      setRatings({});
      setFeedback("");
      // When the survey is marked completed, the pendingSurveys array updates
      // and if it becomes empty, the guard releases and children render.
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar relative z-10"
      >
        <Card className="border-2 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 sticky top-0 z-20 backdrop-blur-md pb-6 rounded-t-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive" className="animate-pulse">Mandatory Review Required</Badge>
                  <Badge variant="outline">{activeSurvey.courseCode}</Badge>
                </div>
                <CardTitle className="text-2xl">{activeSurvey.course}</CardTitle>
                <CardDescription className="text-base mt-1">
                  Instructor: <strong>{activeSurvey.instructor}</strong>
                </CardDescription>
              </div>
              <div className="hidden sm:flex h-12 w-12 rounded-full bg-amber-500/20 text-amber-600 items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              You must complete this evaluation to continue using the portal. Your honest feedback is highly valued and strictly confidential.
              {pendingSurveys.length > 1 && (
                <span className="block mt-1 font-semibold text-primary">
                  Note: You have {pendingSurveys.length} pending evaluations in total.
                </span>
              )}
            </p>

            <Progress
              value={(Object.keys(ratings).length / surveyQuestions.length) * 100}
              className="h-2 mt-6"
            />
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {Object.keys(ratings).length} of {surveyQuestions.length} questions answered
            </p>
          </CardHeader>
          
          <CardContent className="pt-8 space-y-8">
            <div className="space-y-6">
              {surveyQuestions.map((question, i) => (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-6 rounded-2xl border transition-colors ${
                    ratings[question.id]
                      ? "border-emerald-500/30 bg-emerald-500/5 shadow-sm"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <p className="font-medium text-lg leading-relaxed">
                      <span className="text-primary mr-2 opacity-50">{i + 1}.</span>
                      {question.text}
                    </p>
                    {ratings[question.id] && (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <StarRating
                    rating={ratings[question.id] || 0}
                    onRate={(rating) =>
                      setRatings({ ...ratings, [question.id]: rating })
                    }
                    disabled={submitting}
                  />
                </motion.div>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3 bg-muted/20 p-6 rounded-2xl border border-muted"
            >
              <label className="text-base font-medium flex items-center gap-2">
                Additional Comments
                <span className="text-sm bg-muted text-muted-foreground px-2 py-0.5 rounded-full">(Optional)</span>
              </label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share any specific feedback about what worked well or what could be improved..."
                className="min-h-32 text-base resize-none focus-visible:ring-primary/50"
                disabled={submitting}
              />
            </motion.div>

            <div className="pt-4 pb-2 sticky bottom-0 bg-background/80 backdrop-blur-md border-t -mx-6 px-6">
              <Button 
                className="w-full h-14 text-lg gap-2 shadow-lg hover:shadow-xl transition-all" 
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Submit Evaluation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
