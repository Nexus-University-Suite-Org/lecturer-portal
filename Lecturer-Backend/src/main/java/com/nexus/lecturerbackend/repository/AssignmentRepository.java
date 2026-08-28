package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.Assignment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByLecturerIdOrderByIdDesc(Long lecturerId);
}
