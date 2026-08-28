package com.nexus.lecturerbackend.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "quiz_questions")
@Getter
@Setter
public class QuizQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long quizId;

    @Column(length = 5000)
    private String question;

    @Column(length = 5000)
    private String questionText;

    @Column(length = 50)
    private String type;

    @Column(length = 50)
    private String questionType;

    @ElementCollection(fetch = jakarta.persistence.FetchType.EAGER)
    @CollectionTable(name = "quiz_question_options", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "option_value")
    private List<String> options = new ArrayList<>();

    @Column(length = 2000)
    private String correctAnswer;

    private Double points;

    @Column(length = 2000)
    private String explanation;

    @Column(length = 50)
    private String difficulty;

    private Double confidence;

    @Column(length = 5000)
    private String originalText;
}
