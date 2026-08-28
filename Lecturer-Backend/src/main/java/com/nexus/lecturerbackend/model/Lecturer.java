package com.nexus.lecturerbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "lecturers")
@Getter
@Setter
public class Lecturer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String fullName;

    @Column(nullable = false, unique = true, length = 200)
    private String email;

    @Column(nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String passwordHash;

    @Column(length = 50)
    private String studentNumber;

    @Column(length = 200)
    private String department;

    @Column(length = 200)
    private String college;

    @Column(length = 200)
    private String specialization;

    @Column(length = 200)
    private String officeLocation;

    @Column(length = 500)
    private String officeHours;

    @Column(length = 50)
    private String officePhone;

    @Column(length = 50)
    private String phoneNumber;

    @Column(length = 2000)
    private String bio;

    private String avatarUrl;

    @ElementCollection(fetch = jakarta.persistence.FetchType.EAGER)
    @Column(name = "assigned_course_unit")
    private List<Long> assignedCourseUnits = new ArrayList<>();

    @Column(nullable = false)
    private String role = "lecturer";

    @Column(length = 50)
    private String colorTheme;

    @Column(length = 50)
    private String dashboardLayout;

    @Column(length = 20)
    private String fontSize;

    @Column(length = 20)
    private String language;

    private Boolean showSidebar;

    private Boolean animateTransitions;

    private Boolean compactMode;

    private Boolean showTooltips;

    private Integer classDuration;

    @Column(length = 50)
    private String teachingMode;

    private Integer maxStudents;

    @Column(length = 50)
    private String gradingScale;

    private Boolean attendanceTracking;

    private Boolean lateSubmissions;

    private Boolean assignmentRubrics;

    private Boolean peerReview;

    private Boolean emailNewSubmissions;

    private Boolean emailGradeRequests;

    private Boolean emailDeadlines;

    private Boolean emailMessages;

    private Boolean emailAnnouncements;

    private Boolean pushNotifications;

    private Boolean inAppNotifications;

    private Boolean digestEmail;

    @Column(length = 50)
    private String defaultGradingScale;

    private Double latePenalty;

    private Double minPassingGrade;

    @Column(length = 50)
    private String roundingMethod;

    private Boolean showFeedback;

    private Boolean allowDisputes;

    private Boolean publishByDate;

    private Boolean showClassAverage;

    private Boolean profileVisible;

    private Boolean showEmail;

    private Boolean twoFactorAuth;

    private Boolean loginAlerts;
}
