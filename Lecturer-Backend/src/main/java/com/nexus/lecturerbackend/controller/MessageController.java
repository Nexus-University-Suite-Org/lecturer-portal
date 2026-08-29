package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.MessageSendRequest;
import com.nexus.lecturerbackend.model.Message;
import com.nexus.lecturerbackend.model.Notification;
import com.nexus.lecturerbackend.repository.MessageRepository;
import com.nexus.lecturerbackend.repository.NotificationRepository;
import com.nexus.lecturerbackend.service.ParticipantService;
import com.nexus.lecturerbackend.service.RealtimeService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageRepository messageRepository;
    private final NotificationRepository notificationRepository;
    private final ParticipantService participantService;
    private final RealtimeService realtimeService;

    public MessageController(MessageRepository messageRepository,
                             NotificationRepository notificationRepository,
                             ParticipantService participantService,
                             RealtimeService realtimeService) {
        this.messageRepository = messageRepository;
        this.notificationRepository = notificationRepository;
        this.participantService = participantService;
        this.realtimeService = realtimeService;
    }

    @GetMapping("/{uid}/")
    public ResponseEntity<?> list(@PathVariable Long uid,
                                  @RequestParam(required = false) String view,
                                  @RequestParam(required = false) String search) {
        List<Message> messages;
        if ("sent".equals(view)) {
            messages = messageRepository.findByFromUserIdAndIsDeletedFalseOrderByCreatedAtDesc(uid);
        } else if ("starred".equals(view)) {
            messages = messageRepository.findByFromUserIdAndIsStarredTrueAndIsDeletedFalseOrderByCreatedAtDesc(uid);
            messages.addAll(messageRepository.findByToUserIdAndIsStarredTrueAndIsDeletedFalseOrderByCreatedAtDesc(uid));
        } else if ("archived".equals(view)) {
            messages = messageRepository.findByToUserIdAndIsArchivedTrueAndIsDeletedFalseOrderByCreatedAtDesc(uid);
        } else {
            messages = messageRepository.findByToUserIdAndIsDeletedFalseOrderByCreatedAtDesc(uid);
        }
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            final List<Message> all = messages;
            messages = all.stream()
                    .filter(m -> (m.getSubject() != null && m.getSubject().toLowerCase().contains(q))
                            || (m.getBody() != null && m.getBody().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
        }
        List<Map<String, Object>> enriched = messages.stream().map(this::enrich).collect(Collectors.toList());
        return ResponseEntity.ok(enriched);
    }

    @PostMapping("/send/")
    public ResponseEntity<?> send(@RequestBody MessageSendRequest req) {
        Message m = new Message();
        m.setFromUserId(req.fromUserId());
        m.setToUserId(req.toUserId());
        m.setSubject(req.subject());
        m.setBody(req.body());
        m.setAttachmentUrl(req.attachmentUrl());
        m.setAttachmentName(req.attachmentName());
        m.setAttachmentSize(req.attachmentSize());
        messageRepository.save(m);

        // Create in-app notification for the recipient
        var senderProfile = participantService.lookup(String.valueOf(m.getFromUserId()));
        String senderName = senderProfile != null ? senderProfile.getFullName() : "Someone";
        Notification n = new Notification();
        n.setUserId(m.getToUserId());
        n.setType("message");
        n.setTitle("New message from " + senderName);
        n.setMessage(m.getSubject() != null ? m.getSubject() : "");
        n.setRelatedId(m.getId());
        n.setLink("/webmail");
        notificationRepository.save(n);

        realtimeService.notifyUsers(m.getFromUserId(), m.getToUserId(), "MESSAGE_UPDATE", Map.of("messageId", m.getId()));
        return ResponseEntity.ok(enrich(m));
    }

    @PostMapping("/{id}/action/")
    public ResponseEntity<?> action(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Message m = messageRepository.findById(id).orElseThrow(() -> new RuntimeException("Message not found"));
        String action = body.get("action") == null ? "" : String.valueOf(body.get("action"));
        Long userId = null;
        Object uid = body.get("user_id");
        if (uid != null) {
            try {
                userId = Long.parseLong(String.valueOf(uid));
            } catch (NumberFormatException ignored) {
            }
        }
        switch (action) {
            case "star":
                m.setIsStarred(!Boolean.TRUE.equals(m.getIsStarred()));
                break;
            case "archive":
                m.setIsArchived(!Boolean.TRUE.equals(m.getIsArchived()));
                break;
            case "delete":
                m.setIsDeleted(true);
                break;
            case "read":
                if (userId != null && userId.equals(m.getToUserId())) {
                    m.setIsRead(true);
                }
                break;
            default:
                break;
        }
        messageRepository.save(m);
        realtimeService.notifyUsers(m.getFromUserId(), m.getToUserId(), "MESSAGE_UPDATE", Map.of("messageId", m.getId(), "action", action));
        return ResponseEntity.ok(enrich(m));
    }

    @GetMapping("/attachment/")
    public ResponseEntity<?> attachment(@RequestParam String path) {
        return ResponseEntity.ok(path);
    }

    private Map<String, Object> enrich(Message m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("from_user_id", m.getFromUserId());
        map.put("to_user_id", m.getToUserId());
        map.put("subject", m.getSubject());
        map.put("body", m.getBody());
        map.put("is_read", m.getIsRead());
        map.put("is_starred", m.getIsStarred());
        map.put("is_archived", m.getIsArchived());
        map.put("is_deleted_by_sender", false);
        map.put("is_deleted_by_recipient", Boolean.TRUE.equals(m.getIsDeleted()));
        map.put("created_at", m.getCreatedAt());
        map.put("attachment_url", m.getAttachmentUrl());
        map.put("attachment_name", m.getAttachmentName());
        map.put("attachment_size", m.getAttachmentSize());
        map.put("from_profile", participantService.lookup(String.valueOf(m.getFromUserId())));
        map.put("to_profile", participantService.lookup(String.valueOf(m.getToUserId())));
        return map;
    }
}
