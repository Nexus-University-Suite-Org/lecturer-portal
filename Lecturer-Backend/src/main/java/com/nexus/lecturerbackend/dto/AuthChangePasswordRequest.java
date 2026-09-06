package com.nexus.lecturerbackend.dto;

public record AuthChangePasswordRequest(Long uid, String currentPassword, String newPassword) {
}