package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentRepository extends JpaRepository<Student, Long> {
}
