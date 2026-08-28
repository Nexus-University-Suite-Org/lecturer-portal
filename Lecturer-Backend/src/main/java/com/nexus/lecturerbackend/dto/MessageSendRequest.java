package com.nexus.lecturerbackend.dto;

public record MessageSendRequest(
        Long fromUserId,
        Long toUserId,
        String subject,
        String body,
        String attachmentUrl,
        String attachmentName,
        Long attachmentSize) {
}
