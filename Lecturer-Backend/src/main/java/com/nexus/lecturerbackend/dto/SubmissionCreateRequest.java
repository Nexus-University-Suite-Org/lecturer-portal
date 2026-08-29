package com.nexus.lecturerbackend.dto;

public record SubmissionCreateRequest(
        Long studentId,
        Long assignmentId,
        String content,
        String fileUrl,
        String fileName) {
}
