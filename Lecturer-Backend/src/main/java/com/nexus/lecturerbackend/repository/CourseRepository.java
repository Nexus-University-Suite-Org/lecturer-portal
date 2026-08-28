package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {
}
