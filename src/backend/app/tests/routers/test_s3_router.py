from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)


def test_get_s3_file_history_success(mock_auth_valid):
    with patch("app.routers.s3.fetch_s3_file_history") as mock_service:
        mock_service.return_value = [{"name": "test1.txt"}, {"name": "test2.txt"}]
        response = client.get(
            "/s3/history", headers={"Authorization": "Bearer valid-token"}
        )
        assert response.status_code == 200
        assert response.json() == [{"name": "test1.txt"}, {"name": "test2.txt"}]
        mock_service.assert_called_once()


def test_get_s3_file_history_server_error(mock_auth_valid):
    with patch(
        "app.routers.s3.fetch_s3_file_history", side_effect=Exception("S3 Error")
    ):
        response = client.get(
            "/s3/history", headers={"Authorization": "Bearer valid-token"}
        )
        assert response.status_code == 500
        assert response.json()["detail"] == "S3 Error"


def test_download_s3_file_success(mock_auth_valid):
    with patch("app.routers.s3.get_s3_file_content") as mock_service:
        mock_service.return_value = {"text": "file content"}
        response = client.get(
            "/s3/download",
            headers={"Authorization": "Bearer valid-token"},
            params={"file_name": "test.json"},
        )
        assert response.status_code == 200
        assert response.json() == {"text": "file content"}
        mock_service.assert_called_once_with("test.json")


def test_download_s3_file_server_error(mock_auth_valid):
    with patch(
        "app.routers.s3.get_s3_file_content", side_effect=Exception("Download Error")
    ):
        response = client.get(
            "/s3/download",
            headers={"Authorization": "Bearer valid-token"},
            params={"file_name": "test.json"},
        )
        assert response.status_code == 500
        assert response.json()["detail"] == "Download Error"
