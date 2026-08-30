package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.StudentGrade;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudentGradeRepository extends JpaRepository<StudentGrade, Long> {
    List<StudentGrade> findByCourseId(Long courseId);
    List<StudentGrade> findByStudentIdAndCourseId(Long studentId, Long courseId);
    List<StudentGrade> findByStudentId(Long studentId);
}
