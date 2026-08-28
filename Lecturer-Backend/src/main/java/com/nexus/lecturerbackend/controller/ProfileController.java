package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.ProfileUpdateRequest;
import com.nexus.lecturerbackend.model.Lecturer;
import com.nexus.lecturerbackend.model.Profile;
import com.nexus.lecturerbackend.repository.LecturerRepository;
import com.nexus.lecturerbackend.repository.ProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private final ProfileRepository profileRepository;
    private final LecturerRepository lecturerRepository;

    public ProfileController(ProfileRepository profileRepository, LecturerRepository lecturerRepository) {
        this.profileRepository = profileRepository;
        this.lecturerRepository = lecturerRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String role) {
        if (role != null && role.equalsIgnoreCase("lecturer")) {
            return ResponseEntity.ok(lecturerRepository.findAll());
        }
        return ResponseEntity.ok(profileRepository.findAll());
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash(@RequestParam(required = false) String role) {
        return list(role);
    }

    @GetMapping("/by-user/{uid}/")
    public ResponseEntity<?> byUser(@PathVariable Long uid) {
        return lecturerRepository.findById(uid)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> profileRepository.findById(uid)
                        .<ResponseEntity<?>>map(ResponseEntity::ok)
                        .orElseGet(() -> ResponseEntity.ok(null)));
    }

    @GetMapping("/by-user/{uid}")
    public ResponseEntity<?> byUserNoSlash(@PathVariable Long uid) {
        return byUser(uid);
    }

    @PostMapping("/by-user/{uid}/")
    public ResponseEntity<?> update(@PathVariable Long uid, @RequestBody ProfileUpdateRequest req) {
        Lecturer lecturer = lecturerRepository.findById(uid)
                .orElseThrow(() -> new RuntimeException("Lecturer not found"));
        if (req.fullName() != null) lecturer.setFullName(req.fullName());
        if (req.department() != null) lecturer.setDepartment(req.department());
        if (req.specialization() != null) lecturer.setSpecialization(req.specialization());
        if (req.officeLocation() != null) lecturer.setOfficeLocation(req.officeLocation());
        if (req.officeHours() != null) lecturer.setOfficeHours(req.officeHours());
        if (req.officePhone() != null) lecturer.setOfficePhone(req.officePhone());
        if (req.phoneNumber() != null) lecturer.setPhoneNumber(req.phoneNumber());
        if (req.bio() != null) lecturer.setBio(req.bio());
        if (req.colorTheme() != null) lecturer.setColorTheme(req.colorTheme());
        if (req.dashboardLayout() != null) lecturer.setDashboardLayout(req.dashboardLayout());
        if (req.fontSize() != null) lecturer.setFontSize(req.fontSize());
        if (req.language() != null) lecturer.setLanguage(req.language());
        if (req.showSidebar() != null) lecturer.setShowSidebar(req.showSidebar());
        if (req.animateTransitions() != null) lecturer.setAnimateTransitions(req.animateTransitions());
        if (req.compactMode() != null) lecturer.setCompactMode(req.compactMode());
        if (req.showTooltips() != null) lecturer.setShowTooltips(req.showTooltips());
        if (req.classDuration() != null) lecturer.setClassDuration(req.classDuration());
        if (req.teachingMode() != null) lecturer.setTeachingMode(req.teachingMode());
        if (req.maxStudents() != null) lecturer.setMaxStudents(req.maxStudents());
        if (req.gradingScale() != null) lecturer.setGradingScale(req.gradingScale());
        if (req.attendanceTracking() != null) lecturer.setAttendanceTracking(req.attendanceTracking());
        if (req.lateSubmissions() != null) lecturer.setLateSubmissions(req.lateSubmissions());
        if (req.assignmentRubrics() != null) lecturer.setAssignmentRubrics(req.assignmentRubrics());
        if (req.peerReview() != null) lecturer.setPeerReview(req.peerReview());
        if (req.emailNewSubmissions() != null) lecturer.setEmailNewSubmissions(req.emailNewSubmissions());
        if (req.emailGradeRequests() != null) lecturer.setEmailGradeRequests(req.emailGradeRequests());
        if (req.emailDeadlines() != null) lecturer.setEmailDeadlines(req.emailDeadlines());
        if (req.emailMessages() != null) lecturer.setEmailMessages(req.emailMessages());
        if (req.emailAnnouncements() != null) lecturer.setEmailAnnouncements(req.emailAnnouncements());
        if (req.pushNotifications() != null) lecturer.setPushNotifications(req.pushNotifications());
        if (req.inAppNotifications() != null) lecturer.setInAppNotifications(req.inAppNotifications());
        if (req.digestEmail() != null) lecturer.setDigestEmail(req.digestEmail());
        if (req.defaultGradingScale() != null) lecturer.setDefaultGradingScale(req.defaultGradingScale());
        if (req.latePenalty() != null) lecturer.setLatePenalty(req.latePenalty());
        if (req.minPassingGrade() != null) lecturer.setMinPassingGrade(req.minPassingGrade());
        if (req.roundingMethod() != null) lecturer.setRoundingMethod(req.roundingMethod());
        if (req.showFeedback() != null) lecturer.setShowFeedback(req.showFeedback());
        if (req.allowDisputes() != null) lecturer.setAllowDisputes(req.allowDisputes());
        if (req.publishByDate() != null) lecturer.setPublishByDate(req.publishByDate());
        if (req.showClassAverage() != null) lecturer.setShowClassAverage(req.showClassAverage());
        if (req.profileVisible() != null) lecturer.setProfileVisible(req.profileVisible());
        if (req.showEmail() != null) lecturer.setShowEmail(req.showEmail());
        if (req.twoFactorAuth() != null) lecturer.setTwoFactorAuth(req.twoFactorAuth());
        if (req.loginAlerts() != null) lecturer.setLoginAlerts(req.loginAlerts());
        lecturerRepository.save(lecturer);
        return ResponseEntity.ok(lecturer);
    }
}
