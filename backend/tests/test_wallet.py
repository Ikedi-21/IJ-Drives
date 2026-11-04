import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_wallet_summary(client: AsyncClient, authenticated_user):
    token = authenticated_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/wallet", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["balance"] == 10000.0
    assert len(body["data"]["transactions"]) >= 1


@pytest.mark.asyncio
async def test_wallet_deposit_success(client: AsyncClient, authenticated_user):
    token = authenticated_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    deposit_payload = {"amount": 5000.0}
    response = await client.post("/wallet/deposit", json=deposit_payload, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    # 10,000 + 5,000 = 15,000
    assert body["data"]["balance"] == 15000.0
    assert len(body["data"]["transactions"]) == 2


@pytest.mark.asyncio
async def test_wallet_deposit_below_minimum(client: AsyncClient, authenticated_user):
    token = authenticated_user["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Minimum is ₦500
    deposit_payload = {"amount": 100.0}
    response = await client.post("/wallet/deposit", json=deposit_payload, headers=headers)
    assert response.status_code == 422  # Pydantic ge validation
