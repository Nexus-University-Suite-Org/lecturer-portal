import React, { useState } from 'react';
import { Edit2, Trash2, Plus, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentAnalysisResult, ExtractedQuestion } from '@/lib/documentAnalyzer';

interface QuestionReviewProps {
  questions: ExtractedQuestion[];
  onQuestionsUpdate: (questions: ExtractedQuestion[]) => void;
  analysisResult: DocumentAnalysisResult;
}

export function QuestionReview({ questions: initialQuestions, onQuestionsUpdate, analysisResult }: QuestionReviewProps) {
  const [questions, setQuestions] = useState<ExtractedQuestion[]>(initialQuestions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  const updateQuestion = (id: string, updates: Partial<ExtractedQuestion>) => {
    const updatedQuestions = questions.map(q =>
      q.id === id ? { ...q, ...updates } : q
    );
    setQuestions(updatedQuestions);
    onQuestionsUpdate(updatedQuestions);
  };

  const deleteQuestion = (id: string) => {
    const updatedQuestions = questions.filter(q => q.id !== id);
    setQuestions(updatedQuestions);
    onQuestionsUpdate(updatedQuestions);
  };

  const addQuestion = () => {
    const newQuestion: ExtractedQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      type: 'short_answer',
      correct_answer: '',
      explanation: '',
      points: 2,
      difficulty: 'medium',
      confidence: 1.0,
      originalText: ''
    };

    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    onQuestionsUpdate(updatedQuestions);
    setEditingId(newQuestion.id);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle2 className="h-4 w-4" />;
    if (confidence >= 0.6) return <AlertCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Analysis Summary */}
      <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Analysis Complete
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRawText(!showRawText)}
            >
              {showRawText ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showRawText ? 'Hide' : 'Show'} Raw Text
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analysisResult.metadata.totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Questions Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analysisResult.metadata.questionTypes.length}</div>
              <div className="text-sm text-muted-foreground">Question Types</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary capitalize">{analysisResult.metadata.estimatedDifficulty}</div>
              <div className="text-sm text-muted-foreground">Difficulty</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{(analysisResult.metadata.processingTime / 1000).toFixed(1)}s</div>
              <div className="text-sm text-muted-foreground">Processing Time</div>
            </div>
          </div>

          {analysisResult.metadata.questionTypes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Types detected:</span>
              {analysisResult.metadata.questionTypes.map(type => (
                <Badge key={type} variant="secondary">
                  {type.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          )}

          {showRawText && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Raw Document Text:</h4>
              <Textarea
                value={analysisResult.rawText}
                readOnly
                className="h-32 text-xs font-mono"
                placeholder="Raw text extracted from document..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Review & Edit Questions</CardTitle>
            <Button type="button" onClick={addQuestion} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Review the extracted questions, make corrections, and add any missing information.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card key={question.id} className="border-l-4 border-l-primary/50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary">#{index + 1}</span>
                      <div className={`flex items-center gap-1 ${getConfidenceColor(question.confidence)}`}>
                        {getConfidenceIcon(question.confidence)}
                        <span className="text-xs">
                          {Math.round(question.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(editingId === question.id ? null : question.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteQuestion(question.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {editingId === question.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Question</label>
                        <Textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                          placeholder="Enter the question..."
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <Select
                            value={question.type}
                            onValueChange={(value: any) => updateQuestion(question.id, { type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                              <SelectItem value="true_false">True/False</SelectItem>
                              <SelectItem value="short_answer">Short Answer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Difficulty</label>
                          <Select
                            value={question.difficulty}
                            onValueChange={(value: any) => updateQuestion(question.id, { difficulty: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Points</label>
                          <Input
                            type="number"
                            min="1"
                            value={question.points}
                            onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 1 })}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Correct Answer</label>
                          <Input
                            value={question.correct_answer}
                            onChange={(e) => updateQuestion(question.id, { correct_answer: e.target.value })}
                            placeholder="Enter the correct answer..."
                          />
                        </div>
                      </div>

                      {question.type === 'multiple_choice' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Options (one per line)</label>
                          <Textarea
                            value={question.options?.join('\n') || ''}
                            onChange={(e) => updateQuestion(question.id, {
                              options: e.target.value.split('\n').filter(opt => opt.trim())
                            })}
                            placeholder="Option A\nOption B\nOption C\nOption D"
                            className="min-h-[100px]"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">Explanation (Optional)</label>
                        <Textarea
                          value={question.explanation || ''}
                          onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                          placeholder="Explain why this is the correct answer..."
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="w-full"
                      >
                        Save Changes
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium">{question.question}</p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Type: {question.type.replace('_', ' ')}</span>
                        <span>Difficulty: {question.difficulty}</span>
                        <span>Points: {question.points}</span>
                      </div>

                      {question.type === 'multiple_choice' && question.options && (
                        <div className="space-y-1">
                          {question.options.map((option, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {option}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-sm">
                        <span className="font-medium">Answer:</span> {question.correct_answer || 'Not specified'}
                      </div>

                      {question.explanation && (
                        <div className="text-sm">
                          <span className="font-medium">Explanation:</span> {question.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {questions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No questions found. Try uploading a different document or add questions manually.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}