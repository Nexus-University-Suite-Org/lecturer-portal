package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.Message;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByToUserIdAndIsDeletedFalseOrderByCreatedAtDesc(Long toUserId);
    List<Message> findByFromUserIdAndIsDeletedFalseOrderByCreatedAtDesc(Long fromUserId);
    List<Message> findByFromUserIdAndIsStarredTrueAndIsDeletedFalseOrderByCreatedAtDesc(Long userId);
    List<Message> findByToUserIdAndIsStarredTrueAndIsDeletedFalseOrderByCreatedAtDesc(Long userId);
}
