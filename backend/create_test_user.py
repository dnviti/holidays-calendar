from sqlmodel import Session, select, create_engine
from app.models.user import User, UserCreate
from app.core.config import settings
from app.services.user_service import UserService

# Setup DB connection
engine = create_engine(settings.database_url)

def create_test_user():
    with Session(engine) as session:
        user_service = UserService(session)
        email = "admin@example.com"
        
        existing_user = user_service.get_user_by_email(email)
        if existing_user:
            print(f"User {email} already exists. Resetting password.")
            # Update password using verify_password/hash logic inside user_service or manually
            # UserService doesn't expose strict password update method for arbitrary user easily in one line without object
            # But we can update the object directly
            from app.core.security import get_password_hash
            existing_user.hashed_password = get_password_hash("password123")
            session.add(existing_user)
            session.commit()
            print("Password reset to 'password123'")
            return

        print(f"Creating user {email}...")
        user_in = UserCreate(
            email=email,
            password="password123",
            display_name="Admin User",
            first_name="Admin",
            last_name="User",
        )
        user = user_service.create_user(user_in)
        print(f"User created with ID: {user.id}")

if __name__ == "__main__":
    create_test_user()
