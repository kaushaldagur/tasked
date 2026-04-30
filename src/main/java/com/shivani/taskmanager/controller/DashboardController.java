package com.shivani.taskmanager.controller;

import com.shivani.taskmanager.model.Role;
import com.shivani.taskmanager.model.Task;
import com.shivani.taskmanager.model.TaskStatus;
import com.shivani.taskmanager.model.User;
import com.shivani.taskmanager.repository.ProjectRepository;
import com.shivani.taskmanager.repository.TaskRepository;
import com.shivani.taskmanager.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin
public class DashboardController {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final AuthService authService;

    public DashboardController(TaskRepository taskRepository, ProjectRepository projectRepository, AuthService authService) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.authService = authService;
    }

    @GetMapping
    public Map<String, Object> dashboard(HttpServletRequest request) {
        User user = authService.requireUser(request);
        List<Task> tasks = visibleTasks(user);
        long todo = tasks.stream().filter(task -> task.getStatus() == TaskStatus.TODO).count();
        long inProgress = tasks.stream().filter(task -> task.getStatus() == TaskStatus.IN_PROGRESS).count();
        long done = tasks.stream().filter(task -> task.getStatus() == TaskStatus.DONE).count();
        long overdue = tasks.stream()
            .filter(task -> task.getDeadline() != null)
            .filter(task -> task.getDeadline().isBefore(LocalDate.now()))
            .filter(task -> task.getStatus() != TaskStatus.DONE)
            .count();
        return Map.of(
            "projects", user.getRole() == Role.ADMIN ? projectRepository.count() : projectRepository.findVisibleToUser(user.getId()).size(),
            "tasks", tasks.size(),
            "todo", todo,
            "inProgress", inProgress,
            "done", done,
            "overdue", overdue,
            "recentTasks", tasks.stream().limit(8).toList()
        );
    }

    private List<Task> visibleTasks(User user) {
        if (user.getRole() == Role.ADMIN) {
            return taskRepository.findAll();
        }
        Set<Task> tasks = new LinkedHashSet<>(taskRepository.findByAssignedToId(user.getId()));
        List<Long> ledProjectIds = projectRepository.findVisibleToUser(user.getId()).stream()
            .filter(project -> project.getTeam() != null)
            .filter(project -> project.getTeam().getLeader() != null)
            .filter(project -> project.getTeam().getLeader().getId().equals(user.getId()))
            .map(project -> project.getId())
            .toList();
        if (!ledProjectIds.isEmpty()) {
            tasks.addAll(taskRepository.findByProjectIdIn(ledProjectIds));
        }
        return new ArrayList<>(tasks);
    }
}
