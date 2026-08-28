package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.MessageSendRequest;
import com.nexus.lecturerbackend.model.Message;
import com.nexus.lecturerbackend.repository.MessageRepository;
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

    public MessageController(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
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
        } else {
            messages = messageRepository.findByToUserIdAndIsDeletedFalseOrderByCreatedAtDesc(uid);
        }
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            messages = messages.stream()
                    .filter(m -> (m.getSubject() != null && m.getSubject().toLowerCase().contains(q))
                            || (m.getBody() != null && m.getBody().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
        }
        return ResponseEntity.ok(messages);
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
        return ResponseEntity.ok(m);
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
        return ResponseEntity.ok(m);
    }

    @GetMapping("/attachment/")
    public ResponseEntity<?> attachment(@RequestParam String path) {
        return ResponseEntity.ok(path);
    }
}
