package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.QuizActionRequest;
import com.nexus.lecturerbackend.dto.QuizRequest;
import com.nexus.lecturerbackend.model.Notification;
import com.nexus.lecturerbackend.model.Quiz;
import com.nexus.lecturerbackend.model.QuizAttempt;
import com.nexus.lecturerbackend.model.QuizQuestion;
import com.nexus.lecturerbackend.repository.NotificationRepository;
import com.nexus.lecturerbackend.repository.QuizAttemptRepository;
import com.nexus.lecturerbackend.repository.QuizQuestionRepository;
import com.nexus.lecturerbackend.repository.QuizRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class QuizController {

    private final QuizRepository quizRepository;
    private final QuizQuestionRepository questionRepository;
    private final QuizAttemptRepository attemptRepository;
    private final NotificationRepository notificationRepository;

    public QuizController(QuizRepository quizRepository,
                          QuizQuestionRepository questionRepository,
                          QuizAttemptRepository attemptRepository,
                          NotificationRepository notificationRepository) {
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.attemptRepository = attemptRepository;
        this.notificationRepository = notificationRepository;
    }

    @GetMapping("/quizzes/")
    public ResponseEntity<?> list(@RequestParam(required = false) String lecturer_id,
                                  @RequestParam(required = false) String status) {
        if (lecturer_id != null && !lecturer_id.isBlank()) {
            try {
                return ResponseEntity.ok(quizRepository.findByLecturerIdOrderByIdDesc(Long.parseLong(lecturer_id)));
            } catch (NumberFormatException ignored) {
            }
        }
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(quizRepository.findByStatusOrderByIdDesc(status));
        }
        return ResponseEntity.ok(quizRepository.findByStatusOrderByIdDesc("active"));
    }

    @GetMapping("/quizzes")
    public ResponseEntity<?> listNoSlash(@RequestParam(required = false) String lecturer_id,
                                         @RequestParam(required = false) String status) {
        return list(lecturer_id, status);
    }

    @GetMapping("/quizzes/{id}/")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        Optional<Quiz> opt = quizRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(Map.of("error", "Quiz not found"));
        }
        Quiz quiz = opt.get();
        Map<String, Object> result = quizToMap(quiz);
        List<QuizQuestion> questions = questionRepository.findByQuizIdOrderByIdAsc(id);
        List<Map<String, Object>> questionMaps = new ArrayList<>();
        for (QuizQuestion q : questions) {
            questionMaps.add(questionToMap(q));
        }
        result.put("questions", questionMaps);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/quizzes/{id}")
    public ResponseEntity<?> getOneNoSlash(@PathVariable Long id) {
        return getOne(id);
    }

    @Transactional
    @PostMapping("/quizzes/")
    public ResponseEntity<?> create(@RequestBody QuizRequest req) {
        Quiz quiz = toEntity(req);
        quizRepository.save(quiz);
        saveQuestions(quiz.getId(), req.questions());
        return ResponseEntity.ok(quizRepository.findById(quiz.getId()).orElse(quiz));
    }

    @Transactional
    @PostMapping("/quizzes")
    public ResponseEntity<?> createNoSlash(@RequestBody QuizRequest req) {
        return create(req);
    }

    @Transactional
    @PostMapping("/quizzes/{id}/update/")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody QuizRequest req) {
        Quiz quiz = quizRepository.findById(id).orElseThrow(() -> new RuntimeException("Quiz not found"));
        apply(quiz, req);
        quizRepository.save(quiz);
        List<QuizQuestion> oldQuestions = questionRepository.findByQuizIdOrderByIdAsc(quiz.getId());
        for (QuizQuestion q : oldQuestions) {
            questionRepository.deleteById(q.getId());
        }
        saveQuestions(quiz.getId(), req.questions());
        return ResponseEntity.ok(quizRepository.findById(quiz.getId()).orElse(quiz));
    }

    @Transactional
    @PostMapping("/quizzes/{id}/action/")
    public ResponseEntity<?> action(@PathVariable Long id, @RequestBody QuizActionRequest req) {
        Quiz quiz = quizRepository.findById(id).orElseThrow(() -> new RuntimeException("Quiz not found"));
        if ("delete".equals(req.action())) {
            List<QuizQuestion> questions = questionRepository.findByQuizIdOrderByIdAsc(quiz.getId());
            for (QuizQuestion q : questions) {
                questionRepository.deleteById(q.getId());
            }
            attemptRepository.deleteByQuizId(quiz.getId());
            quizRepository.deleteById(quiz.getId());
            return ResponseEntity.ok(Map.of("ok", true));
        }
        if ("status".equals(req.action()) && req.status() != null) {
            quiz.setStatus(req.status());
            quizRepository.save(quiz);
        }
        return ResponseEntity.ok(quizRepository.findById(quiz.getId()).orElse(quiz));
    }

    @Transactional
    @PostMapping("/quizzes/{id}/submit/")
    public ResponseEntity<?> submit(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<Quiz> opt = quizRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Quiz not found"));
        }
        Quiz quiz = opt.get();

        Long studentId = toLong(body.get("student_id"));
        String studentName = toString(body.get("student_name"));
        String studentEmail = toString(body.get("student_email"));
        Integer timeTaken = toInt(body.get("time_taken"));

        @SuppressWarnings("unchecked")
        Map<String, Object> answersRaw = (Map<String, Object>) body.get("answers");
        if (answersRaw == null) answersRaw = new HashMap<>();

        List<QuizQuestion> questions = questionRepository.findByQuizIdOrderByIdAsc(id);

        double totalScore = 0;
        double maxPoints = 0;
        for (QuizQuestion q : questions) {
            maxPoints += q.getPoints() != null ? q.getPoints() : 1.0;
            Object answerVal = answersRaw.get(String.valueOf(q.getId()));
            if (answerVal != null) {
                int selected = answerVal instanceof Number ? ((Number) answerVal).intValue() : -1;
                int correct = parseCorrectAnswer(q.getCorrectAnswer());
                if (selected == correct) {
                    totalScore += q.getPoints() != null ? q.getPoints() : 1.0;
                }
            }
        }

        double percentage = maxPoints > 0 ? Math.round((totalScore / maxPoints) * 1000) / 10.0 : 0;
        boolean passed = quiz.getPassingScore() != null && percentage >= quiz.getPassingScore();

        QuizAttempt attempt = new QuizAttempt();
        attempt.setQuizId(id);
        attempt.setStudentId(studentId);
        attempt.setStudentName(studentName);
        attempt.setStudentEmail(studentEmail);
        attempt.setScore(totalScore);
        attempt.setTotalPoints(maxPoints);
        attempt.setPercentage(percentage);
        attempt.setTimeTaken(timeTaken);
        attempt.setPassed(passed);
        attempt.setStatus("submitted");
        attempt.setStartedAt(LocalDateTime.now().minusSeconds(timeTaken != null ? timeTaken : 0));
        attempt.setCompletedAt(LocalDateTime.now());
        attempt.setAnswers(serializeAnswers(answersRaw));
        attemptRepository.save(attempt);

        // Create notification for the student
        try {
            Notification notification = new Notification();
            notification.setUserId(studentId);
            notification.setType(passed ? "success" : "grade");
            notification.setTitle(passed ? "Quiz Passed!" : "Quiz Completed");
            notification.setMessage("You scored " + percentage + "% on \"" + quiz.getTitle() + "\" (" + (int)totalScore + "/" + (int)maxPoints + ")");
            notification.setLink("/results");
            notification.setRelatedId(attempt.getId());
            notificationRepository.save(notification);
        } catch (Exception ignored) {}

        quiz.setTotalAttempts((quiz.getTotalAttempts() != null ? quiz.getTotalAttempts() : 0) + 1);
        List<QuizAttempt> allAttempts = attemptRepository.findByQuizIdOrderByIdAsc(id);
        double sum = 0;
        double hi = 0;
        double lo = Double.MAX_VALUE;
        long passedCount = 0;
        for (QuizAttempt a : allAttempts) {
            double s = a.getScore() != null ? a.getScore() : 0;
            sum += s;
            if (s > hi) hi = s;
            if (s < lo) lo = s;
            if (Boolean.TRUE.equals(a.getPassed())) passedCount++;
        }
        quiz.setAverageScore(allAttempts.isEmpty() ? 0.0 : Math.round((sum / allAttempts.size()) * 10) / 10.0);
        quiz.setHighestScore(hi == 0 ? 0.0 : hi);
        quiz.setLowestScore(lo == Double.MAX_VALUE ? 0.0 : lo);
        quiz.setCompletionRate(quiz.getTotalAttempts() > 0 ? (double) Math.round((passedCount * 100.0) / quiz.getTotalAttempts()) : 0.0);
        quizRepository.save(quiz);

        Map<String, Object> result = attemptToMap(attempt);
        List<Map<String, Object>> questionMaps = new ArrayList<>();
        for (QuizQuestion q : questions) {
            questionMaps.add(questionToMap(q));
        }
        result.put("questions", questionMaps);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/quizzes/{id}/submit")
    public ResponseEntity<?> submitNoSlash(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return submit(id, body);
    }

    @GetMapping("/questions/")
    public ResponseEntity<?> questions(@RequestParam(required = false) String quiz_id) {
        if (quiz_id != null && !quiz_id.isBlank()) {
            try {
                return ResponseEntity.ok(questionRepository.findByQuizIdOrderByIdAsc(Long.parseLong(quiz_id)));
            } catch (NumberFormatException ignored) {
            }
        }
        return ResponseEntity.ok(questionRepository.findAll());
    }

    @GetMapping("/questions")
    public ResponseEntity<?> questionsNoSlash(@RequestParam(required = false) String quiz_id) {
        return questions(quiz_id);
    }

    @GetMapping("/quiz-attempts/")
    public ResponseEntity<?> attempts(@RequestParam(required = false) String quiz_id,
                                      @RequestParam(required = false) String student_id) {
        if (quiz_id != null && !quiz_id.isBlank()) {
            try {
                Long qid = Long.parseLong(quiz_id);
                if (student_id != null && !student_id.isBlank()) {
                    try {
                        return ResponseEntity.ok(attemptRepository.findByQuizIdAndStudentIdOrderByIdDesc(qid, Long.parseLong(student_id)));
                    } catch (NumberFormatException ignored) {
                    }
                }
                return ResponseEntity.ok(attemptRepository.findByQuizIdOrderByIdAsc(qid));
            } catch (NumberFormatException ignored) {
            }
        }
        return ResponseEntity.ok(attemptRepository.findAll());
    }

    @GetMapping("/quiz-attempts")
    public ResponseEntity<?> attemptsNoSlash(@RequestParam(required = false) String quiz_id,
                                             @RequestParam(required = false) String student_id) {
        return attempts(quiz_id, student_id);
    }

    private Quiz toEntity(QuizRequest req) {
        Quiz q = new Quiz();
        q.setTitle(req.title());
        q.setDescription(req.description());
        q.setCourseId(req.courseId());
        q.setCourseTitle(req.courseTitle());
        q.setCourseCode(req.courseCode());
        q.setLecturerId(req.lecturerId());
        apply(q, req);
        return q;
    }

    private void apply(Quiz q, QuizRequest req) {
        if (req.title() != null) q.setTitle(req.title());
        if (req.description() != null) q.setDescription(req.description());
        if (req.courseId() != null) q.setCourseId(req.courseId());
        if (req.courseTitle() != null) q.setCourseTitle(req.courseTitle());
        if (req.courseCode() != null) q.setCourseCode(req.courseCode());
        if (req.lecturerId() != null) q.setLecturerId(req.lecturerId());
        if (req.totalQuestions() != null) q.setTotalQuestions(req.totalQuestions());
        if (req.totalPoints() != null) q.setTotalPoints(req.totalPoints());
        if (req.timeLimit() != null) q.setTimeLimit(req.timeLimit());
        if (req.passingScore() != null) q.setPassingScore(req.passingScore());
        if (req.startDate() != null) {
            try { q.setStartDate(LocalDateTime.parse(req.startDate().replace("Z", ""))); } catch (Exception ignored) {}
        }
        if (req.endDate() != null) {
            try { q.setEndDate(LocalDateTime.parse(req.endDate().replace("Z", ""))); } catch (Exception ignored) {}
        }
        if (req.status() != null) q.setStatus(req.status());
        if (req.attemptsAllowed() != null) q.setAttemptsAllowed(req.attemptsAllowed());
        if (req.shuffleQuestions() != null) q.setShuffleQuestions(req.shuffleQuestions());
        if (req.showAnswers() != null) q.setShowAnswers(req.showAnswers());
        if (req.autoDeactivate() != null) q.setAutoDeactivate(req.autoDeactivate());
        if (req.semester() != null) q.setSemester(req.semester());
        if (req.academicYear() != null) q.setAcademicYear(req.academicYear());
        if (req.yearOfStudy() != null) q.setYearOfStudy(req.yearOfStudy());
        if (req.questions() != null) q.setTotalQuestions(req.questions().size());
    }

    private void saveQuestions(Long quizId, java.util.List<QuizRequest.QuestionRequest> questions) {
        if (questions == null) return;
        for (QuizRequest.QuestionRequest q : questions) {
            QuizQuestion question = new QuizQuestion();
            question.setQuizId(quizId);
            question.setQuestion(q.question());
            question.setQuestionText(q.question() != null ? q.question() : q.questionText());
            question.setType(q.type());
            question.setQuestionType(q.type() != null ? q.type() : q.questionType());
            question.setOptions(q.options() == null ? new java.util.ArrayList<>() : q.options());
            question.setCorrectAnswer(q.correctAnswer());
            question.setPoints(q.points());
            question.setExplanation(q.explanation());
            question.setDifficulty(q.difficulty());
            question.setConfidence(q.confidence());
            question.setOriginalText(q.originalText());
            questionRepository.save(question);
        }
    }

    private Map<String, Object> quizToMap(Quiz q) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", q.getId());
        m.put("title", q.getTitle());
        m.put("description", q.getDescription());
        m.put("course_id", q.getCourseId());
        m.put("course_title", q.getCourseTitle());
        m.put("course_code", q.getCourseCode());
        m.put("lecturer_id", q.getLecturerId());
        m.put("total_questions", q.getTotalQuestions());
        m.put("total_points", q.getTotalPoints());
        m.put("time_limit", q.getTimeLimit());
        m.put("passing_score", q.getPassingScore());
        m.put("start_date", q.getStartDate());
        m.put("end_date", q.getEndDate());
        m.put("status", q.getStatus());
        m.put("attempts_allowed", q.getAttemptsAllowed());
        m.put("shuffle_questions", q.getShuffleQuestions());
        m.put("show_answers", q.getShowAnswers());
        m.put("auto_deactivate", q.getAutoDeactivate());
        m.put("total_attempts", q.getTotalAttempts());
        m.put("average_score", q.getAverageScore());
        m.put("completion_rate", q.getCompletionRate());
        m.put("highest_score", q.getHighestScore());
        m.put("lowest_score", q.getLowestScore());
        m.put("semester", q.getSemester());
        m.put("academic_year", q.getAcademicYear());
        m.put("year_of_study", q.getYearOfStudy());
        return m;
    }

    private Map<String, Object> questionToMap(QuizQuestion q) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", q.getId());
        m.put("quiz_id", q.getQuizId());
        m.put("question", q.getQuestion() != null ? q.getQuestion() : q.getQuestionText());
        m.put("question_text", q.getQuestionText());
        m.put("type", q.getType() != null ? q.getType() : q.getQuestionType());
        m.put("options", q.getOptions());
        m.put("correct_answer", parseCorrectAnswer(q.getCorrectAnswer()));
        m.put("correct_answer_raw", q.getCorrectAnswer());
        m.put("points", q.getPoints());
        m.put("explanation", q.getExplanation());
        m.put("difficulty", q.getDifficulty());
        return m;
    }

    private Map<String, Object> attemptToMap(QuizAttempt a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("quiz_id", a.getQuizId());
        m.put("student_id", a.getStudentId());
        m.put("student_name", a.getStudentName());
        m.put("student_email", a.getStudentEmail());
        m.put("score", a.getScore());
        m.put("total_points", a.getTotalPoints());
        m.put("percentage", a.getPercentage());
        m.put("time_taken", a.getTimeTaken());
        m.put("passed", a.getPassed());
        m.put("status", a.getStatus());
        m.put("started_at", a.getStartedAt());
        m.put("completed_at", a.getCompletedAt());
        m.put("answers", a.getAnswers());
        return m;
    }

    private int parseCorrectAnswer(String correctAnswer) {
        if (correctAnswer == null || correctAnswer.isBlank()) return -1;
        try {
            return Integer.parseInt(correctAnswer.trim());
        } catch (NumberFormatException e) {
            String upper = correctAnswer.trim().toUpperCase();
            if (upper.length() == 1 && upper.charAt(0) >= 'A' && upper.charAt(0) <= 'Z') {
                return upper.charAt(0) - 'A';
            }
            return -1;
        }
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) return n.longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return null; }
    }

    private Integer toInt(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) return n.intValue();
        try { return Integer.parseInt(val.toString()); } catch (Exception e) { return null; }
    }

    private String toString(Object val) {
        return val != null ? val.toString() : null;
    }

    private String serializeAnswers(Map<String, Object> answers) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : answers.entrySet()) {
            if (!first) sb.append(",");
            sb.append("\"").append(entry.getKey()).append("\":");
            if (entry.getValue() instanceof Number n) {
                sb.append(n.intValue());
            } else if (entry.getValue() != null) {
                sb.append("\"").append(entry.getValue().toString().replace("\"", "\\\"")).append("\"");
            } else {
                sb.append("null");
            }
            first = false;
        }
        sb.append("}");
        return sb.toString();
    }
}
