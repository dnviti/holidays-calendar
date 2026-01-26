import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.core.database import get_session
from app.models.user import User, UserRole
from app.core.security import get_password_hash, create_access_token

# Use in-memory SQLite for tests
@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://", 
        connect_args={"check_same_thread": False}, 
        poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session
    
    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

@pytest.fixture(name="admin_token")
def admin_token_fixture(session: Session):
    admin = User(
        email="admin@test.com",
        display_name="Admin User",
        role=UserRole.ADMIN,
        hashed_password=get_password_hash("admin"),
        is_active=True
    )
    session.add(admin)
    session.commit()
    
    token = create_access_token(data={"sub": str(admin.id)})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(name="user_token")
def user_token_fixture(session: Session):
    user = User(
        email="user@test.com",
        display_name="Normal User",
        role=UserRole.EMPLOYEE,
        hashed_password=get_password_hash("user"),
        is_active=True
    )
    session.add(user)
    session.commit()
    
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}
