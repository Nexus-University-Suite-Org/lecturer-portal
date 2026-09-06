package com.nexus.lecturerbackend.dto;

import java.time.LocalDateTime;

public record AssignmentUpdateRequest(
        Long courseId,
        String courseTitle,
        String courseCode,
        String title,
        String description,
        LocalDateTime dueDate,
        Double totalPoints,
        String instructionDocumentUrl,
        String instructionDocumentName) {
}
