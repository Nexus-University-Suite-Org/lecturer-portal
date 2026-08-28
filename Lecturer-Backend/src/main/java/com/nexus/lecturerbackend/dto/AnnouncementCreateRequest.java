package com.nexus.lecturerbackend.dto;

public record AnnouncementCreateRequest(
        Long courseId,
        Long authorId,
        String title,
        String content,
        String priority) {
}
