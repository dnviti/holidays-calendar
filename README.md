# Holiday Management System

A comprehensive holiday and leave management system for enterprises, featuring Microsoft 365 integration, multi-tenant support via Business Units, and complete branding customization.

## Features

- **Authentication**: Seamless sign-on with Microsoft 365 (Azure AD).
- **Organization**: Manage multiple Business Units with distinct managers.
- **Leave Management**: Request, approve, and track holidays.
- **Calendar**: Advanced visual calendar with team views.
- **Overlap Detection**: Automatic warning when team members have overlapping leave.
- **Custom Branding**: Admins can customize logos, colors, and app name directly from the UI.
- **Responsive Design**: Mobile-friendly interface built with React.

## Tech Stack

- **Frontend**: React, Vite, FullCalendar
- **Backend**: FastAPI, SQLModel, Alembic
- **Database**: SQLite (Dev) / PostgreSQL (Prod)
- **Infrastructure**: Docker, Nginx, GitHub Actions

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/holidays-calendar.git
   cd holidays-calendar
   ```

2. **Configure Environment**
   Copy `backend/.env.example` to `backend/.env` and update the values.
   > **Note**: For Microsoft Login to work, you must configure an Azure AD App.

3. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api/docs

4. **Default Admin**
   The system creates a default admin user on first run (check server logs for credentials or see `.env`).

## Deployment

The project includes a production Docker setup (`docker-compose.prod.yml`) and GitHub Actions for automatic image building.

### GitHub Actions
The workflow `.github/workflows/docker-build.yml` automatically builds and pushes Docker images to GitHub Container Registry (ghcr.io) on commits to main.

## Documentation
See `docs/llm-config.md` for architectural details and AI assistant configuration context.
