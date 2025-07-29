from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.core import constants

client = TestClient(app)


def test_invalid_token_fails(mock_auth_invalid):
    response = client.post(
        "/convert", headers={"Authorization": "Bearer invalid-token"}
    )
    assert response.status_code == 401
    assert constants.ERROR_INVALID_TOKEN in response.json()["detail"]


def test_valid_token_passes_to_router(mock_auth_valid):
    response = client.post("/convert", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 400  # Expects a file, so 400 is correct


def test_convert_no_file(mock_auth_valid):
    response = client.post("/convert", headers={"Authorization": "Bearer fake-token"})
    assert response.status_code == 400
    assert response.json()["detail"] == constants.ERROR_NO_FILE_PROVIDED


@patch("app.routers.convert.convert_file_service")
def test_convert_endpoint_success(mock_service, mock_auth_valid):
    mock_service.return_value = "Mocked conversion result"
    file_content = b"dummy file content"
    response = client.post(
        "/convert",
        headers={"Authorization": "Bearer fake-token"},
        files={"file": ("test.txt", file_content, "text/plain")},
    )
    assert response.status_code == 200
    assert response.text == '"Mocked conversion result"'
    mock_service.assert_called_once()
