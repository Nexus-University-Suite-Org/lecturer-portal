package com.nexus.lecturerbackend.service;

import com.nexus.lecturerbackend.dto.DirectoryEntry;
import com.nexus.lecturerbackend.dto.Participant;
import com.nexus.lecturerbackend.model.Lecturer;
import com.nexus.lecturerbackend.model.Profile;
import com.nexus.lecturerbackend.model.Student;
import com.nexus.lecturerbackend.repository.LecturerRepository;
import com.nexus.lecturerbackend.repository.ProfileRepository;
import com.nexus.lecturerbackend.repository.StudentRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class ParticipantService {

    private final StudentRepository studentRepository;
    private final LecturerRepository lecturerRepository;
    private final ProfileRepository profileRepository;

    public ParticipantService(StudentRepository studentRepository,
                              LecturerRepository lecturerRepository,
                              ProfileRepository profileRepository) {
        this.studentRepository = studentRepository;
        this.lecturerRepository = lecturerRepository;
        this.profileRepository = profileRepository;
    }

    public Optional<Participant> resolve(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return studentRepository.findById(userId)
                .map(s -> toParticipant(String.valueOf(s.getId()), s.getFullName(), s.getEmail(), s.getAvatarUrl(), "student"))
                .or(() -> lecturerRepository.findById(userId)
                        .map(l -> toParticipant(String.valueOf(l.getId()), l.getFullName(), l.getEmail(), l.getAvatarUrl(), "lecturer")))
                .or(() -> profileRepository.findById(userId)
                        .map(p -> toParticipant(String.valueOf(p.getId()), p.getFullName(), p.getEmail(), p.getAvatarUrl(), p.getRole())));
    }

    public Participant toParticipant(String id, String fullName, String email, String avatarUrl, String role) {
        return new Participant(
                id,
                fullName == null ? id : fullName,
                email == null ? "" : email,
                avatarUrl,
                role == null ? "user" : role);
    }

    public List<DirectoryEntry> directory() {
        List<DirectoryEntry> entries = new ArrayList<>();

        List<Student> students = studentRepository.findAll();
        for (Student s : students) {
            entries.add(new DirectoryEntry(
                    String.valueOf(s.getId()),
                    s.getFullName(),
                    s.getEmail(),
                    "student",
                    s.getProgramme(),
                    null,
                    s.getAvatarUrl()));
        }

        List<Lecturer> lecturers = lecturerRepository.findAll();
        for (Lecturer l : lecturers) {
            entries.add(new DirectoryEntry(
                    String.valueOf(l.getId()),
                    l.getFullName(),
                    l.getEmail(),
                    "lecturer",
                    null,
                    l.getDepartment(),
                    l.getAvatarUrl()));
        }

        return entries;
    }

    public ParticipantProfile lookup(String userUid) {
        ParticipantProfile p = new ParticipantProfile();
        p.setId(userUid);
        p.setFullName(userUid);
        p.setEmail("");
        p.setAvatarUrl(null);
        try {
            Long id = Long.parseLong(userUid);
            Optional<Participant> resolved = resolve(id);
            if (resolved.isPresent()) {
                Participant r = resolved.get();
                p.setId(r.id());
                p.setFullName(r.fullName());
                p.setEmail(r.email());
                p.setAvatarUrl(r.avatarUrl());
                p.setRole(r.role());
            }
        } catch (NumberFormatException ignored) {
        }
        return p;
    }

    public static class ParticipantProfile {
        private String id;
        private String fullName;
        private String email;
        private String avatarUrl;
        private String role;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }
}
