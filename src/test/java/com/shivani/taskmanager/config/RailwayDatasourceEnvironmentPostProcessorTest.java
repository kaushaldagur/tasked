package com.shivani.taskmanager.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RailwayDatasourceEnvironmentPostProcessorTest {

    @Test
    void parseDatabaseUrl_standardRailwayShape() {
        RailwayDatasourceEnvironmentPostProcessor.ParsedJdbc parsed =
            RailwayDatasourceEnvironmentPostProcessor.parseDatabaseUrl(
                "postgresql://myuser:mypass@containers.example.com:5432/railway"
            );
        assertThat(parsed.jdbcUrl())
            .isEqualTo("jdbc:postgresql://containers.example.com:5432/railway");
        assertThat(parsed.username()).isEqualTo("myuser");
        assertThat(parsed.password()).isEqualTo("mypass");
    }

    @Test
    void parseDatabaseUrl_preservesQueryString() {
        RailwayDatasourceEnvironmentPostProcessor.ParsedJdbc parsed =
            RailwayDatasourceEnvironmentPostProcessor.parseDatabaseUrl(
                "postgres://u:p@host:5432/db?sslmode=require"
            );
        assertThat(parsed.jdbcUrl()).isEqualTo("jdbc:postgresql://host:5432/db?sslmode=require");
    }
}
