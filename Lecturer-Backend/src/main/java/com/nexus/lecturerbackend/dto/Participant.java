package com.nexus.lecturerbackend.dto;

public record Participant(
        String id,
        String fullName,
        String email,
        String avatarUrl,
        String role) {
}
