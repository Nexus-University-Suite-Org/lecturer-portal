package com.nexus.lecturerbackend.service;

import com.nexus.lecturerbackend.configuration.JwtUtil;
import com.nexus.lecturerbackend.dto.AuthLoginResponse;
import com.nexus.lecturerbackend.model.Lecturer;
import com.nexus.lecturerbackend.repository.LecturerRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final LecturerRepository lecturerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

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
}
