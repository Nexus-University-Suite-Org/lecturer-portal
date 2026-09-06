package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.repository.StudentRepository;
import com.nexus.lecturerbackend.service.AdmittedStudentSyncService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentRepository studentRepository;
    private final AdmittedStudentSyncService admittedStudentSyncService;

    public StudentController(StudentRepository studentRepository, AdmittedStudentSyncService admittedStudentSyncService) {
        this.studentRepository = studentRepository;
        this.admittedStudentSyncService = admittedStudentSyncService;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(studentRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash() {
        return ResponseEntity.ok(studentRepository.findAll());
    }

    @GetMapping("/sync")
    public ResponseEntity<?> sync() {
        return ResponseEntity.ok(admittedStudentSyncService.sync());
    }
}
