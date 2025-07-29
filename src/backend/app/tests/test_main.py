from fastapi.testclient import TestClient
from unittest.mock import patch
from fastapi import HTTPException, status
from app.main import app

client = TestClient(app)


def test_root_requires_auth():
    response = client.get("/")
    assert response.status_code == 401


# def test_root_success(mock_auth):
#     response = client.get("/", headers={"Authorization": "Bearer fake-token"})
#     assert response.status_code == 200
#     assert response.json() == {"message": "Welcome to the File Converter API"}


def test_unauthenticated_request_fails():
    response = client.post("/convert")
    assert response.status_code == 401
    assert "Authorization header missing" in response.json()["detail"]


@patch("app.core.auth.CognitoAuthenticator.validate_token")
def test_invalid_token_fails(mock_validate):
    mock_validate.side_effect = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Token validation failed"
    )
    response = client.post(
        "/convert", headers={"Authorization": "Bearer invalid-token"}
    )
    assert response.status_code == 401
    assert "Token validation failed" in response.json()["detail"]


@patch("app.core.auth.CognitoAuthenticator.validate_token")
def test_valid_token_passes_to_router(mock_validate):
    mock_validate.return_value = {"username": "testuser"}

    response = client.post("/convert", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 400
