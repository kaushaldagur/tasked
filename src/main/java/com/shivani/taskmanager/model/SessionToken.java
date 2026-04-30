package com.shivani.taskmanager.model;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Data;

@Entity
@Table(name = "session_tokens")
@Data
public class SessionToken {

    @Id
    private String token;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    private User user;

    private Instant expiresAt;
}
