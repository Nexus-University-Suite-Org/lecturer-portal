package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.Quiz;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
    List<Quiz> findByLecturerIdOrderByIdDesc(Long lecturerId);
}
