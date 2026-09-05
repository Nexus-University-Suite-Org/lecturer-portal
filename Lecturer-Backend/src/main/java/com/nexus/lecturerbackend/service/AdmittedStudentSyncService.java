package com.nexus.lecturerbackend.service;

import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import com.nexus.lecturerbackend.model.Profile;
import com.nexus.lecturerbackend.model.Student;
import com.nexus.lecturerbackend.repository.EnrollmentRepository;
import com.nexus.lecturerbackend.repository.MessageDraftRepository;
import com.nexus.lecturerbackend.repository.MessageRepository;
import com.nexus.lecturerbackend.repository.NotificationRepository;
import com.nexus.lecturerbackend.repository.ProfileRepository;
import com.nexus.lecturerbackend.repository.StudentGradeRepository;
import com.nexus.lecturerbackend.repository.StudentRepository;
import com.nexus.lecturerbackend.repository.SubmissionRepository;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@Order(2)
public class AdmittedStudentSyncService implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdmittedStudentSyncService.class);

    private static final String ADMITTED_STATUS = "ADMITTED";
    private static final List<String> DEMO_STUDENT_EMAILS = List.of(
            "john.kamau@student.nexus.edu",
            "sarah.namutebi@student.nexus.edu",
            "peter.okello@student.nexus.edu",
            "grace.achieng@student.nexus.edu",
            "david.mwangi@student.nexus.edu");

    private final StudentRepository studentRepository;
    private final ProfileRepository profileRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SubmissionRepository submissionRepository;
    private final StudentGradeRepository gradeRepository;
    private final MessageRepository messageRepository;
    private final MessageDraftRepository messageDraftRepository;
    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;
    private final HttpClient httpClient;
    private final String baseUrl;
    private final String adminEmail;
    private final String adminPassword;

    public AdmittedStudentSyncService(StudentRepository studentRepository,
                                      ProfileRepository profileRepository,
                                      EnrollmentRepository enrollmentRepository,
                                      SubmissionRepository submissionRepository,
                                      StudentGradeRepository gradeRepository,
                                      MessageRepository messageRepository,
                                      MessageDraftRepository messageDraftRepository,
                                      NotificationRepository notificationRepository,
                                      PlatformTransactionManager transactionManager,
                                      @Value("${nad.base-url:http://localhost:8083}") String baseUrl,
                                      @Value("${nad.admin-email:admin@nexus.edu}") String adminEmail,
                                      @Value("${nad.admin-password:admin123}") String adminPassword) {
        this.studentRepository = studentRepository;
        this.profileRepository = profileRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.submissionRepository = submissionRepository;
        this.gradeRepository = gradeRepository;
        this.messageRepository = messageRepository;
        this.messageDraftRepository = messageDraftRepository;
        this.notificationRepository = notificationRepository;
        this.objectMapper = JsonMapper.builder()
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.baseUrl = baseUrl;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        sync();
    }

    public SyncResult sync() {
        try {
            String token = login();
            List<AdmittedApplication> admissions = fetchAdmittedApplications(token);
            List<AdmittedApplication> admitted = admissions.stream()
                    .filter(a -> ADMITTED_STATUS.equalsIgnoreCase(a.status()))
                    .toList();
            ImportResult imported = transactionTemplate.execute(status -> writeStudents(admitted));
            log.info("NAD student sync completed: {} admitted, {} created, {} updated",
                    admitted.size(), imported.created(), imported.updated());
            return new SyncResult(true, imported.created(), imported.updated(), admitted.size(), null);
        } catch (Exception e) {
            log.warn("NAD admitted-student sync failed ({}); retaining existing student data", e.getMessage());
            return new SyncResult(false, 0, 0, 0, e.getMessage());
        }
    }

    private String login() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/v1/admin/auth/login"))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        objectMapper.writeValueAsString(Map.of("email", adminEmail, "password", adminPassword))))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IOException("NAD login failed with HTTP " + response.statusCode());
        }
        LoginResponse login = objectMapper.readValue(response.body(), LoginResponse.class);
        if (login.token() == null || login.token().isBlank()) {
            throw new IOException("NAD login returned no token");
        }
        return login.token();
    }

    private List<AdmittedApplication> fetchAdmittedApplications(String token) throws IOException, InterruptedException {
        List<AdmittedApplication> all = new ArrayList<>();
        int page = 0;
        int totalPages = 1;
        while (page < totalPages) {
            String url = baseUrl + "/api/v1/admin/applications?status=" + ADMITTED_STATUS + "&page=" + page + "&size=100";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new IOException("NAD applications request failed with HTTP " + response.statusCode());
            }
            ApplicationsPage apps = objectMapper.readValue(response.body(), ApplicationsPage.class);
            if (apps.content() != null) {
                all.addAll(apps.content());
            }
            totalPages = apps.totalPages();
            page++;
        }
        return all;
    }

    private ImportResult writeStudents(List<AdmittedApplication> admitted) {
        removeDemoStudents();
        int created = 0;
        int updated = 0;
        for (AdmittedApplication app : admitted) {
            if (upsertStudent(app)) {
                created++;
            } else {
                updated++;
            }
        }
        return new ImportResult(created, updated);
    }

    private void removeDemoStudents() {
        for (String email : DEMO_STUDENT_EMAILS) {
            studentRepository.findByEmailIgnoreCase(email).ifPresent(student -> {
                enrollmentRepository.deleteByStudentId(student.getId());
                submissionRepository.deleteByStudentId(student.getId());
                gradeRepository.deleteByStudentId(student.getId());
                messageRepository.deleteByFromUserIdOrToUserId(student.getId(), student.getId());
                messageDraftRepository.deleteByUserIdOrToUserId(student.getId(), student.getId());
                notificationRepository.deleteByUserId(student.getId());
                studentRepository.delete(student);
            });
            profileRepository.findByEmailIgnoreCase(email).forEach(profileRepository::delete);
        }
    }

    private boolean upsertStudent(AdmittedApplication app) {
        String email = app.email();
        if (email == null || email.isBlank()) {
            return false;
        }

        Optional<Student> existing = studentRepository.findByEmailIgnoreCase(email);
        Student student = existing.orElseGet(Student::new);
        student.setFullName(fullName(app));
        student.setEmail(email);
        student.setPhone(app.phoneNumber());
        student.setStudentNumber(app.studentNumber() != null && !app.studentNumber().isBlank() ? app.studentNumber() : app.prn());
        student.setRegistrationNumber(app.registrationNumber());
        student.setProgramme(app.assignedProgramme() != null && !app.assignedProgramme().isBlank()
                ? app.assignedProgramme()
                : app.programChoice1());
        student.setAvatarUrl(app.passportPhotoUrl());
        student.setStatus("active");
        studentRepository.save(student);

        List<Profile> profiles = profileRepository.findByEmailIgnoreCase(email);
        Profile profile = profiles.isEmpty() ? new Profile() : profiles.get(0);
        profile.setFullName(student.getFullName());
        profile.setEmail(email);
        profile.setDepartment(student.getProgramme());
        profile.setCollege("Faculty of Science and Technology");
        profile.setProgramme(student.getProgramme());
        profile.setStudentNumber(student.getStudentNumber());
        profile.setRegistrationNumber(student.getRegistrationNumber());
        profile.setPhone(student.getPhone());
        profile.setAvatarUrl(student.getAvatarUrl());
        profile.setRole("student");
        profileRepository.save(profile);

        return existing.isEmpty();
    }

    private String fullName(AdmittedApplication app) {
        List<String> parts = new ArrayList<>();
        appendUnique(parts, app.firstName());
        appendUnique(parts, app.otherNames());
        appendUnique(parts, app.lastName());
        return String.join(" ", parts);
    }

    private void appendUnique(List<String> parts, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        String trimmed = value.trim();
        for (String existing : parts) {
            if (existing.equalsIgnoreCase(trimmed)) {
                return;
            }
        }
        parts.add(trimmed);
    }

    public record SyncResult(boolean success, int created, int updated, int totalAdmitted, String message) {}

    private record LoginResponse(String token, String email, String fullName) {}

    private record ApplicationsPage(List<AdmittedApplication> content, int page, int size, long totalElements, int totalPages) {}

    private record AdmittedApplication(Long id, String prn, String registrationNumber, String studentNumber,
                                       String firstName, String lastName, String otherNames, String email,
                                       String phoneNumber, String gender, String programChoice1,
                                       String assignedProgramme, String passportPhotoUrl, String status) {}

    private record ImportResult(int created, int updated) {}
}