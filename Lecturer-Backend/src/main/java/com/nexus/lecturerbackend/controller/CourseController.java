package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.model.Course;
import com.nexus.lecturerbackend.repository.CourseRepository;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseRepository courseRepository;

    public CourseController(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String name) {
        List<Course> courses = courseRepository.findAll();
        if (name != null && !name.isBlank()) {
            String lower = name.toLowerCase();
            courses = courses.stream()
                .filter(c -> c.getTitle() != null && c.getTitle().toLowerCase().contains(lower))
                .toList();
        }
        return ResponseEntity.ok(courses);
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash(@RequestParam(required = false) String name) {
        return list(name);
    }
}
