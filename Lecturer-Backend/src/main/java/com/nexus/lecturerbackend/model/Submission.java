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
@Table(name = "submissions")
@Getter
@Setter
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long studentId;

    private Long assignmentId;

    @Column(length = 5000)
    private String content;

    @Column(length = 50)
    private String status = "submitted";

    private LocalDateTime submittedAt;

    private Double score;

    @Column(length = 2000)
    private String feedback;

    @Column(length = 500)
    private String fileUrl;

    @Column(length = 500)
    private String fileName;
}
