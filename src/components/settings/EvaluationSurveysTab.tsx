import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Star,
  CheckCircle2,
  Clock,
  ChevronRight,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Send,
  BarChart,
} from "lucide-react";
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

export function EvaluationSurveysTab() {
  const { toast } = useToast();
  const { surveys, loading, submitEvaluation } = useEvaluations();
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const pendingSurveys = surveys.filter((s) => s.status === "pending");
  const completedSurveys = surveys.filter((s) => s.status === "completed");
  const completionRate =
    surveys.length > 0
      ? (completedSurveys.length /
          surveys.filter((s) => s.status !== "expired").length) *
        100
      : 0;

  const surveyQuestions = [
    {
      id: "clarity",
      text: "How clear were the course objectives and expectations?",
    },
    {
      id: "knowledge",
      text: "How would you rate the instructor's knowledge of the subject?",
    },
    {
      id: "materials",
      text: "How helpful were the course materials and resources?",
    },
    {
      id: "engagement",
      text: "How engaging were the lectures and discussions?",
    },
    {
      id: "feedback",
      text: "How timely and helpful was the feedback on assignments?",
    },
    { id: "overall", text: "Overall, how satisfied are you with this course?" },
  ];

  const handleSubmit = async () => {
    if (!selectedSurvey) return;

    if (Object.keys(ratings).length < surveyQuestions.length) {
      toast({
        title: "Incomplete Survey",
        description: "Please rate all questions before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await submitEvaluation(selectedSurvey.id, ratings, feedback);
    setSubmitting(false);

    if (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error saving your response. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Survey Submitted",
      description: "Thank you for your feedback!",
    });
    setSelectedSurvey(null);
    setRatings({});
    setFeedback("");
    setCurrentQuestion(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "completed":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "expired":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center text-muted-foreground animate-pulse">
        Loading evaluations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Survey Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            label: "Pending Surveys",
            value: pendingSurveys.length,
            icon: Clock,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
          },
          {
            label: "Completed",
            value: completedSurveys.length,
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Completion Rate",
            value: `${completionRate.toFixed(0)}%`,
            icon: BarChart,
            color: "text-primary",
            bg: "bg-primary/10",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div
                  className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Survey Taking Modal */}
      <AnimatePresence>
        {selectedSurvey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) =>
              e.target === e.currentTarget && setSelectedSurvey(null)
            }
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-auto"
            >
              <Card className="border-2">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {selectedSurvey.courseCode}
                      </Badge>
                      <CardTitle>{selectedSurvey.course}</CardTitle>
                      <CardDescription>
                        Instructor: {selectedSurvey.instructor}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedSurvey(null)}
                    >
                      ×
                    </Button>
                  </div>
                  <Progress
                    value={
                      (Object.keys(ratings).length / surveyQuestions.length) *
                      100
                    }
                    className="h-2 mt-4"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Object.keys(ratings).length} of {surveyQuestions.length}{" "}
                    questions answered
                  </p>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {surveyQuestions.map((question, i) => (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-4 rounded-xl border ${
                        ratings[question.id]
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <p className="font-medium">
                          {i + 1}. {question.text}
                        </p>
                        {ratings[question.id] && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Additional Comments (Optional)
                    </label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Share any additional feedback about this course..."
                      className="min-h-24"
                      disabled={submitting}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedSurvey(null)}
                      disabled={submitting}
                    >
                      Save for Later
                    </Button>
                    <Button 
                      className="flex-1 gap-2" 
                      onClick={handleSubmit} 
                      disabled={submitting}
                    >
                      {submitting ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Submit Survey
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Surveys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Pending Evaluations
          </CardTitle>
          <CardDescription>
            Complete these surveys before the deadline
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingSurveys.length === 0 ? (
            <div className="text-center py-12">
              <ThumbsUp className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">All caught up!</h3>
              <p className="text-muted-foreground">
                You've completed all available surveys
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {pendingSurveys.map((survey, i) => (
                <motion.div
                  key={survey.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group"
                    onClick={() => setSelectedSurvey(survey)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="outline" className="font-mono">
                          {survey.courseCode}
                        </Badge>
                        <Badge className={getStatusColor(survey.status)}>
                          <Clock className="h-3 w-3 mr-1" />
                          Due: {new Date(survey.deadline).toLocaleDateString()}
                        </Badge>
                      </div>
                      <h4 className="font-semibold mb-1">{survey.course}</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        {survey.instructor}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {survey.questions} questions
                        </span>
                        <Button
                          size="sm"
                          className="gap-1 group-hover:gap-2 transition-all"
                        >
                          Start
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Surveys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Completed Evaluations
          </CardTitle>
          <CardDescription>Surveys you've already submitted</CardDescription>
        </CardHeader>
        <CardContent>
          {completedSurveys.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No completed surveys yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedSurveys.map((survey, i) => (
                <motion.div
                  key={survey.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium">{survey.course}</p>
                      <p className="text-sm text-muted-foreground">
                        {survey.courseCode} • {survey.instructor}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600">
                    Submitted
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Why Evaluate */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-2">Why Your Feedback Matters</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Your honest feedback helps improve the quality of education.
                Evaluations are anonymous and instructors only see aggregate
                results after grades are submitted.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Anonymous</Badge>
                <Badge variant="secondary">Confidential</Badge>
                <Badge variant="secondary">Impactful</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
