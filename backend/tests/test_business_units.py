def test_create_business_unit(client, admin_token):
    response = client.post(
        "/api/business-units",
        headers=admin_token,
        json={
            "name": "Engineering",
            "primary_color": "#000000",
            "secondary_color": "#ffffff"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Engineering"
    assert "id" in data

def test_list_business_units(client, admin_token):
    client.post(
        "/api/business-units",
        headers=admin_token,
        json={"name": "Sales"}
    )
    
    response = client.get("/api/business-units", headers=admin_token)
    assert response.status_code == 200
    assert len(response.json()) >= 1
