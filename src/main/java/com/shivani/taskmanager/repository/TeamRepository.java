package com.shivani.taskmanager.repository;

import com.shivani.taskmanager.model.Team;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeamRepository extends JpaRepository<Team, Long> {
    @Query("select distinct t from Team t left join t.members m where t.leader.id = :userId or m.id = :userId")
    List<Team> findVisibleToUser(@Param("userId") Long userId);
}
