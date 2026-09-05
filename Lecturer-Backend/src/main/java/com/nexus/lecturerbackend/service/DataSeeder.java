package com.nexus.lecturerbackend.service;

import com.nexus.lecturerbackend.model.Announcement;
import com.nexus.lecturerbackend.model.Assignment;
import com.nexus.lecturerbackend.model.Course;
import com.nexus.lecturerbackend.model.CourseUnit;
import com.nexus.lecturerbackend.model.Lecturer;
import com.nexus.lecturerbackend.model.LiveSession;
import com.nexus.lecturerbackend.model.Profile;
import com.nexus.lecturerbackend.repository.AnnouncementRepository;
import com.nexus.lecturerbackend.repository.AssignmentRepository;
import com.nexus.lecturerbackend.repository.CourseRepository;
import com.nexus.lecturerbackend.repository.CourseUnitRepository;
import com.nexus.lecturerbackend.repository.LecturerRepository;
import com.nexus.lecturerbackend.repository.LiveSessionRepository;
import com.nexus.lecturerbackend.repository.ProfileRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class DataSeeder implements CommandLineRunner {

    private static final long LECTURER_ID = 101L;

    private final LecturerRepository lecturerRepository;
    private final CourseRepository courseRepository;
    private final CourseUnitRepository courseUnitRepository;
    private final AssignmentRepository assignmentRepository;
    private final AnnouncementRepository announcementRepository;
    private final LiveSessionRepository liveSessionRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public DataSeeder(LecturerRepository lecturerRepository,
                      CourseRepository courseRepository,
                      CourseUnitRepository courseUnitRepository,
                      AssignmentRepository assignmentRepository,
                      AnnouncementRepository announcementRepository,
                      LiveSessionRepository liveSessionRepository,
                      ProfileRepository profileRepository,
                      PasswordEncoder passwordEncoder,
                      JdbcTemplate jdbcTemplate) {
        this.lecturerRepository = lecturerRepository;
        this.courseRepository = courseRepository;
        this.courseUnitRepository = courseUnitRepository;
        this.assignmentRepository = assignmentRepository;
        this.announcementRepository = announcementRepository;
        this.liveSessionRepository = liveSessionRepository;
        this.profileRepository = profileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        if (lecturerRepository.count() > 0) {
            return;
        }

        Lecturer lecturer = new Lecturer();
        lecturer.setFullName("Dr. Alvin David");
        lecturer.setEmail("lecturer@nexus.edu");
        lecturer.setPasswordHash(passwordEncoder.encode("Lecturer@123"));
        lecturer.setDepartment("Computer Science");
        lecturer.setCollege("Faculty of Science and Technology");
        lecturer.setSpecialization("Software Engineering");
        lecturer.setOfficeLocation("Block B, Room 204");
        lecturer.setOfficeHours("Mon-Fri 9:00 - 16:00");
        lecturer.setOfficePhone("+256700111222");
        lecturer.setPhoneNumber("+256700111222");
        lecturer.setBio("Senior Lecturer in Software Engineering.");
        lecturer.setRole("lecturer");
        lecturer.setAssignedCourseUnits(List.of(1L, 2L, 3L));
        lecturer = lecturerRepository.save(lecturer);

        // Give the lecturer a stable high id (101) and keep the entity id in
        // sync for downstream seeds.
        renumberLecturer(lecturer.getId());
        if (lecturer.getId() != null) {
            lecturer.setId(LECTURER_ID);
        }

        Course cs101 = course("BIT1101", "Introduction to Programming", "Semester 1", "2026", 3);
        Course cs202 = course("BIT2203", "Data Structures & Algorithms", "Semester 2", "2026", 4);
        Course cs303 = course("BIT3301", "Software Engineering", "Semester 1", "2026", 3);
        Course math1 = course("MAT1101", "Discrete Mathematics", "Semester 1", "2026", 3);
        courseRepository.saveAll(List.of(cs101, cs202, cs303, math1));

        CourseUnit u1 = unit("BIT1101", "Introduction to Programming", 3, "Semester 1", "2026");
        CourseUnit u2 = unit("BIT2203", "Data Structures & Algorithms", 4, "Semester 2", "2026");
        CourseUnit u3 = unit("BIT3301", "Software Engineering", 3, "Semester 1", "2026");
        courseUnitRepository.saveAll(List.of(u1, u2, u3));

        profileRepository.save(profile(lecturer.getFullName(), lecturer.getEmail(), "Computer Science", "Faculty of Science and Technology", "lecturer"));

        assignmentRepository.saveAll(List.of(
                assignment(lecturer.getId(), cs101.getId(), "Introduction to Programming", "BIT1101", "Assignment 1", "Write a Java program that prints numbers 1-100.", LocalDateTime.now().plusDays(7), 20.0, "published"),
                assignment(lecturer.getId(), cs303.getId(), "Software Engineering", "BIT3301", "Project Milestone 1", "Submit your software requirements document.", LocalDateTime.now().plusDays(14), 30.0, "published")
        ));

        announcementRepository.saveAll(List.of(
                announcement("Mid-semester break", "Classes will pause for the mid-semester break starting next Monday.", cs101.getId(), lecturer.getId(), "high"),
                announcement("Guest lecture this Friday", "A guest lecture on AI will be held on Friday at 10 AM in Hall B.", cs202.getId(), lecturer.getId(), "normal")
        ));

        liveSessionRepository.saveAll(List.of(
                session("Lecture: Exception Handling", cs101.getId(), "Introduction to Programming", LocalDateTime.now().plusDays(2), 60, "https://meet.google.com/abc-defg-hij"),
                session("Lab Session", cs202.getId(), "Data Structures & Algorithms", LocalDateTime.now().plusDays(4), 90, "https://meet.google.com/xyz-abc-def")
        ));
    }

    private Course course(String code, String title, String sem, String year, int credits) {
        Course c = new Course();
        c.setCode(code);
        c.setTitle(title);
        c.setSemester(sem);
        c.setYear(year);
        c.setCredits(credits);
        return c;
    }

    private CourseUnit unit(String code, String name, int credits, String sem, String year) {
        CourseUnit u = new CourseUnit();
        u.setCode(code);
        u.setName(name);
        u.setCredits(credits);
        u.setSemester(sem);
        u.setYear(year);
        u.setCourseUnitCode(code);
        u.setCourseUnitName(name);
        return u;
    }

    private Profile profile(String name, String email, String dept, String college, String role) {
        Profile p = new Profile();
        p.setFullName(name);
        p.setEmail(email);
        p.setDepartment(dept);
        p.setCollege(college);
        p.setRole(role);
        return p;
    }

    private Assignment assignment(Long lecId, Long courseId, String ct, String cc, String title, String desc, LocalDateTime due, double pts, String status) {
        Assignment a = new Assignment();
        a.setLecturerId(lecId);
        a.setCourseId(courseId);
        a.setCourseTitle(ct);
        a.setCourseCode(cc);
        a.setTitle(title);
        a.setDescription(desc);
        a.setDueDate(due);
        a.setTotalPoints(pts);
        a.setStatus(status);
        return a;
    }

    private Announcement announcement(String title, String content, Long courseId, Long authorId, String priority) {
        Announcement a = new Announcement();
        a.setTitle(title);
        a.setContent(content);
        a.setCourseId(courseId);
        a.setAuthorId(authorId);
        a.setPriority(priority);
        return a;
    }

    private LiveSession session(String title, Long courseId, String courseName, LocalDateTime at, int dur, String link) {
        LiveSession s = new LiveSession();
        s.setTitle(title);
        s.setCourseId(courseId);
        s.setCourseName(courseName);
        s.setScheduledAt(at);
        s.setDurationMinutes(dur);
        s.setMeetLink(link);
        s.setAttendees(12);
        return s;
    }

    private void renumberLecturer(Long oldId) {
        if (oldId == null || oldId == LECTURER_ID) {
            return;
        }
        try {
            List<String> fks = jdbcTemplate.query(
                    "SELECT conname FROM pg_constraint WHERE conrelid = 'lecturer_assigned_course_units'::regclass AND contype = 'f' AND confrelid = 'lecturers'::regclass",
                    (rs, rowNum) -> rs.getString(1));
            for (String fk : fks) {
                jdbcTemplate.execute("ALTER TABLE lecturer_assigned_course_units DROP CONSTRAINT \"" + fk + "\"");
            }
            jdbcTemplate.update("UPDATE lecturer_assigned_course_units SET lecturer_id = ? WHERE lecturer_id = ?", LECTURER_ID, oldId);
            jdbcTemplate.update("UPDATE notifications SET user_id = ? WHERE user_id = ?", LECTURER_ID, oldId);
            jdbcTemplate.update("UPDATE assignments SET lecturer_id = ? WHERE lecturer_id = ?", LECTURER_ID, oldId);
            jdbcTemplate.update("UPDATE announcements SET author_id = ? WHERE author_id = ?", LECTURER_ID, oldId);
            jdbcTemplate.update("UPDATE student_grades SET lecturer_id = ? WHERE lecturer_id = ?", LECTURER_ID, oldId);
            jdbcTemplate.update("UPDATE lecturers SET id = ? WHERE id = ?", LECTURER_ID, oldId);
            jdbcTemplate.update("ALTER TABLE lecturers ALTER COLUMN id RESTART WITH 102");
            for (String fk : fks) {
                jdbcTemplate.execute("ALTER TABLE lecturer_assigned_course_units ADD CONSTRAINT \"" + fk + "\" FOREIGN KEY (lecturer_id) REFERENCES lecturers(id)");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
