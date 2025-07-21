import os
import io
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)

# Helper to set env vars for authentication
@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("ENV_BASIC_AUTH_USERNAME", "testuser")
    monkeypatch.setenv("ENV_BASIC_AUTH_PASSWORD", "testpass")

def basic_auth():
    return ("testuser", "testpass")

def wrong_auth():
    return ("wronguser", "wrongpass")

def test_root_requires_auth():
    response = client.get("/")
    assert response.status_code == 401

def test_root_success():
    response = client.get("/", auth=basic_auth())
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the File Converter API"}

def test_authorize_success():
    response = client.post("/authorize", auth=basic_auth())
    assert response.status_code == 200
    assert response.json() == {"message": "Authenticated as testuser"}

def test_authorize_wrong_auth():
    response = client.post("/authorize", auth=wrong_auth())
    assert response.status_code == 401

def test_convert_no_file():
    response = client.post("/convert", auth=basic_auth())
    assert response.status_code == 400
    assert response.json()["detail"] == "Provide a file"

@patch("app.main.pypdf.PdfReader")
def test_convert_pdf_success(mock_pdfreader, tmp_path):
    # Mock PDF extraction
    mock_reader = MagicMock()
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Hello PDF"
    mock_reader.pages = [mock_page]
    mock_pdfreader.return_value = mock_reader

    file_content = b"%PDF-1.4 test content"
    file_name = "test.pdf"
    response = client.post(
        "/convert",
        auth=basic_auth(),
        files={"file": (file_name, io.BytesIO(file_content), "application/pdf")},
    )
    assert response.status_code == 200
    assert "Hello PDF" in response.text

    if os.path.exists("test.pdf"):
        os.remove("test.pdf")

    if os.path.exists(file_name):
        os.remove(file_name)

@patch("app.main.subprocess.run")
def test_convert_non_pdf_success(mock_run, tmp_path):
    # Simulate Pandoc conversion
    mock_run.return_value = MagicMock(returncode=0)
    file_name = "test.docx"
    txt_content = b"Converted text from docx"
    # Write file.txt to simulate Pandoc output
    with open("file.txt", "wb") as f:
        f.write(txt_content)

    response = client.post(
        "/convert",
        auth=basic_auth(),
        files={"file": (file_name, io.BytesIO(b"docx content"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert response.status_code == 200
    assert b"Converted text from docx" in response.content

    # Clean up
    if os.path.exists("file.txt"):
        os.remove("file.txt")
    if os.path.exists(file_name):
        os.remove(file_name)

@patch("app.main.pypdf.PdfReader", side_effect=Exception("PDF error"))
def test_convert_pdf_exception(mock_pdfreader):
    file_content = b"%PDF-1.4 test content"
    file_name = "bad.pdf"
    response = client.post(
        "/convert",
        auth=basic_auth(),
        files={"file": (file_name, io.BytesIO(file_content), "application/pdf")},
    )
    assert response.status_code == 500
    assert "PDF error" in response.json()["detail"]

    if os.path.exists("bad.pdf"):
        os.remove("bad.pdf")
