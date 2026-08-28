package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.repository.StudentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentRepository studentRepository;

    public StudentController(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(studentRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash() {
        return ResponseEntity.ok(studentRepository.findAll());
    }
}
