package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.Enrollment;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    List<Enrollment> findByCourseIdIn(Collection<Long> courseIds);
    List<Enrollment> findByCourseId(Long courseId);
}
