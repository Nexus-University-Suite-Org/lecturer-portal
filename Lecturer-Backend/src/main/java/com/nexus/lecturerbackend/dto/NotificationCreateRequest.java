package com.nexus.lecturerbackend.dto;

public record NotificationCreateRequest(
        Long userId,
        String type,
        String title,
        String message,
        Long relatedId,
        String link) {
}
