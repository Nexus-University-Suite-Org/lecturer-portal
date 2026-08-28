package com.nexus.lecturerbackend.dto;

public record SubmissionUpdateRequest(
        String status,
        Double score,
        String feedback) {
}
