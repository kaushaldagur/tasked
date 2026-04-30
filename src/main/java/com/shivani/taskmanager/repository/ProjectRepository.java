package com.shivani.taskmanager.repository;

import com.shivani.taskmanager.model.Project;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    @Query("select distinct p from Project p left join p.members m where p.createdBy.id = :userId or m.id = :userId")
    List<Project> findVisibleToUser(@Param("userId") Long userId);
    List<Project> findByTeamId(Long teamId);
}
