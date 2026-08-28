package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.LiveSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LiveSessionRepository extends JpaRepository<LiveSession, Long> {
}
