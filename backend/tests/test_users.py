from app.models.user import UserRole

def test_read_users_admin(client, admin_token):
    response = client.get("/api/users", headers=admin_token)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1  # Should contain at least the admin

def test_read_users_unauthorized(client, user_token):
    response = client.get("/api/users", headers=user_token)
    assert response.status_code == 403

def test_create_user(client, admin_token):
    response = client.post(
        "/api/users",
        headers=admin_token,
        json={
            "email": "newuser@test.com",
            "display_name": "New User",
            "role": "employee",
            "password": "password123"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert "id" in data

def test_delete_user(client, admin_token):
    # Create user first
    create_res = client.post(
        "/api/users",
        headers=admin_token,
        json={
            "email": "todelete@test.com",
            "display_name": "To Delete",
            "role": "employee"
        }
    )
    user_id = create_res.json()["id"]
    
    # Delete
    response = client.delete(f"/api/users/{user_id}", headers=admin_token)
    assert response.status_code == 204
    
    # Verify deleted (technically soft delete depending on implementation, 
    # but for API it might be hidden or isActive=False)
    # Our implementation uses soft delete
    get_res = client.get(f"/api/users/{user_id}", headers=admin_token)
    assert get_res.status_code == 200
    assert get_res.json()["is_active"] == False
