import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    payload = {
        "full_name": "Amaka Nnamdi",
        "email": "amaka@example.com",
        "password": "strongPassword123!",
    }
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 201

    body = response.json()
    assert body["success"] is True
    assert "data" in body
    data = body["data"]
    assert "access_token" in data
    assert data["user"]["email"] == "amaka@example.com"
    assert data["user"]["full_name"] == "Amaka Nnamdi"
    # Verify ₦500 welcome bonus auto-credited
    assert data["user"]["wallet_balance"] == 500.0


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "full_name": "First User",
        "email": "dup@example.com",
        "password": "password123",
    }
    res1 = await client.post("/auth/register", json=payload)
    assert res1.status_code == 201

    # Second attempt with same email
    res2 = await client.post("/auth/register", json=payload)
    assert res2.status_code == 409
    body = res2.json()
    assert body["success"] is False
    assert body["error"]["code"] == "DUPLICATE_RESOURCE"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    # Register first
    await client.post("/auth/register", json={
        "full_name": "Tunde Bakare",
        "email": "tunde@example.com",
        "password": "mypassword123",
    })

    # Login
    response = await client.post("/auth/login", json={
        "email": "tunde@example.com",
        "password": "mypassword123",
    })
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "access_token" in body["data"]


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    response = await client.post("/auth/login", json={
        "email": "tunde@example.com",
        "password": "wrongPassword!",
    })
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "AUTHENTICATION_FAILED"


@pytest.mark.asyncio
async def test_get_current_user_profile(client: AsyncClient, authenticated_user):
    token = authenticated_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["email"] == authenticated_user["user"].email
    assert body["data"]["wallet_balance"] == 10000.0

