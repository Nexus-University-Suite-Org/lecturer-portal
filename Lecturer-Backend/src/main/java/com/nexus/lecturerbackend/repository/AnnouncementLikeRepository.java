package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.AnnouncementLike;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementLikeRepository extends JpaRepository<AnnouncementLike, Long> {
    long countByAnnouncementId(Long announcementId);
    Optional<AnnouncementLike> findByAnnouncementIdAndStudentId(Long announcementId, Long studentId);
    boolean existsByAnnouncementIdAndStudentId(Long announcementId, Long studentId);
    void deleteByAnnouncementIdAndStudentId(Long announcementId, Long studentId);
}
