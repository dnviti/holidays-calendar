"""
Holiday Calendar API - Main Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import settings
from app.core.database import create_db_and_tables
from app.api import auth, users, business_units, holidays, events, branding


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting {settings.app_name} v{settings.app_version}")
    print(f"Environment: {settings.environment}")
    print(f"Database: {settings.database_url.split('@')[-1] if '@' in settings.database_url else settings.database_url}")
    
    # Create tables (only for SQLite in dev, use Alembic migrations in production)
    if settings.is_sqlite and not settings.is_production:
        create_db_and_tables()
        print("Database tables created (SQLite dev mode)")
    
    # Create default admin if not exists
    await create_default_admin()
    
    yield
    
    # Shutdown
    print("Shutting down...")


async def create_default_admin():
    """Create a default admin user if no users exist."""
    from sqlmodel import Session, select
    from app.core.database import engine
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash
    import os
    
    with Session(engine) as session:
        # Check if any users exist
        existing = session.exec(select(User)).first()
        if existing:
            return
        
        # Create default admin
        admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        
        admin = User(
            email=admin_email,
            display_name="Administrator",
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            hashed_password=get_password_hash(admin_password),
        )
        session.add(admin)
        session.commit()
        print(f"Default admin created: {admin_email}")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Holiday Calendar Management System with Microsoft 365 Integration",
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
uploads_path = Path("uploads")
uploads_path.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(business_units.router, prefix="/api")
app.include_router(holidays.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(branding.router, prefix="/api")


# Mount static files (React build)
# Create static directory if it doesn't exist (it will remain empty until build)
static_path = Path("static/dist")
static_path.mkdir(parents=True, exist_ok=True)

# Mount assets folder
app.mount("/assets", StaticFiles(directory="static/dist/assets", check_dir=False), name="static_assets")

# Serve index.html for root and any non-api paths (SPA support)
from fastapi.responses import FileResponse


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }


@app.get("/api")
async def api_info():
    """API information endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/api/docs" if settings.debug else None,
    }

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # If path starts with api/, let it fall through (normally handled by API router)
    # But since this is below API routers, it catches what's left.
    # We should return 404 for API calls that don't match, rather than index.html
    if full_path.startswith("api"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not Found")
    
    # Check if file exists in dist (e.g. favicon.ico, manifest.json)
    file_path = static_path / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
        
    # Otherwise serve index.html
    return FileResponse(static_path / "index.html")


