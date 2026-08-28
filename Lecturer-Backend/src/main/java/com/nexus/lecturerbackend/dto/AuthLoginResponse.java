package com.nexus.lecturerbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AuthLoginResponse(
        String token,
        User user,
        Profile profile) {

    public record User(
            Long id,
            String email,
            @JsonProperty("fullName") String fullName,
            String role) {
    }

    public record Profile(
            @JsonProperty("applicationId") Long applicationId,
            @JsonProperty("fullName") String fullName,
            String email,
            @JsonProperty("phoneNumber") String phoneNumber,
            String department,
            String college,
            String programme,
            @JsonProperty("assignedProgramme") String assignedProgramme,
            String role,
            String status) {
    }
}
