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
@Table(name = "assignments")
@Getter
@Setter
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long lecturerId;

    private Long courseId;

    @Column(length = 200)
    private String courseTitle;

    @Column(length = 50)
    private String courseCode;

    @Column(length = 200)
    private String title;

    @Column(length = 5000)
    private String description;

    private LocalDateTime dueDate;

    private Double totalPoints;

    @Column(length = 50)
    private String status = "draft";

    @Column(length = 500)
    private String instructionDocumentUrl;

    @Column(length = 500)
    private String instructionDocumentName;
}
