package com.nexus.lecturerbackend.dto;

public record DirectoryEntry(
        String id,
        String fullName,
        String email,
        String role,
        String programme,
        String department,
        String avatarUrl) {
}
