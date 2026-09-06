package com.nexus.lecturerbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LecturerBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(LecturerBackendApplication.class, args);
    }
}
