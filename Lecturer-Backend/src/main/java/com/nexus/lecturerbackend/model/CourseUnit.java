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
@Table(name = "course_units")
@Getter
@Setter
public class CourseUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 50)
    private String code;

    @Column(length = 200)
    private String name;

    private Integer credits;

    @Column(length = 50)
    private String semester;

    @Column(length = 20)
    private String year;

    @Column(length = 50)
    private String courseUnitCode;

    @Column(length = 200)
    private String courseUnitName;
}
