package com.shivani.taskmanager.config;

import com.shivani.taskmanager.model.Role;
import com.shivani.taskmanager.model.User;
import com.shivani.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminName;
    private final String adminEmail;
    private final String adminPassword;
    private final boolean resetAdminPasswordOnStartup;

    public DataInitializer(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        @Value("${app.admin.name:}") String adminName,
        @Value("${app.admin.email:}") String adminEmail,
        @Value("${app.admin.password:}") String adminPassword,
        @Value("${app.admin.reset-password-on-startup:false}") boolean resetAdminPasswordOnStartup
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminName = adminName;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.resetAdminPasswordOnStartup = resetAdminPasswordOnStartup;
    }

    @Override
    public void run(String... args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.info("Admin bootstrap skipped (DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD not set)");
            return;
        }
        log.info(
            "Admin bootstrap enabled for email='{}' (resetPasswordOnStartup={})",
            adminEmail.trim().toLowerCase(),
            resetAdminPasswordOnStartup
        );
        userRepository.findByEmailIgnoreCase(adminEmail).ifPresentOrElse(existingAdmin -> {
            boolean changed = false;
            if (existingAdmin.getRole() != Role.ADMIN) {
                existingAdmin.setRole(Role.ADMIN);
                changed = true;
            }
            if (resetAdminPasswordOnStartup) {
                existingAdmin.setPasswordHash(passwordEncoder.encode(adminPassword));
                changed = true;
            }
            if (adminName != null && !adminName.isBlank() && !adminName.trim().equals(existingAdmin.getName())) {
                existingAdmin.setName(adminName.trim());
                changed = true;
            }
            if (changed) {
                userRepository.save(existingAdmin);
                log.info("Admin user updated in DB (email='{}')", existingAdmin.getEmail());
            } else {
                log.info("Admin user already up-to-date (email='{}')", existingAdmin.getEmail());
            }
        }, () -> {
            User admin = new User();
            admin.setName(adminName == null || adminName.isBlank() ? "Project Admin" : adminName);
            admin.setEmail(adminEmail.toLowerCase());
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setRole(Role.ADMIN);
            userRepository.save(admin);
            log.info("Admin user created in DB (email='{}')", admin.getEmail());
        });
    }
}
