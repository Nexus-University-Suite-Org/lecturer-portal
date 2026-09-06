package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.AnnouncementCreateRequest;
import com.nexus.lecturerbackend.model.Announcement;
import com.nexus.lecturerbackend.model.Enrollment;
import com.nexus.lecturerbackend.model.Notification;
import com.nexus.lecturerbackend.repository.AnnouncementRepository;
import com.nexus.lecturerbackend.repository.EnrollmentRepository;
import com.nexus.lecturerbackend.repository.LecturerRepository;
import com.nexus.lecturerbackend.repository.NotificationRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
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
    private final LecturerRepository lecturerRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final NotificationRepository notificationRepository;

    public AnnouncementController(
            AnnouncementRepository announcementRepository,
            LecturerRepository lecturerRepository,
            EnrollmentRepository enrollmentRepository,
            NotificationRepository notificationRepository) {
        this.announcementRepository = announcementRepository;
        this.lecturerRepository = lecturerRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.notificationRepository = notificationRepository;
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

        if (req.authorName() != null && !req.authorName().isBlank()) {
            a.setAuthorName(req.authorName());
        } else if (req.authorId() != null) {
            lecturerRepository.findById(req.authorId())
                    .ifPresent(lecturer -> a.setAuthorName(lecturer.getFullName()));
        }

        announcementRepository.save(a);

        String authorLabel = a.getAuthorName() != null ? a.getAuthorName() : "A lecturer";
        notifyStudents(a, authorLabel);

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

    private void notifyStudents(Announcement announcement, String authorLabel) {
        List<Long> studentIds;
        if (announcement.getCourseId() != null) {
            studentIds = enrollmentRepository.findByCourseId(announcement.getCourseId())
                    .stream()
                    .map(Enrollment::getStudentId)
                    .distinct()
                    .collect(Collectors.toList());
        } else {
            studentIds = enrollmentRepository.findAll()
                    .stream()
                    .map(Enrollment::getStudentId)
                    .distinct()
                    .collect(Collectors.toList());
        }

        for (Long studentId : studentIds) {
            Notification n = new Notification();
            n.setUserId(studentId);
            n.setType("announcement");
            n.setTitle("New announcement");
            n.setMessage(authorLabel + " posted: " + announcement.getTitle());
            n.setLink("/announcements");
            n.setRelatedId(announcement.getId());
            notificationRepository.save(n);
        }
    }
}
