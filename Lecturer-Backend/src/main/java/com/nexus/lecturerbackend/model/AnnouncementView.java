package com.nexus.lecturerbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "announcement_views", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"announcement_id", "student_id"})
})
@Getter
@Setter
public class AnnouncementView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long announcementId;

    private Long studentId;

    @Column(length = 200)
    private String studentName;

    private LocalDateTime viewedAt = LocalDateTime.now();
}
