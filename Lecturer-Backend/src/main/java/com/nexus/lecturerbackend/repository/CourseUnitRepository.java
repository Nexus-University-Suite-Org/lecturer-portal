package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.CourseUnit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseUnitRepository extends JpaRepository<CourseUnit, Long> {
}
