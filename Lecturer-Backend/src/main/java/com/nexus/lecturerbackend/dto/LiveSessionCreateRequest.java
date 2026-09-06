package com.nexus.lecturerbackend.dto;

import java.time.LocalDateTime;

public record LiveSessionCreateRequest(
        Long courseId,
        String title,
        String courseName,
        Long courseUnitId,
        LocalDateTime scheduledAt,
        Integer durationMinutes,
        String meetLink,
        String imageUrl) {
}
