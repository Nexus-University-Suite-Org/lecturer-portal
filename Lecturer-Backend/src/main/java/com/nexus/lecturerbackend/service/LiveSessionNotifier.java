package com.nexus.lecturerbackend.service;

import com.nexus.lecturerbackend.model.Enrollment;
import com.nexus.lecturerbackend.model.LiveSession;
import com.nexus.lecturerbackend.model.Notification;
import com.nexus.lecturerbackend.repository.CourseUnitRepository;
import com.nexus.lecturerbackend.repository.EnrollmentRepository;
import com.nexus.lecturerbackend.repository.LiveSessionRepository;
import com.nexus.lecturerbackend.repository.NotificationRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class LiveSessionNotifier {

    private final LiveSessionRepository sessionRepository;
    private final CourseUnitRepository courseUnitRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final NotificationRepository notificationRepository;
    private final CourseUnitResolver courseUnitResolver;

    public LiveSessionNotifier(LiveSessionRepository sessionRepository,
                              CourseUnitRepository courseUnitRepository,
                              EnrollmentRepository enrollmentRepository,
                              NotificationRepository notificationRepository,
                              CourseUnitResolver courseUnitResolver) {
        this.sessionRepository = sessionRepository;
        this.courseUnitRepository = courseUnitRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.notificationRepository = notificationRepository;
        this.courseUnitResolver = courseUnitResolver;
    }

    @Scheduled(fixedDelay = 30000)
    public void notifyStartedSessions() {
        LocalDateTime now = LocalDateTime.now();
        for (LiveSession session : sessionRepository.findAll()) {
            if (Boolean.TRUE.equals(session.getNotifyStarted())) {
                continue;
            }
            String status = session.getStatus() == null ? "" : session.getStatus().trim().toLowerCase();
            if ("cancelled".equals(status)) {
                session.setNotifyStarted(true);
                sessionRepository.save(session);
                continue;
            }
            if (session.getScheduledAt() == null) {
                continue;
            }
            int duration = session.getDurationMinutes() == null ? 60 : session.getDurationMinutes();
            LocalDateTime end = session.getScheduledAt().plusMinutes(duration);
            if (now.isBefore(session.getScheduledAt())) {
                continue;
            }
            Long courseUnitId = session.getCourseUnitId();
            if (courseUnitId == null) {
                courseUnitId = courseUnitResolver.resolve(courseUnitRepository, session.getCourseName());
            }
            session.setNotifyStarted(true);
            sessionRepository.save(session);
            if (now.isAfter(end) || courseUnitId == null) {
                continue;
            }
            notifyEnrolledStudents(session, courseUnitId);
        }
    }

    private void notifyEnrolledStudents(LiveSession session, Long courseUnitId) {
        String courseLabel = session.getCourseName() != null ? session.getCourseName() : "your course unit";
        for (Enrollment enrollment : enrollmentRepository.findByCourseId(courseUnitId)) {
            String status = enrollment.getStatus() == null ? "" : enrollment.getStatus().trim().toLowerCase();
            if (!"approved".equals(status)
                    && !"accepted".equals(status)
                    && !"active".equals(status)) {
                continue;
            }
            Notification notification = new Notification();
            notification.setUserId(enrollment.getStudentId());
            notification.setType("live_session_started");
            notification.setTitle("Live class has started");
            notification.setMessage("\"" + session.getTitle() + "\" (" + courseLabel + ") has started. Join the Google Meet now.");
            notification.setLink(session.getMeetLink());
            notification.setRelatedId(session.getId());
            notificationRepository.save(notification);
        }
    }
}