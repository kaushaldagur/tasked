# Taskboard KD
https://gracious-communication-production.up.railway.app/
WorkBoard is a role-based project and task management web app built with Spring Boot and a redesigned static frontend.

## Highlights

- New visual system: refreshed colors, spacing, cards, and typography
- Dark mode toggle with persistent theme preference
- Updated task board interactions: search, status filter, priority filter, sorting
- Bulk task status updates for selected tasks
- Task metadata feature: local priority and tags per task
- Analytics panel for quick status/priority insights
- Clearer validation messages on create/edit forms
- Modular frontend architecture (`state`, `services`, `utils`, `main`)

## Tech Stack

- Java 17
- Spring Boot 3
- Spring Security (BCrypt)
- Spring Data JPA
- H2 database (local)
- PostgreSQL (Railway)
- Static HTML/CSS/JavaScript served by Spring Boot

## Frontend Architecture

The frontend is split into focused modules:

- `src/main/resources/static/js/state.js` - global state shape and UI filter state
- `src/main/resources/static/js/services/api.js` - API service layer
- `src/main/resources/static/js/services/task-meta.js` - local task metadata persistence (priority/tags)
- `src/main/resources/static/js/utils.js` - shared utilities
- `src/main/resources/static/js/main.js` - orchestration, rendering, and event handlers

## Local Setup

Run locally:

```bash
DEFAULT_ADMIN_NAME="Project Admin" \
DEFAULT_ADMIN_EMAIL="your-admin-email@example.com" \
DEFAULT_ADMIN_PASSWORD="your-strong-password" \
PORT=8081 \
./mvnw spring-boot:run
```

Or use the permanent local script (fixed admin login):

```bash
./run-local.sh
```

Default local admin credentials from this script:

- Email: `admin@workboard.com`
- Password: `Admin@123`

Open:

```text
http://localhost:8081
```

Notes:

- Admin user is created from env vars on first run.
- Signup creates `MEMBER` users only.
- Local DB file: `data/taskmanager.mv.db`

## Core User Flow

1. Admin logs in.
2. Members sign up.
3. Admin creates teams and assigns leaders.
4. Admin creates projects and links members.
5. Admin/leader creates tasks.
6. Members update task status.
7. Team uses filters, sort, and bulk updates to manage work.
8. Dashboard shows progress + analytics cards.

## API Summary

Use bearer token:

```http
Authorization: Bearer <token>
```

- Auth: `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/auth/users`
- Projects: `GET /api/projects`, `POST /api/projects`, `PUT /api/projects/{id}`, `DELETE /api/projects/{id}`
- Teams: `GET /api/teams`, `POST /api/teams`, `PUT /api/teams/{id}`, `DELETE /api/teams/{id}`
- Tasks: `GET /api/tasks`, `POST /api/tasks`, `PUT /api/tasks/{id}`, `DELETE /api/tasks/{id}`, `PATCH /api/tasks/{id}/status`
- Dashboard: `GET /api/dashboard`

## Railway Deployment

1. Create a Railway project.
2. Connect your GitHub repository.
3. Add a PostgreSQL service.
4. Set variables:

```env
JDBC_DATABASE_URL=jdbc:postgresql://HOST:PORT/DATABASE
JDBC_DATABASE_USERNAME=DATABASE_USER
JDBC_DATABASE_PASSWORD=DATABASE_PASSWORD
JDBC_DATABASE_DRIVER=org.postgresql.Driver
DEFAULT_ADMIN_NAME=Project Admin
DEFAULT_ADMIN_EMAIL=your-admin-email@example.com
DEFAULT_ADMIN_PASSWORD=your-strong-password
```

5. Deploy and open the generated domain.
6. Login with the configured admin credentials.

