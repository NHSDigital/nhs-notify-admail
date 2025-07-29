import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.core import constants

client = TestClient(app)


def test_convert_no_file(mock_auth):
    response = client.post("/convert", headers={"Authorization": "Bearer fake-token"})
    assert response.status_code == 400
    assert response.json()["detail"] == constants.ERROR_NO_FILE_PROVIDED


@patch("app.routers.convert.convert_file_service")
def test_convert_endpoint_success(mock_service, mock_auth):
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
