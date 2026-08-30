package com.nexus.lecturerbackend.service;

import com.nexus.lecturerbackend.configuration.JwtUtil;
import com.nexus.lecturerbackend.dto.AuthLoginResponse;
import com.nexus.lecturerbackend.model.Lecturer;
import com.nexus.lecturerbackend.repository.LecturerRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class AuthService {

    private final LecturerRepository lecturerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Value("${set-password.secret:reg-backend-jwt-secret-key-2026-secure-long-enough-for-hmac}")
    private String setPasswordSecret;

    public AuthService(LecturerRepository lecturerRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.lecturerRepository = lecturerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AuthLoginResponse login(String email, String password) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new RuntimeException("Email and password are required");
        }
        Lecturer lecturer = lecturerRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        if (lecturer.getPasswordHash() == null || !passwordEncoder.matches(password, lecturer.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }
        String token = jwtUtil.generateToken(lecturer.getId(), lecturer.getEmail(), "LECTURER");
        return new AuthLoginResponse(
                token,
                new AuthLoginResponse.User(lecturer.getId(), lecturer.getEmail(), lecturer.getFullName(), "lecturer"),
                new AuthLoginResponse.Profile(
                        lecturer.getId(),
                        lecturer.getFullName(),
                        lecturer.getEmail(),
                        lecturer.getPhoneNumber(),
                        lecturer.getDepartment(),
                        lecturer.getCollege(),
                        lecturer.getSpecialization(),
                        lecturer.getDepartment(),
                        "lecturer",
                        "active")
        );
    }

    @Transactional
    public void setPassword(String email, String newPassword, String token,
                            String firstName, String lastName, String department, String specialization) {
        // Verify the token
        String tokenEmail = verifySetPasswordToken(token);
        if (tokenEmail == null || !tokenEmail.equalsIgnoreCase(email.trim())) {
            throw new RuntimeException("Invalid or expired token");
        }

        // Find existing lecturer or auto-create with details from registrar
        Lecturer lecturer = lecturerRepository.findByEmailIgnoreCase(email.trim())
                .orElseGet(() -> {
                    Lecturer newLecturer = new Lecturer();
                    newLecturer.setEmail(email.trim());
                    String fullName = ((firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "")).trim();
                    newLecturer.setFullName(fullName.isEmpty() ? email.split("@")[0] : fullName);
                    newLecturer.setDepartment(department != null ? department : "");
                    newLecturer.setSpecialization(specialization != null ? specialization : "");
                    newLecturer.setStudentNumber("");
                    newLecturer.setCollege("");
                    newLecturer.setRole("lecturer");
                    return newLecturer;
                });

        lecturer.setPasswordHash(passwordEncoder.encode(newPassword));
        lecturerRepository.save(lecturer);
    }

    private String verifySetPasswordToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(setPasswordSecret.getBytes(StandardCharsets.UTF_8));
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if ("set-password".equals(claims.get("purpose", String.class))) {
                Date expiration = claims.getExpiration();
                if (expiration != null && expiration.after(new Date())) {
                    return claims.getSubject();
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
