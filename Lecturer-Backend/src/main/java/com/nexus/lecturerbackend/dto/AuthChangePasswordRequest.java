package com.nexus.lecturerbackend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

public record AuthChangePasswordRequest(
        Long uid,
        @JsonAlias("current_password") String currentPassword,
        @JsonAlias("new_password") String newPassword) {
}