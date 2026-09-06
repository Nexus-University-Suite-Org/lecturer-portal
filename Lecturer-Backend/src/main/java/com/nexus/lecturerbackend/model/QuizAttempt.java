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
@Table(name = "quiz_attempts")
@Getter
@Setter
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long quizId;

    private Long studentId;

    @Column(length = 200)
    private String studentName;

    @Column(length = 200)
    private String studentEmail;

    private Double score;

    private Double percentage;

    private Integer timeTaken;

    private Boolean passed;

    @Column(length = 20)
    private String status = "submitted";

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    @Column(length = 5000)
    private String answers;

    private Double totalPoints;
}
