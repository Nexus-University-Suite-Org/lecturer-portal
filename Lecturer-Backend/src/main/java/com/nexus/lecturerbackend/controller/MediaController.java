package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.model.Lecturer;
import com.nexus.lecturerbackend.model.Profile;
import com.nexus.lecturerbackend.model.Student;
import com.nexus.lecturerbackend.model.SystemMedia;
import com.nexus.lecturerbackend.repository.LecturerRepository;
import com.nexus.lecturerbackend.repository.ProfileRepository;
import com.nexus.lecturerbackend.repository.StudentRepository;
import com.nexus.lecturerbackend.repository.SystemMediaRepository;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class MediaController {

    private final SystemMediaRepository mediaRepository;
    private final StudentRepository studentRepository;
    private final LecturerRepository lecturerRepository;
    private final ProfileRepository profileRepository;

    public MediaController(SystemMediaRepository mediaRepository,
                           StudentRepository studentRepository,
                           LecturerRepository lecturerRepository,
                           ProfileRepository profileRepository) {
        this.mediaRepository = mediaRepository;
        this.studentRepository = studentRepository;
        this.lecturerRepository = lecturerRepository;
        this.profileRepository = profileRepository;
    }

    @PostMapping("/avatars/upload")
    public ResponseEntity<?> upload(@RequestParam("ownerId") Long ownerId,
                                    @RequestParam("ownerType") String ownerType,
                                    @RequestPart("file") MultipartFile file) throws IOException {
        SystemMedia media = new SystemMedia();
        media.setFileName(file.getOriginalFilename());
        media.setContentType(file.getContentType());
        media.setSize(file.getSize());
        media.setOwnerId(ownerId);
        media.setOwnerType(ownerType);
        media.setData(file.getBytes());
        media = mediaRepository.save(media);

        String url = "/api/media/" + media.getId();
        applyAvatar(ownerId, ownerType, url);

        return ResponseEntity.ok(Map.of("id", media.getId(), "url", url));
    }

    @PostMapping("/attachments/upload")
    public ResponseEntity<?> uploadAttachment(@RequestPart("file") MultipartFile file) throws IOException {
        SystemMedia media = new SystemMedia();
        media.setFileName(file.getOriginalFilename());
        media.setContentType(file.getContentType());
        media.setSize(file.getSize());
        media.setOwnerId(0L);
        media.setOwnerType("attachment");
        media.setData(file.getBytes());
        media = mediaRepository.save(media);

        String url = "/api/media/" + media.getId();
        return ResponseEntity.ok(Map.of("id", media.getId(), "url", url));
    }

    @PostMapping("/attachments/base64")
    public ResponseEntity<?> uploadAttachmentBase64(@org.springframework.web.bind.annotation.RequestBody Base64AttachmentRequest body) {
        try {
            byte[] bytes = java.util.Base64.getDecoder().decode(body.data());

            SystemMedia media = new SystemMedia();
            media.setFileName(body.fileName());
            media.setContentType(body.contentType());
            media.setSize(body.size() != null ? body.size() : (long) bytes.length);
            media.setOwnerId(0L);
            media.setOwnerType("attachment");
            media.setData(bytes);
            media = mediaRepository.save(media);

            String url = "/api/media/" + media.getId();
            return ResponseEntity.ok(java.util.Map.of("id", media.getId(), "url", url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage() != null ? e.getMessage() : e.getClass().getName()));
        }
    }

    public record Base64AttachmentRequest(String fileName, String contentType, Long size, String data) {
    }

    @GetMapping("/media/{id}")
    public ResponseEntity<byte[]> serve(@PathVariable Long id) {
        SystemMedia media = mediaRepository.findById(id).orElseThrow(() -> new RuntimeException("Media not found"));
        String contentType = media.getContentType() == null ? "application/octet-stream" : media.getContentType();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(media.getSize()))
                .body(media.getData());
    }

    private void applyAvatar(Long ownerId, String ownerType, String url) {
        if ("student".equalsIgnoreCase(ownerType)) {
            studentRepository.findById(ownerId).ifPresent(s -> {
                s.setAvatarUrl(url);
                studentRepository.save(s);
            });
        } else if ("lecturer".equalsIgnoreCase(ownerType)) {
            lecturerRepository.findById(ownerId).ifPresent(l -> {
                l.setAvatarUrl(url);
                lecturerRepository.save(l);
            });
        } else {
            profileRepository.findById(ownerId).ifPresent(p -> {
                p.setAvatarUrl(url);
                profileRepository.save(p);
            });
        }
    }
}
