package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.Announcement;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findAllByOrderByCreatedAtDesc();
    List<Announcement> findByAuthorIdOrderByCreatedAtDesc(Long authorId);
}
