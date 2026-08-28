package com.nexus.lecturerbackend.dto;

import java.time.LocalDateTime;

public record AssignmentCreateRequest(
        Long lecturerId,
        Long courseId,
        String courseTitle,
        String courseCode,
        String title,
        String description,
        LocalDateTime dueDate,
        Double totalPoints,
        String status) {
}
