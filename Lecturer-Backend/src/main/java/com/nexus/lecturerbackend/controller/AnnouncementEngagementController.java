package com.nexus.lecturerbackend.controller;

import com.nexus.lecturerbackend.dto.CommentRequest;
import com.nexus.lecturerbackend.model.AnnouncementComment;
import com.nexus.lecturerbackend.model.AnnouncementLike;
import com.nexus.lecturerbackend.model.AnnouncementView;
import com.nexus.lecturerbackend.repository.AnnouncementCommentRepository;
import com.nexus.lecturerbackend.repository.AnnouncementLikeRepository;
import com.nexus.lecturerbackend.repository.AnnouncementViewRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/announcements/{announcementId}/engagement")
public class AnnouncementEngagementController {

    private final AnnouncementViewRepository viewRepository;
    private final AnnouncementLikeRepository likeRepository;
    private final AnnouncementCommentRepository commentRepository;

    public AnnouncementEngagementController(
            AnnouncementViewRepository viewRepository,
            AnnouncementLikeRepository likeRepository,
            AnnouncementCommentRepository commentRepository) {
        this.viewRepository = viewRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
    }

    @GetMapping
    public ResponseEntity<?> getEngagement(
            @PathVariable Long announcementId,
            @RequestParam(required = false) Long student_id,
            @RequestParam(required = false) String role) {

        Map<String, Object> result = new HashMap<>();
        result.put("views", viewRepository.countByAnnouncementId(announcementId));
        result.put("likes", likeRepository.countByAnnouncementId(announcementId));
        result.put("comments_count", commentRepository.countByAnnouncementId(announcementId));

        if (student_id != null) {
            result.put("has_liked", likeRepository.existsByAnnouncementIdAndStudentId(announcementId, student_id));
        } else {
            result.put("has_liked", false);
        }

        List<AnnouncementComment> comments;
        if ("lecturer".equals(role)) {
            comments = commentRepository.findByAnnouncementIdOrderByCreatedAtDesc(announcementId);
        } else if (student_id != null) {
            comments = commentRepository.findByAnnouncementIdAndStudentIdOrderByCreatedAtDesc(announcementId, student_id);
        } else {
            comments = List.of();
        }
        result.put("comments", comments);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/view")
    public ResponseEntity<?> recordView(
            @PathVariable Long announcementId,
            @RequestBody Map<String, Object> body) {
        Long studentId = toLong(body.get("student_id"));
        String studentName = toString(body.get("student_name"));

        if (studentId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "student_id required"));
        }

        if (!viewRepository.existsByAnnouncementIdAndStudentId(announcementId, studentId)) {
            AnnouncementView view = new AnnouncementView();
            view.setAnnouncementId(announcementId);
            view.setStudentId(studentId);
            view.setStudentName(studentName);
            viewRepository.save(view);
        }

        return ResponseEntity.ok(Map.of("ok", true, "views", viewRepository.countByAnnouncementId(announcementId)));
    }

    @PostMapping("/like")
    public ResponseEntity<?> toggleLike(
            @PathVariable Long announcementId,
            @RequestBody Map<String, Object> body) {
        Long studentId = toLong(body.get("student_id"));
        String studentName = toString(body.get("student_name"));

        if (studentId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "student_id required"));
        }

        boolean existed = likeRepository.existsByAnnouncementIdAndStudentId(announcementId, studentId);
        if (existed) {
            likeRepository.deleteByAnnouncementIdAndStudentId(announcementId, studentId);
        } else {
            AnnouncementLike like = new AnnouncementLike();
            like.setAnnouncementId(announcementId);
            like.setStudentId(studentId);
            like.setStudentName(studentName);
            likeRepository.save(like);
        }

        return ResponseEntity.ok(Map.of(
                "ok", true,
                "has_liked", !existed,
                "likes", likeRepository.countByAnnouncementId(announcementId)));
    }

    @PostMapping("/comment")
    public ResponseEntity<?> addComment(
            @PathVariable Long announcementId,
            @RequestBody CommentRequest req) {
        if (req.content() == null || req.content().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "content required"));
        }

        AnnouncementComment comment = new AnnouncementComment();
        comment.setAnnouncementId(announcementId);
        comment.setStudentId(req.studentId());
        comment.setStudentName(req.studentName());
        comment.setContent(req.content());
        commentRepository.save(comment);

        return ResponseEntity.ok(comment);
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(val.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String toString(Object val) {
        return val != null ? val.toString() : null;
    }
}
