package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.AnnouncementComment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementCommentRepository extends JpaRepository<AnnouncementComment, Long> {
    long countByAnnouncementId(Long announcementId);
    List<AnnouncementComment> findByAnnouncementIdOrderByCreatedAtDesc(Long announcementId);
    List<AnnouncementComment> findByAnnouncementIdAndStudentIdOrderByCreatedAtDesc(Long announcementId, Long studentId);
}
