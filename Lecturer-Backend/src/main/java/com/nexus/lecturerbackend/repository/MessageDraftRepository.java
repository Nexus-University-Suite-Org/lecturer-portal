package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.MessageDraft;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageDraftRepository extends JpaRepository<MessageDraft, Long> {
    List<MessageDraft> findByUserIdOrderByCreatedAtDesc(Long userId);
}
