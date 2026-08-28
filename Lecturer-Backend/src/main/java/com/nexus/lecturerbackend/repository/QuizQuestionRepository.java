package com.nexus.lecturerbackend.repository;

import com.nexus.lecturerbackend.model.QuizQuestion;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
    List<QuizQuestion> findByQuizIdOrderByIdAsc(Long quizId);
    void deleteByQuizId(Long quizId);
}
