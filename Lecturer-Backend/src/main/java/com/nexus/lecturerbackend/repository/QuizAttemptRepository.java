package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.QuizAttempt;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findByQuizIdOrderByIdAsc(Long quizId);
}
