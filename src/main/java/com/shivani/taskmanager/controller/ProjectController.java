package com.shivani.taskmanager.controller;

import com.shivani.taskmanager.dto.ProjectDtos.MemberRequest;
import com.shivani.taskmanager.dto.ProjectDtos.ProjectRequest;
import com.shivani.taskmanager.model.Project;
import com.shivani.taskmanager.model.Role;
import com.shivani.taskmanager.model.User;
import com.shivani.taskmanager.repository.ProjectRepository;
import com.shivani.taskmanager.repository.TaskRepository;
import com.shivani.taskmanager.repository.TeamRepository;
import com.shivani.taskmanager.repository.UserRepository;
import com.shivani.taskmanager.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.transaction.Transactional;
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
@RequestMapping("/api/projects")
@CrossOrigin
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    public ProjectController(ProjectRepository projectRepository, TaskRepository taskRepository, TeamRepository teamRepository, UserRepository userRepository, AuthService authService) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.teamRepository = teamRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @GetMapping
    public List<Project> list(HttpServletRequest request) {
        User user = authService.requireUser(request);
        if (user.getRole() == Role.ADMIN) {
            return projectRepository.findAll();
        }
        return projectRepository.findVisibleToUser(user.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Project create(@Valid @RequestBody ProjectRequest request, HttpServletRequest servletRequest) {
        User admin = authService.requireAdmin(servletRequest);
        Project project = new Project();
        project.setName(request.name().trim());
        project.setDescription(request.description());
        project.setCreatedBy(admin);
        applyTeamAndMembers(project, request);
        return projectRepository.save(project);
    }

    @PutMapping("/{id}")
    public Project update(@PathVariable Long id, @Valid @RequestBody ProjectRequest request, HttpServletRequest servletRequest) {
        authService.requireAdmin(servletRequest);
        Project project = requireProject(id);
        project.setName(request.name().trim());
        project.setDescription(request.description());
        applyTeamAndMembers(project, request);
        return projectRepository.save(project);
    }

    @PostMapping("/{id}/members")
    public Project addMember(@PathVariable Long id, @Valid @RequestBody MemberRequest request, HttpServletRequest servletRequest) {
        authService.requireAdmin(servletRequest);
        Project project = requireProject(id);
        User member = userRepository.findById(request.userId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        project.getMembers().add(member);
        return projectRepository.save(project);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id, HttpServletRequest servletRequest) {
        authService.requireAdmin(servletRequest);
        Project project = requireProject(id);
        taskRepository.deleteByProjectId(project.getId());
        projectRepository.delete(project);
    }

    private Project requireProject(Long id) {
        return projectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private void addMembers(Project project, Set<Long> memberIds) {
        if (memberIds == null) {
            return;
        }
        for (Long memberId : memberIds) {
            User member = userRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + memberId));
            project.getMembers().add(member);
        }
    }

    private void applyTeamAndMembers(Project project, ProjectRequest request) {
        project.getMembers().clear();
        project.getMembers().add(project.getCreatedBy());
        if (request.teamId() != null) {
            var team = teamRepository.findById(request.teamId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
            project.setTeam(team);
            project.getMembers().addAll(team.getMembers());
            if (team.getLeader() != null) {
                project.getMembers().add(team.getLeader());
            }
        } else {
            project.setTeam(null);
        }
        addMembers(project, request.memberIds());
    }
}
