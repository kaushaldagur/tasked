## Taskboard KD

A role-based project and task management web application built with Spring Boot and a modular static frontend.

🔗 Live Demo: https://gracious-communication-production.up.railway.app/

⸻

Features

* Role-based access (Admin, Leader, Member)
* Project and team management
* Task creation, updates, and status tracking
* Search, filter, and sorting for tasks
* Bulk task status updates
* Task priority and tags (local metadata)
* Dashboard with analytics
* Dark mode with saved preference

⸻

Tech Stack

* Backend: Java 17, Spring Boot 3, Spring Security, Spring Data JPA
* Frontend: HTML, CSS, JavaScript
* Database: H2 (local), PostgreSQL (Railway)

⸻

Run Locally

DEFAULT_ADMIN_NAME="Project Admin" \
DEFAULT_ADMIN_EMAIL="your-admin-email@example.com" \
DEFAULT_ADMIN_PASSWORD="your-strong-password" \
PORT=8081 \
./mvnw spring-boot:run

Or:

./run-local.sh

Default Admin (local script):
Email: admin@workboard.com
Password: Admin@123

Open: http://localhost:8081

⸻

API

All protected routes require:

Authorization: Bearer <token>

Auth

* POST /api/auth/signup
* POST /api/auth/login
* GET /api/auth/me

Projects / Teams / Tasks

* Standard CRUD operations
* PATCH /api/tasks/{id}/status

Dashboard

* GET /api/dashboard

⸻

Deployment (Railway)

Set environment variables:

JDBC_DATABASE_URL=jdbc:postgresql://HOST:PORT/DATABASE
JDBC_DATABASE_USERNAME=DATABASE_USER
JDBC_DATABASE_PASSWORD=DATABASE_PASSWORD
JDBC_DATABASE_DRIVER=org.postgresql.Driver
DEFAULT_ADMIN_NAME=Project Admin
DEFAULT_ADMIN_EMAIL=your-admin-email@example.com
DEFAULT_ADMIN_PASSWORD=your-strong-password

Deploy and log in with the admin credentials.

⸻

Notes

* Admin user is created on first run
* Signup creates MEMBER users only
* Change default credentials after deployment

⸻
