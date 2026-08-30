package com.nexus.lecturerbackend.dto;

import java.util.List;

public record QuizRequest(
        Long id,
        String title,
        String description,
        Long courseId,
        String courseTitle,
        String courseCode,
        Long lecturerId,
        Integer totalQuestions,
        Double totalPoints,
        Integer timeLimit,
        Double passingScore,
        String startDate,
        String endDate,
        String status,
        Integer attemptsAllowed,
        Boolean shuffleQuestions,
        Boolean showAnswers,
        Boolean autoDeactivate,
        String semester,
        String academicYear,
        Integer yearOfStudy,
        List<QuestionRequest> questions) {

    public record QuestionRequest(
            Long id,
            String question,
            String questionText,
            String type,
            String questionType,
            List<String> options,
            String correctAnswer,
            Double points,
            String explanation,
            String difficulty,
            Double confidence,
            String originalText) {
    }
}
