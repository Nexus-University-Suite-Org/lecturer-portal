package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.Profile;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, Long> {
    List<Profile> findByRole(String role);
    List<Profile> findByEmailIgnoreCase(String email);
    Optional<Profile> findById(Long id);
}
