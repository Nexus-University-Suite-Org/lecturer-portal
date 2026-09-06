package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.model.GradebookScheme;
import com.nexus.lecturerbackend.repository.GradebookSchemeRepository;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gradebook-schemes")
public class GradebookSchemeController {

    private final GradebookSchemeRepository schemeRepository;

    public GradebookSchemeController(GradebookSchemeRepository schemeRepository) {
        this.schemeRepository = schemeRepository;
    }

    @GetMapping("/{courseId}")
    public ResponseEntity<?> get(@PathVariable Long courseId) {
        return schemeRepository.findById(courseId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(Map.of()));
    }

    @GetMapping("/{courseId}/")
    public ResponseEntity<?> getSlash(@PathVariable Long courseId) {
        return get(courseId);
    }

    @PutMapping("/{courseId}")
    public ResponseEntity<?> upsert(@PathVariable Long courseId, @RequestBody GradebookScheme body) {
        GradebookScheme scheme = schemeRepository.findById(courseId).orElseGet(GradebookScheme::new);
        scheme.setCourseId(courseId);
        if (body.getCourseworkWeight() != null) scheme.setCourseworkWeight(body.getCourseworkWeight());
        if (body.getExamWeight() != null) scheme.setExamWeight(body.getExamWeight());
        if (body.getExamMode() != null) scheme.setExamMode(body.getExamMode());
        if (body.getExamTheoryWeight() != null) scheme.setExamTheoryWeight(body.getExamTheoryWeight());
        if (body.getExamPracticalWeight() != null) scheme.setExamPracticalWeight(body.getExamPracticalWeight());
        if (body.getQuizWeight() != null) scheme.setQuizWeight(body.getQuizWeight());
        if (body.getBestN() != null) scheme.setBestN(body.getBestN());
        if (body.getManualCourseworkItems() != null) scheme.setManualCourseworkItems(body.getManualCourseworkItems());
        if (body.getItemLabels() != null) scheme.setItemLabels(body.getItemLabels());
        if (body.getGradeScale() != null) scheme.setGradeScale(body.getGradeScale());
        scheme.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(schemeRepository.save(scheme));
    }

    @PutMapping("/{courseId}/")
    public ResponseEntity<?> upsertSlash(@PathVariable Long courseId, @RequestBody GradebookScheme body) {
        return upsert(courseId, body);
    }
}