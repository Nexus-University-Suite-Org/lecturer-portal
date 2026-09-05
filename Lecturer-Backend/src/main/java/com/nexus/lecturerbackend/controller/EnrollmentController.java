package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.model.CourseUnit;
import com.nexus.lecturerbackend.model.Enrollment;
import com.nexus.lecturerbackend.model.Lecturer;
import com.nexus.lecturerbackend.model.Notification;
import com.nexus.lecturerbackend.model.Student;
import com.nexus.lecturerbackend.repository.CourseUnitRepository;
import com.nexus.lecturerbackend.repository.EnrollmentRepository;
import com.nexus.lecturerbackend.repository.LecturerRepository;
import com.nexus.lecturerbackend.repository.NotificationRepository;
import com.nexus.lecturerbackend.repository.StudentRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/enrollments")
public class EnrollmentController {

    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final LecturerRepository lecturerRepository;
    private final NotificationRepository notificationRepository;
    private final CourseUnitRepository courseUnitRepository;

    public EnrollmentController(EnrollmentRepository enrollmentRepository,
                                 StudentRepository studentRepository,
                                 LecturerRepository lecturerRepository,
                                 NotificationRepository notificationRepository,
                                 CourseUnitRepository courseUnitRepository) {
        this.enrollmentRepository = enrollmentRepository;
        this.studentRepository = studentRepository;
        this.lecturerRepository = lecturerRepository;
        this.notificationRepository = notificationRepository;
        this.courseUnitRepository = courseUnitRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String courseIds,
                                  @RequestParam(required = false) String course_id,
                                  @RequestParam(required = false) String student_id,
                                  @RequestParam(name = "course_ids", required = false) String course_ids) {
        if (course_ids != null && !course_ids.isBlank()) {
            courseIds = course_ids;
        }
        if (student_id != null && !student_id.isBlank()) {
            try {
                Long sid = Long.parseLong(student_id.trim());
                List<Enrollment> enrollments = enrollmentRepository.findByStudentId(sid);
                return ResponseEntity.ok(enrichEnrollments(enrollments));
            } catch (NumberFormatException ignored) {
            }
        }
        if (courseIds != null && !courseIds.isBlank()) {
            List<Long> ids = parseIds(courseIds);
            if (!ids.isEmpty()) {
                return ResponseEntity.ok(enrichEnrollments(enrollmentRepository.findByCourseIdIn(ids)));
            }
        }
        if (course_id != null && !course_id.isBlank()) {
            try {
                return ResponseEntity.ok(enrichEnrollments(enrollmentRepository.findByCourseId(Long.parseLong(course_id))));
            } catch (NumberFormatException ignored) {
            }
        }
        return ResponseEntity.ok(enrichEnrollments(enrollmentRepository.findAll()));
    }

