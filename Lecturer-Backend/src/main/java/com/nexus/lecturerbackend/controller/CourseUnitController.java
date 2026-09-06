package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.model.CourseUnit;
import com.nexus.lecturerbackend.repository.CourseUnitRepository;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/course-units")
public class CourseUnitController {

    private final CourseUnitRepository courseUnitRepository;

    public CourseUnitController(CourseUnitRepository courseUnitRepository) {
        this.courseUnitRepository = courseUnitRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String year) {
        List<CourseUnit> units = courseUnitRepository.findAll();
        if (semester != null && !semester.isBlank()) {
            String semLower = semester.trim().toLowerCase();
            units = units.stream()
                .filter(u -> u.getSemester() != null && u.getSemester().toLowerCase().contains(semLower))
                .toList();
        }
        if (year != null && !year.isBlank()) {
            String yearVal = year.trim();
            units = units.stream()
                .filter(u -> u.getYear() != null && u.getYear().contains(yearVal))
                .toList();
        }
        return ResponseEntity.ok(units);
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash(
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String year) {
        return list(semester, year);
    }
}
