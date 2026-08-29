package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.SystemMedia;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemMediaRepository extends JpaRepository<SystemMedia, Long> {
    Optional<SystemMedia> findByOwnerIdAndOwnerType(Long ownerId, String ownerType);
}
