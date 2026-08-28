package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.repository.CourseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseRepository courseRepository;

    public CourseController(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(courseRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash() {
        return ResponseEntity.ok(courseRepository.findAll());
    }
}
