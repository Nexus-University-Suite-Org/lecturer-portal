package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.GradebookScheme;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GradebookSchemeRepository extends JpaRepository<GradebookScheme, Long> {
}