#!/usr/bin/env bash
set -euo pipefail

# Local development bootstrap credentials
export DEFAULT_ADMIN_NAME="${DEFAULT_ADMIN_NAME:-Project Admin}"
export DEFAULT_ADMIN_EMAIL="${DEFAULT_ADMIN_EMAIL:-admin@workboard.com}"
export DEFAULT_ADMIN_PASSWORD="${DEFAULT_ADMIN_PASSWORD:-Admin@123}"
export DEFAULT_ADMIN_RESET_PASSWORD="${DEFAULT_ADMIN_RESET_PASSWORD:-true}"
export PORT="${PORT:-8080}"

./mvnw spring-boot:run
