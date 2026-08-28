package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.repository.EnrollmentRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/enrollments")
public class EnrollmentController {

    private final EnrollmentRepository enrollmentRepository;

    public EnrollmentController(EnrollmentRepository enrollmentRepository) {
        this.enrollmentRepository = enrollmentRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String courseIds,
                                  @RequestParam(required = false) String course_id) {
        if (courseIds != null && !courseIds.isBlank()) {
            List<Long> ids = new ArrayList<>();
            for (String part : courseIds.split(",")) {
                try {
                    ids.add(Long.parseLong(part.trim()));
                } catch (NumberFormatException ignored) {
                }
            }
            return ResponseEntity.ok(enrollmentRepository.findByCourseIdIn(ids));
        }
        if (course_id != null) {
            try {
                return ResponseEntity.ok(enrollmentRepository.findByCourseId(Long.parseLong(course_id)));
            } catch (NumberFormatException ignored) {
            }
        }
        return ResponseEntity.ok(enrollmentRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash(@RequestParam(required = false) String courseIds,
                                       @RequestParam(required = false) String course_id) {
        return list(courseIds, course_id);
    }
}
