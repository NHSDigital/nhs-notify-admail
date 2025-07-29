from fastapi.testclient import TestClient
from fastapi import HTTPException, status
from app.main import app
from app.core import constants

client = TestClient(app)


def test_root_no_auth():
    response = client.get("/")
    assert response.status_code == 401


def test_root_invalid_auth(mock_auth_invalid):
    response = client.get("/", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 401
    assert response.json() == {"detail": constants.ERROR_INVALID_TOKEN}


def test_root_with_auth(mock_auth_valid):
    response = client.get("/", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 404
    assert response.json() == {"detail": constants.ERROR_NOT_FOUND}


def test_unauthenticated_request_fails(mock_auth_invalid):
    response = client.post("/convert")
    assert response.status_code == 401
    assert "Authorization header missing" in response.json()["detail"]


def test_invalid_token_fails(mock_auth_invalid):
    response = client.post(
        "/convert", headers={"Authorization": "Bearer invalid-token"}
    )
    assert response.status_code == 401
    assert constants.ERROR_INVALID_TOKEN in response.json()["detail"]


def test_valid_token_passes_to_router(mock_auth_valid):
    response = client.post("/convert", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 400
