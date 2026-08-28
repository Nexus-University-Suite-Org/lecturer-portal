package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.QuizActionRequest;
import com.nexus.lecturerbackend.dto.QuizRequest;
import com.nexus.lecturerbackend.model.Quiz;
import com.nexus.lecturerbackend.model.QuizQuestion;
import com.nexus.lecturerbackend.repository.QuizAttemptRepository;
import com.nexus.lecturerbackend.repository.QuizQuestionRepository;
import com.nexus.lecturerbackend.repository.QuizRepository;
import java.time.LocalDateTime;
import java.util.Map;
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

    public QuizController(QuizRepository quizRepository,
                          QuizQuestionRepository questionRepository,
                          QuizAttemptRepository attemptRepository) {
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.attemptRepository = attemptRepository;
    }

    @GetMapping("/quizzes/")
    public ResponseEntity<?> list(@RequestParam(required = false) String lecturer_id) {
        if (lecturer_id != null && !lecturer_id.isBlank()) {
            try {
                return ResponseEntity.ok(quizRepository.findByLecturerIdOrderByIdDesc(Long.parseLong(lecturer_id)));
            } catch (NumberFormatException ignored) {
            }
        }
        return ResponseEntity.ok(quizRepository.findAll());
    }

    @GetMapping("/quizzes")
    public ResponseEntity<?> listNoSlash(@RequestParam(required = false) String lecturer_id) {
        return list(lecturer_id);
    }

    @GetMapping("/quizzes/{id}/")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(quizRepository.findById(id).orElseThrow(() -> new RuntimeException("Quiz not found")));
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
        questionRepository.deleteByQuizId(quiz.getId());
        saveQuestions(quiz.getId(), req.questions());
        return ResponseEntity.ok(quizRepository.findById(quiz.getId()).orElse(quiz));
    }

    @PostMapping("/quizzes/{id}/action/")
    public ResponseEntity<?> action(@PathVariable Long id, @RequestBody QuizActionRequest req) {
        Quiz quiz = quizRepository.findById(id).orElseThrow(() -> new RuntimeException("Quiz not found"));
        if ("delete".equals(req.action())) {
            questionRepository.deleteByQuizId(quiz.getId());
            quizRepository.deleteById(quiz.getId());
            return ResponseEntity.ok(Map.of("ok", true));
        }
        if ("status".equals(req.action()) && req.status() != null) {
            quiz.setStatus(req.status());
            quizRepository.save(quiz);
        }
        return ResponseEntity.ok(quizRepository.findById(quiz.getId()).orElse(quiz));
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
    public ResponseEntity<?> attempts(@RequestParam(required = false) String quiz_id) {
        if (quiz_id != null && !quiz_id.isBlank()) {
            try {
                return ResponseEntity.ok(attemptRepository.findByQuizIdOrderByIdAsc(Long.parseLong(quiz_id)));
            } catch (NumberFormatException ignored) {
            }
        }
        return ResponseEntity.ok(attemptRepository.findAll());
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
            try {
                q.setStartDate(LocalDateTime.parse(req.startDate()));
            } catch (Exception ignored) {
            }
        }
        if (req.endDate() != null) {
            try {
                q.setEndDate(LocalDateTime.parse(req.endDate()));
            } catch (Exception ignored) {
            }
        }
        if (req.status() != null) q.setStatus(req.status());
        if (req.attemptsAllowed() != null) q.setAttemptsAllowed(req.attemptsAllowed());
        if (req.shuffleQuestions() != null) q.setShuffleQuestions(req.shuffleQuestions());
        if (req.showAnswers() != null) q.setShowAnswers(req.showAnswers());
        if (req.autoDeactivate() != null) q.setAutoDeactivate(req.autoDeactivate());
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
}
