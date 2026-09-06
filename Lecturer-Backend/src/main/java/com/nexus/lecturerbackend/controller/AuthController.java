package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.AuthChangePasswordRequest;
import com.nexus.lecturerbackend.dto.AuthLoginRequest;
import com.nexus.lecturerbackend.dto.AuthLoginResponse;
import com.nexus.lecturerbackend.configuration.JwtUtil;
import com.nexus.lecturerbackend.service.AuthService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthService authService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/student/login")
    public ResponseEntity<?> login(@RequestBody AuthLoginRequest request) {
        try {
            AuthLoginResponse response = authService.login(request.email(), request.password());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(Map.of("detail", e.getMessage()));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody AuthChangePasswordRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long uid = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtUtil.isValid(token)) {
                    uid = jwtUtil.getUserId(token);
                }
            }
            authService.changePassword(uid != null ? uid : request.uid(),
                    request.currentPassword(), request.newPassword());
            return ResponseEntity.ok(Map.of("ok", true, "message", "Password updated successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/student/set-password")
    public ResponseEntity<?> setPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String newPassword = body.get("newPassword");
            String token = body.get("token");

            if (email == null || email.isBlank() || newPassword == null || newPassword.isBlank() || token == null || token.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("ok", false, "message", "Email, password, and token are required"));
            }

            authService.setPassword(email, newPassword, token,
                    body.getOrDefault("firstName", ""),
                    body.getOrDefault("lastName", ""),
                    body.getOrDefault("department", ""),
                    body.getOrDefault("specialization", ""));
            return ResponseEntity.ok(Map.of("ok", true, "message", "Password set successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/student/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(Map.of("ok", false, "message", "Password reset is managed by the institution"));
    }
}
