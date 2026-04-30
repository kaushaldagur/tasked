package com.shivani.taskmanager.dto;

import com.shivani.taskmanager.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {
    public record SignupRequest(
        @NotBlank @Size(max = 80) String name,
        @Email @NotBlank String email,
        @NotBlank @Size(min = 6, max = 80) String password,
        Role role
    ) {
    }

    public record LoginRequest(
        @Email @NotBlank String email,
        @NotBlank String password
    ) {
    }

    public record AuthResponse(String token, UserResponse user) {
    }

    public record UserResponse(Long id, String name, String email, Role role) {
    }
}
