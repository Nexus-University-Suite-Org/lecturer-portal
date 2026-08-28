package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.LiveSessionCreateRequest;
import com.nexus.lecturerbackend.model.LiveSession;
import com.nexus.lecturerbackend.repository.LiveSessionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/live-sessions")
public class LiveSessionController {

    private final LiveSessionRepository sessionRepository;

    public LiveSessionController(LiveSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(sessionRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash() {
        return ResponseEntity.ok(sessionRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody LiveSessionCreateRequest req) {
        LiveSession s = new LiveSession();
        s.setCourseId(req.courseId());
        s.setTitle(req.title());
        s.setCourseName(req.courseName());
        s.setScheduledAt(req.scheduledAt());
        s.setDurationMinutes(req.durationMinutes());
        s.setMeetLink(req.meetLink());
        sessionRepository.save(s);
        return ResponseEntity.ok(s);
    }

    @PostMapping("/")
    public ResponseEntity<?> createSlash(@RequestBody LiveSessionCreateRequest req) {
        return create(req);
    }
}
