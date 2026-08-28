package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.AnnouncementCreateRequest;
import com.nexus.lecturerbackend.model.Announcement;
import com.nexus.lecturerbackend.repository.AnnouncementRepository;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/announcements")
public class AnnouncementController {

    private final AnnouncementRepository announcementRepository;

    public AnnouncementController(AnnouncementRepository announcementRepository) {
        this.announcementRepository = announcementRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String author_id) {
        if (author_id != null && !author_id.isBlank()) {
            try {
                return ResponseEntity.ok(announcementRepository.findByAuthorIdOrderByCreatedAtDesc(Long.parseLong(author_id)));
            } catch (NumberFormatException ignored) {
            }
        }
        return ResponseEntity.ok(announcementRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash(@RequestParam(required = false) String author_id) {
        return list(author_id);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody AnnouncementCreateRequest req) {
        Announcement a = new Announcement();
        a.setCourseId(req.courseId());
        a.setAuthorId(req.authorId());
        a.setTitle(req.title());
        a.setContent(req.content());
        a.setPriority(req.priority() == null ? "normal" : req.priority());
        announcementRepository.save(a);
        return ResponseEntity.ok(a);
    }

    @PostMapping("/")
    public ResponseEntity<?> createSlash(@RequestBody AnnouncementCreateRequest req) {
        return create(req);
    }

    @DeleteMapping("/{id}/")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        announcementRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
