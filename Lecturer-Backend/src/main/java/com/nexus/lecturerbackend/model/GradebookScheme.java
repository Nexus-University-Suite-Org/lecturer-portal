package com.nexus.lecturerbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "gradebook_schemes")
@Getter
@Setter
public class GradebookScheme {

    @Id
    private Long courseId;

    private Double courseworkWeight;

    private Double examWeight;

    @Column(length = 20)
    private String examMode;

    private Double examTheoryWeight;

    private Double examPracticalWeight;

    private Double quizWeight;

    private Integer bestN;

    private Integer manualCourseworkItems;

    @Column(columnDefinition = "text")
    private String itemLabels;

    @Column(columnDefinition = "text")
    private String gradeScale;

    private LocalDateTime updatedAt;
}