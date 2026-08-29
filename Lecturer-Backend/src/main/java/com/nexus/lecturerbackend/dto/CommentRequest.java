package com.nexus.lecturerbackend.dto;

public record CommentRequest(
        Long studentId,
        String studentName,
        String content) {
}
