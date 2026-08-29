package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.AnnouncementView;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementViewRepository extends JpaRepository<AnnouncementView, Long> {
    long countByAnnouncementId(Long announcementId);
    Optional<AnnouncementView> findByAnnouncementIdAndStudentId(Long announcementId, Long studentId);
    boolean existsByAnnouncementIdAndStudentId(Long announcementId, Long studentId);
}
