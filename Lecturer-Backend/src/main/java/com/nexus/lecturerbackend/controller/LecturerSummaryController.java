package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.repository.AnnouncementRepository;
import com.nexus.lecturerbackend.repository.AssignmentRepository;
import com.nexus.lecturerbackend.repository.MessageRepository;
import com.nexus.lecturerbackend.repository.QuizRepository;
import java.util.LinkedHashMap;
import java.util.Map;
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

    public LecturerSummaryController(
            AssignmentRepository assignmentRepository,
            AnnouncementRepository announcementRepository,
            QuizRepository quizRepository,
            MessageRepository messageRepository) {
        this.assignmentRepository = assignmentRepository;
        this.announcementRepository = announcementRepository;
        this.quizRepository = quizRepository;
        this.messageRepository = messageRepository;
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
        } else {
            result.put("assignments_count", assignmentRepository.count());
            result.put("announcements_count", announcementRepository.count());
            result.put("quizzes_count", quizRepository.count());
            result.put("messages_received", 0L);
            result.put("messages_sent", 0L);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/summary/")
    public ResponseEntity<?> summarySlash(@RequestParam(required = false) Long lecturer_id) {
        return summary(lecturer_id);
    }
}
