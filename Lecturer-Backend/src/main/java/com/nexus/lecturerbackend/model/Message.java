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
@Table(name = "messages")
@Getter
@Setter
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long fromUserId;

    private Long toUserId;

    @Column(length = 200)
    private String subject;

    @Column(length = 5000)
    private String body;

    private LocalDateTime createdAt = LocalDateTime.now();

    private Boolean isRead = false;

    private Boolean isStarred = false;

    private Boolean isDeleted = false;

    @Column(length = 500)
    private String attachmentUrl;

    @Column(length = 255)
    private String attachmentName;

    private Long attachmentSize;
}
