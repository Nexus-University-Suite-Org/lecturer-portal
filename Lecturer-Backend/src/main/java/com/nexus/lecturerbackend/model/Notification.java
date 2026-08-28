package com.nexus.lecturerbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "notifications")
@Getter
@Setter
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    @Column(length = 50)
    private String type;

    @Column(length = 200)
    private String title;

    @Column(length = 2000)
    private String message;

    @Column(length = 500)
    private String link;

    private Long relatedId;

    private Boolean isRead = false;

    private LocalDateTime createdAt = LocalDateTime.now();
}
