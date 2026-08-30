package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.GradeRequest;
import com.nexus.lecturerbackend.model.StudentGrade;
import com.nexus.lecturerbackend.repository.StudentGradeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/student-grades")
public class StudentGradeController {

    private final StudentGradeRepository gradeRepository;

    public StudentGradeController(StudentGradeRepository gradeRepository) {
        this.gradeRepository = gradeRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) String course_id,
            @RequestParam(required = false) String student_id) {
        if (student_id != null && !student_id.isBlank()) {
            try {
                return ResponseEntity.ok(gradeRepository.findByStudentId(Long.parseLong(student_id)));
            } catch (NumberFormatException ignored) {
            }
        }
        if (course_id != null && !course_id.isBlank()) {
            try {
                return ResponseEntity.ok(gradeRepository.findByCourseId(Long.parseLong(course_id)));
            } catch (NumberFormatException ignored) {
            }
        }
        return ResponseEntity.ok(gradeRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash(
            @RequestParam(required = false) String course_id,
            @RequestParam(required = false) String student_id) {
        return list(course_id, student_id);
    }

    @PutMapping("/{id}/")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        var existing = gradeRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        StudentGrade grade = existing.get();
        if (body.containsKey("total")) {
            grade.setTotal(((Number) body.get("total")).doubleValue());
        }
        if (body.containsKey("grade")) {
            grade.setGrade((String) body.get("grade"));
        }
        if (body.containsKey("gp")) {
            grade.setGp(((Number) body.get("gp")).doubleValue());
        }
        gradeRepository.save(grade);
        return ResponseEntity.ok(grade);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateNoSlash(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return update(id, body);
    }

    @PostMapping
    public ResponseEntity<?> upsert(@RequestBody GradeRequest req) {
        StudentGrade grade;
        if (req.studentId() != null && req.courseId() != null) {
            var existing = gradeRepository.findByStudentIdAndCourseId(req.studentId(), req.courseId());
            grade = existing.isEmpty() ? new StudentGrade() : existing.get(0);
        } else {
            grade = new StudentGrade();
        }
        if (req.studentId() != null) grade.setStudentId(req.studentId());
        if (req.courseId() != null) grade.setCourseId(req.courseId());
        if (req.lecturerId() != null) grade.setLecturerId(req.lecturerId());
        if (req.assignment1() != null) grade.setAssignment1(req.assignment1());
        if (req.assignment2() != null) grade.setAssignment2(req.assignment2());
        if (req.participation() != null) grade.setParticipation(req.participation());
        if (req.courseworkExtra() != null) grade.setCourseworkExtra(req.courseworkExtra());
        if (req.midterm() != null) grade.setMidterm(req.midterm());
        if (req.finalExam() != null) grade.setFinalExam(req.finalExam());
        grade.setTotal(req.total());
        grade.setGrade(req.grade());
        grade.setGp(req.gp());
        gradeRepository.save(grade);
        return ResponseEntity.ok(grade);
    }

    @PostMapping("/")
    public ResponseEntity<?> upsertSlash(@RequestBody GradeRequest req) {
        return upsert(req);
    }
}
