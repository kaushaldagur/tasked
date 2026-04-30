package com.shivani.taskmanager.service;

import com.shivani.taskmanager.model.Role;
import com.shivani.taskmanager.model.SessionToken;
import com.shivani.taskmanager.model.User;
import com.shivani.taskmanager.repository.SessionTokenRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final SessionTokenRepository sessionTokenRepository;

    public AuthService(SessionTokenRepository sessionTokenRepository) {
        this.sessionTokenRepository = sessionTokenRepository;
    }

    public String createSession(User user) {
        SessionToken sessionToken = new SessionToken();
        sessionToken.setToken(UUID.randomUUID().toString());
        sessionToken.setUser(user);
        sessionToken.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        sessionTokenRepository.save(sessionToken);
        return sessionToken.getToken();
    }

    public User requireUser(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token");
        }
        String token = header.substring("Bearer ".length()).trim();
        return sessionTokenRepository.findByTokenAndExpiresAtAfter(token, Instant.now())
            .map(SessionToken::getUser)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token"));
    }

    public User requireAdmin(HttpServletRequest request) {
        User user = requireUser(request);
        if (user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        return user;
    }
}
