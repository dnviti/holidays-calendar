import os
import sys
from sqlmodel import Session, create_engine, select
from app.models.user import User
from app.core.config import settings
from app.core.security import verify_password, get_password_hash

# Setup
print(f"Current Working Directory: {os.getcwd()}")
print(f"configured DATABASE_URL: {settings.database_url}")

# Resolve absolute path for SQLite
if settings.database_url.startswith("sqlite:///./"):
    rel_path = settings.database_url.replace("sqlite:///./", "")
    abs_path = os.path.abspath(rel_path)
    print(f"Resolved SQLite Path: {abs_path}")
    if os.path.exists(abs_path):
        print(f"Database file EXISTS at {abs_path}")
        print(f"File size: {os.path.getsize(abs_path)} bytes")
    else:
        print(f"Database file DOES NOT EXIST at {abs_path}")

engine = create_engine(settings.database_url)

def check_admin():
    with Session(engine) as session:
        email = "admin@example.com"
        password = "password123"
        print(f"\nChecking user: {email}")
        
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if not user:
            print("❌ User NOT FOUND in database")
            return
            
        print(f"✅ User FOUND: ID={user.id}")
        print(f"Stored Hash: {user.hashed_password}")
        
        is_valid = verify_password(password, user.hashed_password)
        if is_valid:
            print(f"✅ Password '{password}' is VALID")
        else:
            print(f"❌ Password '{password}' is INVALID")
            
            # Debug hash
            new_hash = get_password_hash(password)
            print(f"New Hash for '{password}': {new_hash}")
            print(f"Verify new hash: {verify_password(password, new_hash)}")

if __name__ == "__main__":
    try:
        check_admin()
    except Exception as e:
        print(f"Error: {e}")
