package com.nexus.lecturerbackend.service;

import com.nexus.lecturerbackend.model.CourseUnit;
import com.nexus.lecturerbackend.repository.CourseUnitRepository;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CourseUnitResolver {

    public Long resolve(CourseUnitRepository repository, String rawName) {
        if (rawName == null) {
            return null;
        }
        String target = normalize(rawName);
        if (target.isEmpty()) {
            return null;
        }
        List<CourseUnit> units = repository.findAll();
        for (CourseUnit unit : units) {
            if (target.equals(normalize(unit.getCode()))
                    || target.equals(normalize(unit.getName()))) {
                return unit.getId();
            }
        }
        for (CourseUnit unit : units) {
            String code = normalize(unit.getCode());
            String name = normalize(unit.getName());
            if ((!code.isEmpty() && (code.contains(target) || target.contains(code)))
                    || (!name.isEmpty() && (name.contains(target) || target.contains(name)))) {
                return unit.getId();
            }
        }
        return null;
    }

    private String normalize(String value) {
        return value == null
                ? ""
                : value.toLowerCase().replaceAll("[^a-z0-9]", "");
    }
}