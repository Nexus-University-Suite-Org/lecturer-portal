package com.nexus.lecturerbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "student_grades")
@Getter
@Setter
public class StudentGrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long studentId;

    private Long courseId;

    private Long lecturerId;

    private Double assignment1;

    private Double assignment2;

    private Double participation;

    private Double courseworkExtra;

    private Double midterm;

    private Double finalExam;

    private Double total;

    @Column(length = 10)
    private String grade;

    private Double gp;

    @Column(length = 20)
    private String academicYear;

    @Column(length = 20)
    private String semester;

    @Column(columnDefinition = "text")
    private String marksJson;
}