    @GetMapping("/")
    public ResponseEntity<?> listSlash(@RequestParam(required = false) String courseIds,
                                       @RequestParam(required = false) String course_id,
                                       @RequestParam(required = false) String student_id,
                                       @RequestParam(name = "course_ids", required = false) String course_ids) {
        return list(courseIds, course_id, student_id, course_ids);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        Long studentId = toLong(body.getOrDefault("student_id", body.get("studentId")));
        Long courseId = toLong(body.getOrDefault("course_id", body.get("courseId")));
        String courseCode = toStr(body.getOrDefault("courseCode", body.get("course_code")));
        String courseName = toStr(body.getOrDefault("courseName", body.get("course_name")));
        String paperType = toStr(body.getOrDefault("paper_type", body.getOrDefault("paperType", "normal")));

        if (studentId == null) {
            return ResponseEntity.badRequest().body(Map.of("detail", "student_id is required"));
        }

        // Resolve courseId from courseCode if courseId is not provided
        if (courseId == null && courseCode != null && !courseCode.isBlank()) {
            courseId = resolveCourseUnitId(courseCode, courseName);
        }

        if (courseId == null) {
            return ResponseEntity.badRequest().body(Map.of("detail", "course_id or courseCode is required"));
        }

        List<Enrollment> existing = enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId);
        if (!existing.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("detail", "Already enrolled in this course"));
        }

        Enrollment enrollment = new Enrollment();
        enrollment.setStudentId(studentId);
        enrollment.setCourseId(courseId);
        enrollment.setPaperType(paperType);
        enrollment.setStatus("pending");
        enrollment.setEnrolledAt(LocalDateTime.now());
        enrollment = enrollmentRepository.save(enrollment);

        notifyLecturersForCourse(courseId, studentId, "enrollment_request");

        return ResponseEntity.ok(enrollment);
    }

    @PostMapping("/")
    public ResponseEntity<?> createSlash(@RequestBody Map<String, Object> body) {
        return create(body);
    }

    @PostMapping("/batch")
    public ResponseEntity<?> createBatch(@RequestBody List<Map<String, Object>> items) {
        List<Enrollment> created = new ArrayList<>();
        for (Map<String, Object> item : items) {
            Long studentId = toLong(item.getOrDefault("studentId", item.get("student_id")));
            Long courseId = toLong(item.getOrDefault("courseId", item.get("course_id")));
            String courseCode = toStr(item.getOrDefault("courseCode", item.get("course_code")));
            String courseName = toStr(item.getOrDefault("courseName", item.get("course_name")));
            String paperType = toStr(item.getOrDefault("paperType", item.getOrDefault("paper_type", "normal")));

            if (studentId == null) continue;

            // Resolve courseId from courseCode if courseId is not provided
            if (courseId == null && courseCode != null && !courseCode.isBlank()) {
                courseId = resolveCourseUnitId(courseCode, courseName);
            }

            if (courseId == null) continue;

            List<Enrollment> existing = enrollmentRepository.findByStudentIdAndCourseId(studentId, courseId);
            if (!existing.isEmpty()) continue;

            Enrollment enrollment = new Enrollment();
            enrollment.setStudentId(studentId);
            enrollment.setCourseId(courseId);
            enrollment.setPaperType(paperType);
            enrollment.setStatus("pending");
            enrollment.setEnrolledAt(LocalDateTime.now());
            created.add(enrollmentRepository.save(enrollment));

            notifyLecturersForCourse(courseId, studentId, "enrollment_request");
        }
        return ResponseEntity.ok(created);
    }

    @PostMapping("/batch/")
    public ResponseEntity<?> createBatchSlash(@RequestBody List<Map<String, Object>> items) {
        return createBatch(items);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return enrollmentRepository.findById(id).map(enrollment -> {
            String newStatus = String.valueOf(body.getOrDefault("status", enrollment.getStatus()));
            Long lecturerId = toLong(body.getOrDefault("lecturerId", body.get("lecturer_id")));

            enrollment.setStatus(newStatus);
            if (lecturerId != null) {
                enrollment.setLecturerId(lecturerId);
            }
            enrollmentRepository.save(enrollment);

            Student student = studentRepository.findById(enrollment.getStudentId()).orElse(null);
            String studentName = student != null ? student.getFullName() : "Student";
            String courseLabel = "course #" + enrollment.getCourseId();

            Notification notification = new Notification();
            notification.setUserId(enrollment.getStudentId());
            notification.setType("enrollment_" + newStatus);
            notification.setTitle("Enrollment " + newStatus);
            notification.setMessage("Your enrollment for " + courseLabel + " was " + newStatus + ".");
            notification.setLink("/enrollment");
            notification.setRelatedId(enrollment.getId());
            notificationRepository.save(notification);

            return ResponseEntity.ok(enrollment);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status/")
    public ResponseEntity<?> updateStatusSlash(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return updateStatus(id, body);
    }

    private void notifyLecturersForCourse(Long courseId, Long studentId, String type) {
        Student student = studentRepository.findById(studentId).orElse(null);
        String studentName = student != null ? student.getFullName() : "A student";

        List<Lecturer> allLecturers = lecturerRepository.findAll();
        for (Lecturer lecturer : allLecturers) {
            if (lecturer.getAssignedCourseUnits() != null && lecturer.getAssignedCourseUnits().contains(courseId)) {
                Notification notification = new Notification();
                notification.setUserId(lecturer.getId());
                notification.setType(type);
                notification.setTitle("New enrollment request");
                notification.setMessage(studentName + " wants to enroll in course #" + courseId);
                notification.setLink("/lecturer/enrollments");
                notification.setRelatedId(courseId);
                notificationRepository.save(notification);
            }
        }
    }

    private List<Enrollment> enrichEnrollments(List<Enrollment> enrollments) {
        return enrollments;
    }

    private List<Long> parseIds(String csv) {
        List<Long> ids = new ArrayList<>();
        for (String part : csv.split(",")) {
            try {
                ids.add(Long.parseLong(part.trim()));
            } catch (NumberFormatException ignored) {
            }
        }
        return ids;
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(val));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String toStr(Object val) {
        if (val == null) return null;
        String s = String.valueOf(val);
        return s.isBlank() || "null".equals(s) ? null : s;
    }

    private Long resolveCourseUnitId(String code, String name) {
        // Look up existing course unit by code
        var existing = courseUnitRepository.findByCode(code);
        if (existing.isPresent()) {
            return existing.get().getId();
        }

        // Auto-create course unit record if it doesn't exist
        CourseUnit unit = new CourseUnit();
        unit.setCode(code);
        unit.setName(name != null ? name : code);
        unit.setCredits(0);
        unit.setSemester("semester 1");
        unit.setYear("1");
        unit = courseUnitRepository.save(unit);
        return unit.getId();
    }
}
