package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.Lecturer;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LecturerRepository extends JpaRepository<Lecturer, Long> {
    Optional<Lecturer> findByEmailIgnoreCase(String email);
}
