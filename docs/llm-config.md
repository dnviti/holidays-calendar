# LLM Configuration Context

Use this context to configure an LLM agent to working on this project.

## Project Overview
This is a Holiday Management Application built with a decoupled architecture:
- **Frontend**: React (Vite)
- **Backend**: FastAPI (Python)
- **Database**: SQLite (Dev) / PostgreSQL (Prod) via SQLModel/SQLAlchemy
- **Auth**: Microsoft 365 (Azure AD) via MSAL

## Key Architectural Decisions
1. **Branding System**: The application uses dynamic CSS variables for branding. The `ThemeContext` in frontend fetches configuration from `/api/branding` and injects it into `:root`. Do not hardcode colors; always use CSS variables (e.g., `var(--primary-color)`).
2. **Business Units**: Users belong to Business Units. Permissions are role-based (Admin, BU Manager, Employee).
3. **Calendar**: Uses FullCalendar. Events are fetched via `/api/holidays/calendar`.
4. **Overlap Detection**: The backend `HolidayService` automatically checks for overlapping holidays within the same Business Unit.

## Code Style & Conventions
- **Backend**:
  - Use `SQLModel` for both DB models and Pydantic schemas where possible (inherit from Base).
  - Use dependency injection for `Session` and `User`.
  - All endpoints must include auth dependencies (`get_current_user`).
- **Frontend**:
  - Use Functional Components with Hooks.
  - Use `api` service (Axios interceptors) for all requests.
  - Components should be reusable and placed in `components/ui`.
  - Avoid tailwind utility classes for colors; use semantic names like `bg-primary` (mapped in CSS) or style props with variables.

## Environment Variables
Required for full functionality:
- `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`: For Auth.
- `DATABASE_URL`: DB connection string.

## Database Migrations
Always use Alembic for DB changes:
```bash
alembic revision --autogenerate -m "message"
alembic upgrade head
```

## Running the Project
```bash
# Development
docker-compose up --build

# Production
docker-compose -f docker-compose.prod.yml up -d
```
