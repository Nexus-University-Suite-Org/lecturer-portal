package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.LiveSessionCreateRequest;
import com.nexus.lecturerbackend.dto.LiveSessionUpdateRequest;
import com.nexus.lecturerbackend.model.LiveSession;
import com.nexus.lecturerbackend.repository.CourseUnitRepository;
import com.nexus.lecturerbackend.repository.LiveSessionRepository;
import com.nexus.lecturerbackend.service.CourseUnitResolver;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/live-sessions")
public class LiveSessionController {

    private final LiveSessionRepository sessionRepository;
    private final CourseUnitRepository courseUnitRepository;
    private final CourseUnitResolver courseUnitResolver;

    public LiveSessionController(LiveSessionRepository sessionRepository,
                                 CourseUnitRepository courseUnitRepository,
                                 CourseUnitResolver courseUnitResolver) {
        this.sessionRepository = sessionRepository;
        this.courseUnitRepository = courseUnitRepository;
        this.courseUnitResolver = courseUnitResolver;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(sessionRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash() {
        return ResponseEntity.ok(sessionRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        Optional<LiveSession> session = sessionRepository.findById(id);
        if (session.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(session.get());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody LiveSessionCreateRequest req) {
        LiveSession s = new LiveSession();
        s.setCourseId(req.courseId());
        s.setTitle(req.title());
        s.setCourseName(req.courseName());
        if (req.courseUnitId() != null) {
            s.setCourseUnitId(req.courseUnitId());
        } else if (req.courseName() != null && !req.courseName().isBlank()) {
            s.setCourseUnitId(courseUnitResolver.resolve(courseUnitRepository, req.courseName()));
        }
        s.setScheduledAt(req.scheduledAt());
        s.setDurationMinutes(req.durationMinutes());
        s.setMeetLink(req.meetLink());
        s.setImageUrl(req.imageUrl());
        sessionRepository.save(s);
        return ResponseEntity.ok(s);
    }

    @PostMapping("/")
    public ResponseEntity<?> createSlash(@RequestBody LiveSessionCreateRequest req) {
        return create(req);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody LiveSessionUpdateRequest req) {
        Optional<LiveSession> existing = sessionRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        LiveSession s = existing.get();
        if (req.courseId() != null) {
            s.setCourseId(req.courseId());
        }
        if (req.title() != null) {
            s.setTitle(req.title());
        }
        if (req.courseName() != null) {
            s.setCourseName(req.courseName());
            if (req.courseUnitId() != null) {
                s.setCourseUnitId(req.courseUnitId());
            } else if (!req.courseName().isBlank()) {
                s.setCourseUnitId(courseUnitResolver.resolve(courseUnitRepository, req.courseName()));
            }
        } else if (req.courseUnitId() != null) {
            s.setCourseUnitId(req.courseUnitId());
        }
        if (req.scheduledAt() != null) {
            s.setScheduledAt(req.scheduledAt());
        }
        if (req.durationMinutes() != null) {
            s.setDurationMinutes(req.durationMinutes());
        }
        if (req.meetLink() != null) {
            s.setMeetLink(req.meetLink());
        }
        if (req.imageUrl() != null) {
            s.setImageUrl(req.imageUrl());
        }
        if (req.status() != null) {
            s.setStatus(req.status());
        }
        sessionRepository.save(s);
        return ResponseEntity.ok(s);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!sessionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        sessionRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}