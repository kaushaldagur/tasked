package com.shivani.taskmanager.controller;

import com.shivani.taskmanager.dto.TaskDtos.StatusRequest;
import com.shivani.taskmanager.dto.TaskDtos.TaskRequest;
import com.shivani.taskmanager.model.Project;
import com.shivani.taskmanager.model.Role;
import com.shivani.taskmanager.model.Task;
import com.shivani.taskmanager.model.TaskStatus;
import com.shivani.taskmanager.model.User;
import com.shivani.taskmanager.repository.ProjectRepository;
import com.shivani.taskmanager.repository.TaskRepository;
import com.shivani.taskmanager.repository.UserRepository;
import com.shivani.taskmanager.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin
public class TaskController {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    public TaskController(TaskRepository taskRepository, ProjectRepository projectRepository, UserRepository userRepository, AuthService authService) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @GetMapping
    public List<Task> list(HttpServletRequest request) {
        User user = authService.requireUser(request);
        if (user.getRole() == Role.ADMIN) {
            return taskRepository.findAll();
        }
        Set<Task> visibleTasks = new LinkedHashSet<>(taskRepository.findByAssignedToId(user.getId()));
        List<Long> ledProjectIds = projectRepository.findVisibleToUser(user.getId()).stream()
            .filter(project -> isProjectLeader(user, project))
            .map(Project::getId)
            .toList();
        if (!ledProjectIds.isEmpty()) {
            visibleTasks.addAll(taskRepository.findByProjectIdIn(ledProjectIds));
        }
        return new ArrayList<>(visibleTasks);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Task create(@Valid @RequestBody TaskRequest request, HttpServletRequest servletRequest) {
        User user = authService.requireUser(servletRequest);
        Task task = new Task();
        applyRequest(task, request, user);
        requireTaskManager(user, task.getProject());
        return taskRepository.save(task);
    }

    @PutMapping("/{id}")
    public Task update(@PathVariable Long id, @Valid @RequestBody TaskRequest request, HttpServletRequest servletRequest) {
        User user = authService.requireUser(servletRequest);
        Task task = requireTask(id);
        requireTaskManager(user, task.getProject());
        applyRequest(task, request, user);
        requireTaskManager(user, task.getProject());
        return taskRepository.save(task);
    }

    @PatchMapping("/{id}/status")
    public Task updateStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request, HttpServletRequest servletRequest) {
        User user = authService.requireUser(servletRequest);
        Task task = requireTask(id);
        boolean ownsTask = task.getAssignedTo() != null && task.getAssignedTo().getId().equals(user.getId());
        boolean leadsProject = isProjectLeader(user, task.getProject());
        if (user.getRole() != Role.ADMIN && !ownsTask && !leadsProject) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only update tasks assigned to you");
        }
        task.setStatus(request.status());
        return taskRepository.save(task);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest servletRequest) {
        User user = authService.requireUser(servletRequest);
        Task task = requireTask(id);
        requireTaskManager(user, task.getProject());
        taskRepository.delete(task);
    }

    private void applyRequest(Task task, TaskRequest request, User user) {
        Project project = projectRepository.findById(request.projectId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        requireTaskManager(user, project);
        task.setProject(project);
        task.setTitle(request.title().trim());
        task.setDescription(request.description());
        task.setDeadline(request.deadline());
        task.setStatus(request.status() == null ? TaskStatus.TODO : request.status());
        if (request.assignedToId() != null) {
            User assignee = userRepository.findById(request.assignedToId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignee not found"));
            boolean projectMember = project.getMembers().stream().anyMatch(member -> member.getId().equals(assignee.getId()));
            if (!projectMember) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assignee must be a project member");
            }
            task.setAssignedTo(assignee);
        } else {
            task.setAssignedTo(null);
        }
    }

    private void requireTaskManager(User user, Project project) {
        if (user.getRole() == Role.ADMIN || isProjectLeader(user, project)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins or the project team leader can manage tasks");
    }

    private boolean isProjectLeader(User user, Project project) {
        return project.getTeam() != null
            && project.getTeam().getLeader() != null
            && project.getTeam().getLeader().getId().equals(user.getId());
    }

    private Task requireTask(Long id) {
        return taskRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }
}
