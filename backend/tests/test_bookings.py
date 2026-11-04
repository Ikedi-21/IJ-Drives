import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_booking_atomic_success(client: AsyncClient, authenticated_user, sample_route):
    token = authenticated_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    booking_payload = {
        "route_id": sample_route.id,
        "passenger": {
            "fullName": "Chidi Mokeme",
            "email": "testrider@ijdrives.ng",
            "phone": "08012345678",
        },
        "seat": "4A",
        "class": "Standard",
        "travel_date": "2026-11-10",
    }

    response = await client.post("/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["route_id"] == sample_route.id
    assert data["status"] == "confirmed"
    assert data["ref"].startswith("IJ-")
    assert data["fare"] == 3500.0

    # Verify wallet was debited: 10,000 - 3,500 = 6,500
    wallet_resp = await client.get("/wallet", headers=headers)
    assert wallet_resp.json()["data"]["balance"] == 6500.0


@pytest.mark.asyncio
async def test_booking_insufficient_funds(client: AsyncClient, sample_route):
    # Register user with standard ₦500 bonus (fare is ₦3,500)
    reg_resp = await client.post("/auth/register", json={
        "full_name": "Low Balance User",
        "email": "broke@ijdrives.ng",
        "password": "password123",
    })
    token = reg_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    booking_payload = {
        "route_id": sample_route.id,
        "passenger": {
            "fullName": "Low Balance User",
            "email": "broke@ijdrives.ng",
            "phone": "08000000000",
        },
        "seat": "1A",
    }

    response = await client.post("/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "INSUFFICIENT_WALLET_BALANCE"
    assert body["error"]["details"][0]["shortfall"] == 3000.0  # 3500 - 500


@pytest.mark.asyncio
async def test_list_my_bookings(client: AsyncClient, authenticated_user, sample_route):
    token = authenticated_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Make 1 booking
    await client.post("/bookings", json={
        "route_id": sample_route.id,
        "passenger": {
            "fullName": "Chidi Mokeme",
            "email": "testrider@ijdrives.ng",
            "phone": "08012345678",
        },
        "seat": "2B",
    }, headers=headers)

    response = await client.get("/bookings/my", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]) >= 1
    assert body["data"][0]["route_id"] == sample_route.id

