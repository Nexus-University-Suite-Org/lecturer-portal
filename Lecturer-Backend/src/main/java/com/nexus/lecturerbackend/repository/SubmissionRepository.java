package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.Submission;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByAssignmentIdIn(Collection<Long> assignmentIds);
    List<Submission> findByAssignmentId(Long assignmentId);
    List<Submission> findByStudentId(Long studentId);
    void deleteByStudentId(Long studentId);
}
