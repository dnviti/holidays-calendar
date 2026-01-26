from sqlmodel import Session, create_engine
from app.core.config import settings
from app.services.user_service import UserService
from app.core.security import verify_password, get_password_hash

# Setup DB connection
engine = create_engine(settings.database_url)

def debug_auth():
    print("Testing auth logic...")
    try:
        # 1. Test hashing
        pw = "password123"
        hashed = get_password_hash(pw)
        print(f"Hash generated: {hashed}")
        
        # 2. Test verify
        is_valid = verify_password(pw, hashed)
        print(f"Verify result: {is_valid}")
        
        # 3. Test DB user
        with Session(engine) as session:
            user_service = UserService(session)
            email = "admin@example.com"
            user = user_service.get_user_by_email(email)
            
            if not user:
                print("User not found!")
                return
                
            print(f"User found: {user.email}")
            print(f"User hash: {user.hashed_password}")
            
            if not user.hashed_password:
                print("User has no password hash!")
                return
                
            db_verify = verify_password(pw, user.hashed_password)
            print(f"DB User verify result: {db_verify}")
            
    except Exception as e:
        print(f"CRASH: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_auth()
