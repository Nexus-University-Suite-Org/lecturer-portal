package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.model.Assignment;
import com.nexus.lecturerbackend.model.Enrollment;
import com.nexus.lecturerbackend.model.Lecturer;
import com.nexus.lecturerbackend.model.StudentGrade;
import com.nexus.lecturerbackend.model.Submission;
import com.nexus.lecturerbackend.repository.AnnouncementRepository;
import com.nexus.lecturerbackend.repository.AssignmentRepository;
import com.nexus.lecturerbackend.repository.CourseRepository;
import com.nexus.lecturerbackend.repository.EnrollmentRepository;
import com.nexus.lecturerbackend.repository.LecturerRepository;
import com.nexus.lecturerbackend.repository.MessageRepository;
import com.nexus.lecturerbackend.repository.QuizRepository;
import com.nexus.lecturerbackend.repository.StudentGradeRepository;
import com.nexus.lecturerbackend.repository.SubmissionRepository;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lecturer")
public class LecturerSummaryController {

    private final AssignmentRepository assignmentRepository;
    private final AnnouncementRepository announcementRepository;
    private final QuizRepository quizRepository;
    private final MessageRepository messageRepository;
    private final LecturerRepository lecturerRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentGradeRepository studentGradeRepository;
    private final SubmissionRepository submissionRepository;

    public LecturerSummaryController(
            AssignmentRepository assignmentRepository,
            AnnouncementRepository announcementRepository,
            QuizRepository quizRepository,
            MessageRepository messageRepository,
            LecturerRepository lecturerRepository,
            CourseRepository courseRepository,
            EnrollmentRepository enrollmentRepository,
            StudentGradeRepository studentGradeRepository,
            SubmissionRepository submissionRepository) {
        this.assignmentRepository = assignmentRepository;
        this.announcementRepository = announcementRepository;
        this.quizRepository = quizRepository;
        this.messageRepository = messageRepository;
        this.lecturerRepository = lecturerRepository;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.studentGradeRepository = studentGradeRepository;
        this.submissionRepository = submissionRepository;
    }

    @GetMapping("/summary")
    public ResponseEntity<?> summary(@RequestParam(required = false) Long lecturer_id) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (lecturer_id != null) {
            result.put("assignments_count", assignmentRepository.findByLecturerIdOrderByIdDesc(lecturer_id).size());
            result.put("announcements_count", announcementRepository.findByAuthorIdOrderByCreatedAtDesc(lecturer_id).size());
            result.put("quizzes_count", quizRepository.findByLecturerIdOrderByIdDesc(lecturer_id).size());
            result.put("messages_received", messageRepository.findByToUserIdAndIsDeletedFalseOrderByCreatedAtDesc(lecturer_id).size());
            result.put("messages_sent", messageRepository.findByFromUserIdAndIsDeletedFalseOrderByCreatedAtDesc(lecturer_id).size());

            Optional<Lecturer> lecturerOpt = lecturerRepository.findById(lecturer_id);
            List<Long> courseIds = lecturerOpt
                    .map(Lecturer::getAssignedCourseUnits)
                    .filter(ids -> ids != null && !ids.isEmpty())
                    .orElseGet(() -> courseRepository.findAll().stream()
                            .map(c -> c.getId())
                            .filter(Objects::nonNull)
                            .collect(Collectors.toList()));

            List<Enrollment> enrollments = enrollmentRepository.findByCourseIdIn(courseIds);
            result.put("students_count",
                    enrollments.stream().map(Enrollment::getStudentId).filter(Objects::nonNull).distinct().count());

            Set<String> enrolledPairs = new HashSet<>();
            for (Enrollment e : enrollments) {
                if (e.getStudentId() != null && e.getCourseId() != null) {
                    enrolledPairs.add(e.getStudentId() + ":" + e.getCourseId());
                }
            }
            for (StudentGrade g : studentGradeRepository.findByCourseIdIn(courseIds)) {
                if (g.getFinalExam() != null && g.getStudentId() != null && g.getCourseId() != null) {
                    enrolledPairs.remove(g.getStudentId() + ":" + g.getCourseId());
                }
            }
            result.put("pending_marks", (long) enrolledPairs.size());

            List<Long> assignmentIds = assignmentRepository.findByLecturerIdOrderByIdDesc(lecturer_id).stream()
                    .map(Assignment::getId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
            long submissionsThisWeek = 0;
            if (!assignmentIds.isEmpty()) {
                for (Submission s : submissionRepository.findByAssignmentIdIn(assignmentIds)) {
                    if (s.getSubmittedAt() != null && !s.getSubmittedAt().isBefore(weekAgo)) {
                        submissionsThisWeek++;
                    }
                }
            }
            result.put("submissions_this_week", submissionsThisWeek);
        } else {
            result.put("assignments_count", assignmentRepository.count());
            result.put("announcements_count", announcementRepository.count());
            result.put("quizzes_count", quizRepository.count());
            result.put("messages_received", 0L);
            result.put("messages_sent", 0L);
            result.put("students_count", 0L);
            result.put("pending_marks", 0L);
            result.put("submissions_this_week", 0L);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/summary/")
    public ResponseEntity<?> summarySlash(@RequestParam(required = false) Long lecturer_id) {
        return summary(lecturer_id);
    }
}