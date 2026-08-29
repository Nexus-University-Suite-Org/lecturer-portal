package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.AssignmentCreateRequest;
import com.nexus.lecturerbackend.dto.AssignmentUpdateRequest;
import com.nexus.lecturerbackend.model.Assignment;
import com.nexus.lecturerbackend.repository.AssignmentRepository;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {

    private final AssignmentRepository assignmentRepository;

    public AssignmentController(AssignmentRepository assignmentRepository) {
        this.assignmentRepository = assignmentRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) Long lecturer_id) {
        if (lecturer_id != null) {
            return ResponseEntity.ok(assignmentRepository.findByLecturerIdOrderByIdDesc(lecturer_id));
        }
        return ResponseEntity.ok(assignmentRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash(@RequestParam(required = false) Long lecturer_id) {
        return list(lecturer_id);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody AssignmentCreateRequest req) {
        Assignment a = new Assignment();
        a.setLecturerId(req.lecturerId());
        a.setCourseId(req.courseId());
        a.setCourseTitle(req.courseTitle());
        a.setCourseCode(req.courseCode());
        a.setTitle(req.title());
        a.setDescription(req.description());
        a.setDueDate(req.dueDate());
        a.setTotalPoints(req.totalPoints());
        a.setStatus(req.status() == null ? "draft" : req.status());
        if (req.instructionDocumentUrl() != null) a.setInstructionDocumentUrl(req.instructionDocumentUrl());
        if (req.instructionDocumentName() != null) a.setInstructionDocumentName(req.instructionDocumentName());
        assignmentRepository.save(a);
        return ResponseEntity.ok(a);
    }

    @PostMapping("/")
    public ResponseEntity<?> createSlash(@RequestBody AssignmentCreateRequest req) {
        return create(req);
    }

    @PostMapping("/{id}/update/")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody AssignmentUpdateRequest req) {
        Assignment a = assignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        if (req.title() != null) a.setTitle(req.title());
        if (req.description() != null) a.setDescription(req.description());
        if (req.dueDate() != null) a.setDueDate(req.dueDate());
        if (req.totalPoints() != null) a.setTotalPoints(req.totalPoints());
        if (req.courseId() != null) a.setCourseId(req.courseId());
        if (req.courseTitle() != null) a.setCourseTitle(req.courseTitle());
        if (req.courseCode() != null) a.setCourseCode(req.courseCode());
        if (req.instructionDocumentUrl() != null) a.setInstructionDocumentUrl(req.instructionDocumentUrl());
        if (req.instructionDocumentName() != null) a.setInstructionDocumentName(req.instructionDocumentName());
        assignmentRepository.save(a);
        return ResponseEntity.ok(a);
    }

    @DeleteMapping("/{id}/")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        assignmentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
