package com.shivani.taskmanager.controller;

import com.shivani.taskmanager.dto.TeamDtos.TeamRequest;
import com.shivani.taskmanager.model.Role;
import com.shivani.taskmanager.model.Team;
import com.shivani.taskmanager.model.User;
import com.shivani.taskmanager.repository.TeamRepository;
import com.shivani.taskmanager.repository.UserRepository;
import com.shivani.taskmanager.repository.ProjectRepository;
import com.shivani.taskmanager.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/teams")
@CrossOrigin
public class TeamController {

    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final AuthService authService;

    public TeamController(TeamRepository teamRepository, UserRepository userRepository, ProjectRepository projectRepository, AuthService authService) {
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.authService = authService;
    }

    @GetMapping
    public List<Team> list(HttpServletRequest request) {
        User user = authService.requireUser(request);
        if (user.getRole() == Role.ADMIN) {
            return teamRepository.findAll();
        }
        return teamRepository.findVisibleToUser(user.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Team create(@Valid @RequestBody TeamRequest request, HttpServletRequest servletRequest) {
        authService.requireAdmin(servletRequest);
        Team team = new Team();
        applyRequest(team, request);
        return teamRepository.save(team);
    }

    @PutMapping("/{id}")
    public Team update(@PathVariable Long id, @Valid @RequestBody TeamRequest request, HttpServletRequest servletRequest) {
        authService.requireAdmin(servletRequest);
        Team team = requireTeam(id);
        applyRequest(team, request);
        return teamRepository.save(team);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest servletRequest) {
        authService.requireAdmin(servletRequest);
        Team team = requireTeam(id);
        projectRepository.findByTeamId(team.getId()).forEach(project -> {
            project.setTeam(null);
            projectRepository.save(project);
        });
        teamRepository.delete(team);
    }

    private void applyRequest(Team team, TeamRequest request) {
        team.setName(request.name().trim());
        team.setDescription(request.description());
        team.getMembers().clear();
        addMembers(team, request.memberIds());
        if (request.leaderId() != null) {
            User leader = userRepository.findById(request.leaderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Leader not found"));
            team.setLeader(leader);
            team.getMembers().add(leader);
        } else {
            team.setLeader(null);
        }
    }

    private void addMembers(Team team, Set<Long> memberIds) {
        if (memberIds == null) {
            return;
        }
        for (Long memberId : memberIds) {
            User member = userRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + memberId));
            team.getMembers().add(member);
        }
    }

    private Team requireTeam(Long id) {
        return teamRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
    }
}
