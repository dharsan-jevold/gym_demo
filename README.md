# Gym Fee Management

Foundation for a small gym's client, membership, and fee-management application. This is a single, maintainable application: a Spring Boot REST API, a React web app, and PostgreSQL. It deliberately does not introduce microservices, a message broker, or reminder delivery yet.

## Project layout

- `backend/` - Java 21 Spring Boot REST API
- `frontend/` - React, TypeScript, Vite, and Electron desktop application
- `docker-compose.yml` - local PostgreSQL 16 database

The backend is organised by feature (`client`, `fee`, and `dashboard`) with cross-cutting web configuration in `config`. This keeps related controller, entity, and repository code together as the application grows.

## Versions

The project currently uses these direct dependencies and tools:

| Area | Version |
| --- | --- |
| Java target | 21 |
| Spring Boot parent | 3.3.4 |
| Spring Web, Data JPA, Validation, Test | managed by Spring Boot 3.3.4 |
| PostgreSQL JDBC driver | managed by Spring Boot 3.3.4 |
| PostgreSQL container | 16-alpine |
| Node.js detected locally | 24.21.0 |
| React / React DOM (resolved) | 19.3.0 |
| TypeScript (resolved) | 6.0.3 |
| Vite (resolved) | 8.3.0 |
| Vite React plugin (resolved) | 6.1.1 |
| Oxlint (resolved) | 1.83.0 |

The frontend's `package.json` uses compatible version ranges; `package-lock.json` locks the resolved versions shown above. Spring Boot manages its starter and PostgreSQL driver versions through its parent POM, so they are intentionally not repeated in `backend/pom.xml`.

## Prerequisites

- Java 21 JDK
- Maven 3.9 or newer
- Node.js 20.19 or newer
- Docker Desktop, running

## Run locally

Start PostgreSQL from the repository root:

```powershell
docker compose up -d
```

Docker PostgreSQL is exposed on host port `5433` because port `5432` may be used by another local PostgreSQL installation.

Start the backend in a second terminal:

```powershell
cd backend
$env:JAVA_HOME = "C:\path\to\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
mvn spring-boot:run
```

The API runs at `http://localhost:8080`. PostgreSQL connection values can be overridden with `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`; their local defaults match `docker-compose.yml`.

Start the Electron desktop application in a third terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

This starts Vite and opens the Electron desktop window. During development, requests beginning with `/api` are proxied to the backend. The backend also permits requests from the Vite development server.

To create a Windows installer, run:

```powershell
cd frontend
npm.cmd run package
```

The installer is written to `frontend/release/`. The packaged application expects the backend to be available at `http://localhost:8080`.

The local backend URL defaults to `http://localhost:8080`. To use a different local backend URL, copy `frontend/.env.example` to `frontend/.env.local` and change `API_BASE_URL`. Do not put database credentials in this file.

## Current scope

The application supports client and fee creation, editing, deletion, payment status changes, dashboard counts, searchable and filterable lists, CSV fee reports, browser notifications, and a daily backend reminder job for unpaid fees due tomorrow. The Electron build produces a Windows NSIS installer; the backend remains a separate Spring Boot process backed by PostgreSQL.
