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
@Table(name = "live_sessions")
@Getter
@Setter
public class LiveSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 200)
    private String title;

    private Long courseId;

    @Column(length = 200)
    private String courseName;

    private Long courseUnitId;

    private LocalDateTime scheduledAt;

    private Integer durationMinutes;

    @Column(length = 500)
    private String meetLink;

    @Column(length = 500)
    private String imageUrl;

    private Integer attendees = 0;

    @Column(length = 50)
    private String status = "scheduled";

    @Column(length = 50)
    private String sessionType;

    private Long classroomId;

    @Column(columnDefinition = "boolean default false")
    private Boolean notifyStarted = false;
}
