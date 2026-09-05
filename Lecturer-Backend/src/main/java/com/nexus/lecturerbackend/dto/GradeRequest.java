package com.nexus.lecturerbackend.dto;

public record GradeRequest(
        Long studentId,
        Long courseId,
        Long lecturerId,
        Double assignment1,
        Double assignment2,
        Double participation,
        Double courseworkExtra,
        Double midterm,
        Double finalExam,
        Double total,
        String grade,
        Double gp,
        String academicYear,
        String semester,
        String marksJson) {
}
