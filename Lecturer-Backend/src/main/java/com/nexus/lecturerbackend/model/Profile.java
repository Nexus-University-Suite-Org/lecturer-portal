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
@Table(name = "profiles")
@Getter
@Setter
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 200)
    private String fullName;

    @Column(length = 200)
    private String email;

    @Column(length = 200)
    private String department;

    @Column(length = 200)
    private String college;

    @Column(length = 200)
    private String programme;

    @Column(length = 50)
    private String studentNumber;

    @Column(length = 50)
    private String registrationNumber;

    @Column(length = 50)
    private String phone;

    private String avatarUrl;

    @Column(length = 2000)
    private String bio;

    @Column(length = 50)
    private String role = "student";

    private String updatedAt;
}
