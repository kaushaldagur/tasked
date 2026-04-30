package com.shivani.taskmanager.repository;

import com.shivani.taskmanager.model.Task;
import com.shivani.taskmanager.model.TaskStatus;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProjectIdIn(List<Long> projectIds);
    List<Task> findByAssignedToId(Long userId);
    List<Task> findByProjectId(Long projectId);
    void deleteByProjectId(Long projectId);
    long countByStatus(TaskStatus status);
    long countByDeadlineBeforeAndStatusNot(LocalDate date, TaskStatus status);
}
