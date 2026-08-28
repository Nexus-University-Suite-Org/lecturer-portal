package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.NotificationCreateRequest;
import com.nexus.lecturerbackend.model.Notification;
import com.nexus.lecturerbackend.repository.NotificationRepository;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String user_id) {
        if (user_id != null && !user_id.isBlank()) {
            try {
                return ResponseEntity.ok(notificationRepository.findByUserIdOrderByCreatedAtDesc(Long.parseLong(user_id)));
            } catch (NumberFormatException ignored) {
            }
        }
        return ResponseEntity.ok(notificationRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash(@RequestParam(required = false) String user_id) {
        return list(user_id);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody NotificationCreateRequest req) {
        Notification n = new Notification();
        n.setUserId(req.userId());
        n.setType(req.type() == null ? "info" : req.type());
        n.setTitle(req.title());
        n.setMessage(req.message());
        n.setRelatedId(req.relatedId());
        n.setLink(req.link());
        notificationRepository.save(n);
        return ResponseEntity.ok(n);
    }

    @PostMapping("/")
    public ResponseEntity<?> createSlash(@RequestBody NotificationCreateRequest req) {
        return create(req);
    }

    @PostMapping("/{id}/read/")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
        });
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/mark-all-read/")
    public ResponseEntity<?> markAllRead(@RequestBody Map<String, Object> body) {
        Object userId = body.get("user_id");
        if (userId != null) {
            try {
                Long uid = Long.parseLong(String.valueOf(userId));
                notificationRepository.findByUserIdOrderByCreatedAtDesc(uid).forEach(n -> {
                    n.setIsRead(true);
                    notificationRepository.save(n);
                });
            } catch (Exception ignored) {
            }
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
