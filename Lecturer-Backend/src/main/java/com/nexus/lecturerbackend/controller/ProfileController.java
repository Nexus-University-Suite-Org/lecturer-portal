package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.ProfileUpdateRequest;
import com.nexus.lecturerbackend.model.CourseUnit;
import com.nexus.lecturerbackend.model.Lecturer;
import com.nexus.lecturerbackend.model.Profile;
import com.nexus.lecturerbackend.repository.CourseUnitRepository;
import com.nexus.lecturerbackend.repository.LecturerRepository;
import com.nexus.lecturerbackend.repository.ProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private final ProfileRepository profileRepository;
    private final LecturerRepository lecturerRepository;
    private final CourseUnitRepository courseUnitRepository;

    public ProfileController(ProfileRepository profileRepository, LecturerRepository lecturerRepository, CourseUnitRepository courseUnitRepository) {
        this.profileRepository = profileRepository;
        this.lecturerRepository = lecturerRepository;
        this.courseUnitRepository = courseUnitRepository;
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

    @PutMapping("/by-email/{email}/assigned-units")
    public ResponseEntity<?> updateAssignedUnits(
            @PathVariable String email,
            @RequestBody Map<String, Object> body) {
        Lecturer lecturer = lecturerRepository.findByEmailIgnoreCase(email)
                .orElse(null);
        if (lecturer == null) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "message", "Lecturer not found"));
        }
        @SuppressWarnings("unchecked")
        List<Integer> unitIds = (List<Integer>) body.get("assigned_course_units");
        if (unitIds == null) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "message", "assigned_course_units is required"));
        }
        lecturer.setAssignedCourseUnits(unitIds.stream().map(Integer::longValue).toList());
        lecturerRepository.save(lecturer);
        return ResponseEntity.ok(Map.of("ok", true, "message", "Assigned units updated"));
    }

    @PostMapping("/course-units/sync")
    public ResponseEntity<?> syncCourseUnits(@RequestBody List<Map<String, Object>> units) {
        int synced = 0;
        for (Map<String, Object> unitData : units) {
            Long externalId = ((Number) unitData.get("id")).longValue();
            String code = (String) unitData.get("code");
            String name = (String) unitData.get("name");
            Integer credits = unitData.get("credits") != null ? ((Number) unitData.get("credits")).intValue() : 3;
            String semester = unitData.get("semester") != null ? String.valueOf(unitData.get("semester")) : "1";
            String year = unitData.get("year") != null ? String.valueOf(unitData.get("year")) : "1";

            // Find existing by external code+name or create new
            CourseUnit existing = courseUnitRepository.findAll().stream()
                    .filter(c -> c.getCode() != null && c.getCode().equals(code))
                    .findFirst().orElse(null);

            if (existing != null) {
                existing.setName(name);
                existing.setCredits(credits);
                existing.setSemester(semester);
                existing.setYear(year);
                courseUnitRepository.save(existing);
            } else {
                CourseUnit cu = new CourseUnit();
                cu.setCode(code);
                cu.setName(name);
                cu.setCredits(credits);
                cu.setSemester(semester);
                cu.setYear(year);
                courseUnitRepository.save(cu);
                synced++;
            }
        }
        return ResponseEntity.ok(Map.of("ok", true, "message", "Course units synced", "new", synced));
    }
}
