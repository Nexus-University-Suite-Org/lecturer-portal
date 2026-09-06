package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.SubmissionCreateRequest;
import com.nexus.lecturerbackend.dto.SubmissionUpdateRequest;
import com.nexus.lecturerbackend.model.Submission;
import com.nexus.lecturerbackend.repository.SubmissionRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    private final SubmissionRepository submissionRepository;

    public SubmissionController(SubmissionRepository submissionRepository) {
        this.submissionRepository = submissionRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) String assignment_ids,
            @RequestParam(required = false) Long student_id) {
        if (assignment_ids != null && !assignment_ids.isBlank()) {
            List<Long> ids = new ArrayList<>();
            for (String part : assignment_ids.split(",")) {
                try {
                    ids.add(Long.parseLong(part.trim()));
                } catch (NumberFormatException ignored) {
                }
            }
            return ResponseEntity.ok(submissionRepository.findByAssignmentIdIn(ids));
        }
        if (student_id != null) {
            return ResponseEntity.ok(submissionRepository.findByStudentId(student_id));
        }
        return ResponseEntity.ok(submissionRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash(
            @RequestParam(required = false) String assignment_ids,
            @RequestParam(required = false) Long student_id) {
        return list(assignment_ids, student_id);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody SubmissionCreateRequest req) {
        Submission s = new Submission();
        s.setStudentId(req.studentId());
        s.setAssignmentId(req.assignmentId());
        s.setContent(req.content());
        s.setFileUrl(req.fileUrl());
        s.setFileName(req.fileName());
        s.setStatus("submitted");
        s.setSubmittedAt(LocalDateTime.now());
        submissionRepository.save(s);
        return ResponseEntity.ok(s);
    }

    @PostMapping("/")
    public ResponseEntity<?> createSlash(@RequestBody SubmissionCreateRequest req) {
        return create(req);
    }

    @PostMapping("/{id}/update/")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody SubmissionUpdateRequest req) {
        Submission s = submissionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Submission not found"));
        if (req.status() != null) s.setStatus(req.status());
        if (req.score() != null) s.setScore(req.score());
        if (req.feedback() != null) s.setFeedback(req.feedback());
        submissionRepository.save(s);
        return ResponseEntity.ok(s);
    }
}
