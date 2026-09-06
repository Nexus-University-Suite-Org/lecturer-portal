package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.QuizAttempt;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findByQuizIdOrderByIdAsc(Long quizId);
    List<QuizAttempt> findByQuizIdAndStudentIdOrderByIdDesc(Long quizId, Long studentId);
    Optional<QuizAttempt> findFirstByQuizIdAndStudentIdOrderByIdDesc(Long quizId, Long studentId);
    long countByQuizId(Long quizId);
    void deleteByQuizId(Long quizId);
}
