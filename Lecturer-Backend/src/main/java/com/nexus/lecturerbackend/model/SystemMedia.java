package com.nexus.lecturerbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "system_media")
@Getter
@Setter
public class SystemMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 255)
    private String contentType;

    @Column(columnDefinition = "bytea")
    private byte[] data;

    @Column(length = 255)
    private String fileName;

    private Long ownerId;

    @Column(length = 50)
    private String ownerType;

    private Long size;
}
