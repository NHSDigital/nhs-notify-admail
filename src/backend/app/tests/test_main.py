from fastapi.testclient import TestClient
from fastapi import HTTPException, status
from app.main import app
from app.core import constants

client = TestClient(app)


def test_root_no_auth():
    response = client.get("/")
    assert response.status_code == 401


def test_root_invalid_auth(mock_auth_invalid):
    response = client.get("/", headers={"Authorization": "Bearer token"})
    assert response.status_code == 401
    assert response.json() == {"detail": constants.ERROR_INVALID_TOKEN}


def test_root_with_auth(mock_auth_valid):
    response = client.get("/", headers={"Authorization": "Bearer token"})
    assert response.status_code == 404
    assert response.json() == {"detail": constants.ERROR_NOT_FOUND}
