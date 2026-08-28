package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.repository.CourseUnitRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/course-units")
public class CourseUnitController {

    private final CourseUnitRepository courseUnitRepository;

    public CourseUnitController(CourseUnitRepository courseUnitRepository) {
        this.courseUnitRepository = courseUnitRepository;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(courseUnitRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash() {
        return ResponseEntity.ok(courseUnitRepository.findAll());
    }
}
