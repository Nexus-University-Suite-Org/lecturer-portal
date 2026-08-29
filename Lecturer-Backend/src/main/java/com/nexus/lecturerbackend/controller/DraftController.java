package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.model.MessageDraft;
import com.nexus.lecturerbackend.repository.MessageDraftRepository;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/drafts")
public class DraftController {

    private final MessageDraftRepository draftRepository;

    public DraftController(MessageDraftRepository draftRepository) {
        this.draftRepository = draftRepository;
    }

    @GetMapping("/{uid}/")
    public ResponseEntity<?> list(@PathVariable Long uid) {
        List<Map<String, Object>> result = draftRepository.findByUserIdOrderByCreatedAtDesc(uid)
                .stream().map(this::enrich).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/save/")
    public ResponseEntity<?> save(@RequestBody Map<String, Object> body) {
        MessageDraft draft = new MessageDraft();
        Long userId = Long.valueOf(String.valueOf(body.get("user_id")));
        Object toId = body.get("to_user_id");
        draft.setUserId(userId);
        draft.setToUserId(toId == null ? null : Long.valueOf(String.valueOf(toId)));
        draft.setSubject(body.get("subject") == null ? null : String.valueOf(body.get("subject")));
        draft.setBody(body.get("body") == null ? null : String.valueOf(body.get("body")));
        draft = draftRepository.save(draft);
        return ResponseEntity.ok(enrich(draft));
    }

    private Map<String, Object> enrich(MessageDraft d) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", d.getId());
        map.put("user_id", d.getUserId());
        map.put("to_user_id", d.getToUserId());
        map.put("subject", d.getSubject());
        map.put("body", d.getBody());
        map.put("created_at", d.getCreatedAt());
        return map;
    }
}
