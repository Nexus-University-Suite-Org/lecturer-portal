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
@Table(name = "quizzes")
@Getter
@Setter
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 200)
    private String title;

    @Column(length = 2000)
    private String description;

    private Long courseId;

    @Column(length = 200)
    private String courseTitle;

    @Column(length = 50)
    private String courseCode;

    private Long lecturerId;

    private Integer totalQuestions;

    private Double totalPoints;

    private Integer timeLimit;

    private Double passingScore;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    @Column(length = 50)
    private String status = "draft";

    private Integer attemptsAllowed;

    private Boolean shuffleQuestions;

    private Boolean showAnswers;

    private Boolean autoDeactivate;

    private Integer totalAttempts = 0;

    private Double averageScore;

    private Double completionRate;

    private Double highestScore;

    private Double lowestScore;
}
