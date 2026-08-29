package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.DirectoryEntry;
import com.nexus.lecturerbackend.dto.Participant;
import com.nexus.lecturerbackend.service.ParticipantService;
import java.util.List;
import java.util.Optional;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DirectoryController {

    private final ParticipantService participantService;

    public DirectoryController(ParticipantService participantService) {
        this.participantService = participantService;
    }

    @GetMapping("/directory")
    public ResponseEntity<List<DirectoryEntry>> directory() {
        return ResponseEntity.ok(participantService.directory());
    }

    @GetMapping("/participants/resolve")
    public ResponseEntity<?> resolve(@RequestParam String email) {
        Optional<DirectoryEntry> match = participantService.directory().stream()
                .filter(d -> d.email() != null && d.email().equalsIgnoreCase(email.trim()))
                .findFirst();
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        if (match.isEmpty()) {
            result.put("found", false);
            return ResponseEntity.ok(result);
        }
        DirectoryEntry d = match.get();
        result.put("found", true);
        result.put("id", d.id());
        result.put("full_name", d.fullName());
        result.put("email", d.email());
        result.put("role", d.role());
        result.put("avatar_url", d.avatarUrl());
        return ResponseEntity.ok(result);
    }
}
