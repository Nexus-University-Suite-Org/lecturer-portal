package com.nexus.lecturerbackend.service;

import com.nexus.lecturerbackend.model.Announcement;
import com.nexus.lecturerbackend.model.Assignment;
import com.nexus.lecturerbackend.model.Course;
import com.nexus.lecturerbackend.model.CourseUnit;
import com.nexus.lecturerbackend.model.Enrollment;
import com.nexus.lecturerbackend.model.Lecturer;
import com.nexus.lecturerbackend.model.LiveSession;
import com.nexus.lecturerbackend.model.Message;
import com.nexus.lecturerbackend.model.Notification;
import com.nexus.lecturerbackend.model.Profile;
import com.nexus.lecturerbackend.model.Student;
import com.nexus.lecturerbackend.model.StudentGrade;
import com.nexus.lecturerbackend.model.Submission;
import com.nexus.lecturerbackend.repository.AnnouncementRepository;
import com.nexus.lecturerbackend.repository.AssignmentRepository;
import com.nexus.lecturerbackend.repository.CourseRepository;
import com.nexus.lecturerbackend.repository.CourseUnitRepository;
import com.nexus.lecturerbackend.repository.EnrollmentRepository;
import com.nexus.lecturerbackend.repository.LecturerRepository;
import com.nexus.lecturerbackend.repository.LiveSessionRepository;
import com.nexus.lecturerbackend.repository.MessageRepository;
import com.nexus.lecturerbackend.repository.NotificationRepository;
import com.nexus.lecturerbackend.repository.ProfileRepository;
import com.nexus.lecturerbackend.repository.StudentGradeRepository;
import com.nexus.lecturerbackend.repository.StudentRepository;
import com.nexus.lecturerbackend.repository.SubmissionRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final long LECTURER_ID = 101L;

    private final LecturerRepository lecturerRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final CourseUnitRepository courseUnitRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final AnnouncementRepository announcementRepository;
    private final LiveSessionRepository liveSessionRepository;
    private final MessageRepository messageRepository;
    private final NotificationRepository notificationRepository;
    private final ProfileRepository profileRepository;
    private final StudentGradeRepository gradeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public DataSeeder(LecturerRepository lecturerRepository,
                      StudentRepository studentRepository,
                      CourseRepository courseRepository,
                      CourseUnitRepository courseUnitRepository,
                      EnrollmentRepository enrollmentRepository,
                      AssignmentRepository assignmentRepository,
                      SubmissionRepository submissionRepository,
                      AnnouncementRepository announcementRepository,
                      LiveSessionRepository liveSessionRepository,
                      MessageRepository messageRepository,
                      NotificationRepository notificationRepository,
                      ProfileRepository profileRepository,
                      StudentGradeRepository gradeRepository,
                      PasswordEncoder passwordEncoder,
                      JdbcTemplate jdbcTemplate) {
        this.lecturerRepository = lecturerRepository;
        this.studentRepository = studentRepository;
        this.courseRepository = courseRepository;
        this.courseUnitRepository = courseUnitRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.announcementRepository = announcementRepository;
        this.liveSessionRepository = liveSessionRepository;
        this.messageRepository = messageRepository;
        this.notificationRepository = notificationRepository;
        this.profileRepository = profileRepository;
        this.gradeRepository = gradeRepository;
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

        // Give the lecturer a stable high id (101) that never collides with
        // student ids (1-5), and keep the entity id in sync for downstream seeds.
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

        Student[] students = {
                student("John Kamau", "john.kamau@student.nexus.edu", "21/U/1001", "2100712345", "BSc Computer Science"),
                student("Sarah Namutebi", "sarah.namutebi@student.nexus.edu", "21/U/1002", "2100712346", "BSc Computer Science"),
                student("Peter Okello", "peter.okello@student.nexus.edu", "21/U/1003", "2100712347", "BSc Computer Science"),
                student("Grace Achieng", "grace.achieng@student.nexus.edu", "21/U/1004", "2100712348", "BSc Information Technology"),
                student("David Mwangi", "david.mwangi@student.nexus.edu", "21/U/1005", "2100712349", "BSc Software Engineering"),
        };
        studentRepository.saveAll(List.of(students));

        profileRepository.saveAll(List.of(
                profile(lecturer.getFullName(), lecturer.getEmail(), "Computer Science", "Faculty of Science and Technology", "lecturer"),
                profile(students[0].getFullName(), students[0].getEmail(), "Computer Science", "Faculty of Science and Technology", "student"),
                profile(students[1].getFullName(), students[1].getEmail(), "Computer Science", "Faculty of Science and Technology", "student"),
                profile(students[2].getFullName(), students[2].getEmail(), "Computer Science", "Faculty of Science and Technology", "student"),
                profile(students[3].getFullName(), students[3].getEmail(), "Information Technology", "Faculty of Science and Technology", "student"),
                profile(students[4].getFullName(), students[4].getEmail(), "Software Engineering", "Faculty of Science and Technology", "student")
        ));

        enrollmentRepository.saveAll(List.of(
                enrollment(students[0].getId(), cs101.getId()),
                enrollment(students[0].getId(), cs303.getId()),
                enrollment(students[1].getId(), cs101.getId()),
                enrollment(students[1].getId(), cs303.getId()),
                enrollment(students[2].getId(), cs101.getId()),
                enrollment(students[3].getId(), cs202.getId()),
                enrollment(students[4].getId(), cs202.getId())
        ));

        assignmentRepository.saveAll(List.of(
                assignment(lecturer.getId(), cs101.getId(), "Introduction to Programming", "BIT1101", "Assignment 1", "Write a Java program that prints numbers 1-100.", LocalDateTime.now().plusDays(7), 20.0, "published"),
                assignment(lecturer.getId(), cs303.getId(), "Software Engineering", "BIT3301", "Project Milestone 1", "Submit your software requirements document.", LocalDateTime.now().plusDays(14), 30.0, "published")
        ));

        submissionRepository.saveAll(List.of(
                submission(students[0].getId(), 1L, "Submitted Main.java implementation.", "submitted", 18.0),
                submission(students[1].getId(), 1L, "Submitted implementation.", "submitted", 19.0),
                submission(students[4].getId(), 2L, "Submitted requirements document.", "graded", 28.0)
        ));

        announcementRepository.saveAll(List.of(
                announcement("Mid-semester break", "Classes will pause for the mid-semester break starting next Monday.", cs101.getId(), lecturer.getId(), "high"),
                announcement("Guest lecture this Friday", "A guest lecture on AI will be held on Friday at 10 AM in Hall B.", cs202.getId(), lecturer.getId(), "normal")
        ));

        liveSessionRepository.saveAll(List.of(
                session("Lecture: Exception Handling", cs101.getId(), "Introduction to Programming", LocalDateTime.now().plusDays(2), 60, "https://meet.google.com/abc-defg-hij"),
                session("Lab Session", cs202.getId(), "Data Structures & Algorithms", LocalDateTime.now().plusDays(4), 90, "https://meet.google.com/xyz-abc-def")
        ));

        messageRepository.saveAll(List.of(
                message(lecturer.getId(), students[0].getId(), "Assignment feedback", "Great work on Assignment 1, John."),
                message(students[1].getId(), lecturer.getId(), "Question about course", "Hi Dr. Alvin, could we go over hash tables in class?")
        ));

        notificationRepository.saveAll(List.of(
                notification(lecturer.getId(), "info", "New submission", "John Kamau submitted Assignment 1", 1L),
                notification(lecturer.getId(), "info", "Announcement", "Your announcement was posted", 2L)
        ));

        gradeRepository.saveAll(List.of(
                grade(students[0].getId(), cs101.getId(), lecturer.getId(), 18.0, 19.0, 10.0, 22.0, 20.0, 85.0, "A", 4.0),
                grade(students[1].getId(), cs101.getId(), lecturer.getId(), 17.0, 18.0, 9.0, 20.0, 18.0, 78.0, "B+", 3.3),
                grade(students[2].getId(), cs101.getId(), lecturer.getId(), 15.0, 16.0, 8.0, 18.0, 15.0, 70.0, "B", 3.0)
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

    private Student student(String name, String email, String stuNo, String regNo, String programme) {
        Student s = new Student();
        s.setFullName(name);
        s.setEmail(email);
        s.setPhone("+256770000000");
        s.setStudentNumber(stuNo);
        s.setRegistrationNumber(regNo);
        s.setProgramme(programme);
        return s;
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

    private Enrollment enrollment(Long studentId, Long courseId) {
        Enrollment e = new Enrollment();
        e.setStudentId(studentId);
        e.setCourseId(courseId);
        e.setStatus("approved");
        return e;
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

    private Submission submission(Long studentId, Long assignmentId, String content, String status, double score) {
        Submission s = new Submission();
        s.setStudentId(studentId);
        s.setAssignmentId(assignmentId);
        s.setContent(content);
        s.setStatus(status);
        s.setSubmittedAt(LocalDateTime.now().minusDays(1));
        s.setScore(score);
        return s;
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

    private Message message(Long from, Long to, String subject, String body) {
        Message m = new Message();
        m.setFromUserId(from);
        m.setToUserId(to);
        m.setSubject(subject);
        m.setBody(body);
        return m;
    }

    private Notification notification(Long userId, String type, String title, String message, Long relatedId) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setRelatedId(relatedId);
        return n;
    }

    private StudentGrade grade(Long studentId, Long courseId, Long lecturerId, double a1, double a2, double part, double mid, double fin, double total, String grade, double gp) {
        StudentGrade g = new StudentGrade();
        g.setStudentId(studentId);
        g.setCourseId(courseId);
        g.setLecturerId(lecturerId);
        g.setAssignment1(a1);
        g.setAssignment2(a2);
        g.setParticipation(part);
        g.setMidterm(mid);
        g.setFinalExam(fin);
        g.setTotal(total);
        g.setGrade(grade);
        g.setGp(gp);
        return g;
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
