import pytest
import io
import os
from unittest.mock import patch, MagicMock
from fastapi import UploadFile
from starlette.datastructures import Headers
from app.services.convert_service import convert_file_service
from app.core.constants import CONVERTED_FILE_NAME
from fastapi import UploadFile, HTTPException
from subprocess import CalledProcessError
# File: tests/services/test_convert_service_additional.py

@pytest.mark.asyncio
@patch("app.services.convert_service.pypdf.PdfReader")
async def test_pdf_multiple_pages_mixed_text(mock_reader_cls, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    # Page 1 has text, page 2 returns None, page 3 has text
    page1 = MagicMock()
    page1.extract_text.return_value = "Hello"
    page2 = MagicMock()
    page2.extract_text.return_value = None
    page3 = MagicMock()
    page3.extract_text.return_value = "World"
    mock_reader = MagicMock()
    mock_reader.pages = [page1, page2, page3]
    mock_reader_cls.return_value = mock_reader

    upload_file = UploadFile(
        filename="sample.pdf",
        file=io.BytesIO(b"%PDF-1.4 dummy"),
        headers=Headers({"content-type": "application/pdf"}),
    )

    result = await convert_file_service(upload_file)
    assert result["pages"] == 3
    assert result["extracted_text"] == "Hello\nWorld"
    assert result["file_type"] == "pdf"
    assert not os.path.exists("sample.pdf")  # cleaned up


@pytest.mark.asyncio
@patch("app.services.convert_service.pypdf.PdfReader")
async def test_pdf_zero_pages(mock_reader_cls, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    mock_reader = MagicMock()
    mock_reader.pages = []
    mock_reader_cls.return_value = mock_reader

    upload_file = UploadFile(
        filename="empty.pdf",
        file=io.BytesIO(b"%PDF-1.4 empty"),
        headers=Headers({"content-type": "application/pdf"}),
    )

    result = await convert_file_service(upload_file)
    assert result["pages"] == 0
    assert result["extracted_text"] == ""
    assert result["file_type"] == "pdf"


@pytest.mark.asyncio
@patch("app.services.convert_service.subprocess.run")
async def test_docx_path_traversal_windows_filename_sanitized(mock_run, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    mock_run.return_value = MagicMock()

    # Simulate aiofiles.open for both write (uploaded file) and read (converted output)
    class DummyAsyncFile:
        def __init__(self, initial=b""):
            self.buffer = io.BytesIO(initial)

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def write(self, data):
            self.buffer.seek(0, 2)
            self.buffer.write(data)

        async def read(self):
            self.buffer.seek(0)
            return self.buffer.read()

        async def seek(self, pos):
            self.buffer.seek(pos)

    files = {}

    def aiofiles_open_mock(name, mode="r", *args, **kwargs):
        if name not in files:
            if name == CONVERTED_FILE_NAME:
                files[name] = DummyAsyncFile(b"Converted bytes result")
            else:
                files[name] = DummyAsyncFile()
        return files[name]

    with patch("app.services.convert_service.aiofiles.open", side_effect=aiofiles_open_mock):
        upload_file = UploadFile(
            filename="C:\\users\\evil\\..\\..\\secret.docx",
            file=io.BytesIO(b"DOCX bytes"),
            headers=Headers({"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),
        )
        result = await convert_file_service(upload_file)
        assert result["file_type"] == "docx"
        assert b"Converted bytes result" in result["extracted_text"]  # type: ignore
        # Ensure sanitized filename only (basename)
        assert not os.path.exists("secret.docx")  # cleaned up


@pytest.mark.asyncio
@patch("app.services.convert_service.subprocess.run", side_effect=CalledProcessError(1, "pandoc"))
async def test_docx_pandoc_failure_returns_http_exception(mock_run, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)

    # Need aiofiles.open for initial write only
    class DummyAsyncFile:
        def __init__(self):
            self.buffer = io.BytesIO()

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def write(self, data):
            self.buffer.write(data)

    with patch("app.services.convert_service.aiofiles.open", return_value=DummyAsyncFile()):
        upload_file = UploadFile(
            filename="fail.docx",
            file=io.BytesIO(b"DOCX data"),
            headers=Headers({"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),
        )
        with pytest.raises(HTTPException) as exc:
            await convert_file_service(upload_file)
        assert exc.value.status_code == 500
        assert "Command" in exc.value.detail or "pandoc" in exc.value.detail


@pytest.mark.asyncio
async def test_file_read_failure_raises_http_exception():
    class BadUpload(UploadFile):
        async def read(self, *a, **k):
            raise RuntimeError("read failed")

    bad = BadUpload(filename="x.pdf", file=io.BytesIO(b"bad"))
    with pytest.raises(HTTPException) as exc:
        await convert_file_service(bad)
    assert exc.value.status_code == 500
    assert "read failed" in exc.value.detail


@pytest.mark.asyncio
@patch("app.services.convert_service.os.path.exists", return_value=False)
@patch("app.services.convert_service.os.remove")
@patch("app.services.convert_service.subprocess.run")
async def test_cleanup_skips_missing_converted_file(mock_run, mock_remove, mock_exists, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    mock_run.return_value = MagicMock()

    class DummyAsyncFile:
        def __init__(self):
            self.buffer = io.BytesIO()

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def write(self, data):
            self.buffer.write(data)

        async def read(self):
            self.buffer.seek(0)
            return b"Some output"

    def open_mock(name, mode="r", *a, **k):
        return DummyAsyncFile()

    with patch("app.services.convert_service.aiofiles.open", side_effect=open_mock):
        upload = UploadFile(
            filename="orphan.docx",
            file=io.BytesIO(b"docx data"),
            headers=Headers({"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),
        )
        result = await convert_file_service(upload)
        assert result["file_type"] == "docx"
        # Since exists() returned False, only the original filename should be removed
        calls = [c for c in mock_remove.call_args_list]
        # Ensure we did NOT attempt to remove the converted file (guarded by exists())
        assert all(CONVERTED_FILE_NAME not in str(c) for c in calls)
        # Original file should still be attempted
        assert any("orphan.docx" in str(c) for c in calls)


@pytest.mark.asyncio
@patch("app.services.convert_service.pypdf.PdfReader")
async def test_pdf_extraction_ignores_none_text(mock_reader_cls, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    page_with_none = MagicMock()
    page_with_none.extract_text.return_value = None
    page_with_text = MagicMock()
    page_with_text.extract_text.return_value = "Only text"
    mock_reader = MagicMock()
    mock_reader.pages = [page_with_none, page_with_text]
    mock_reader_cls.return_value = mock_reader

    upload_file = UploadFile(
        filename="mix.pdf",
        file=io.BytesIO(b"%PDF-1.4 something"),
        headers=Headers({"content-type": "application/pdf"}),
    )
    result = await convert_file_service(upload_file)
    assert result["extracted_text"] == "Only text"
    assert result["pages"] == 2

@pytest.mark.asyncio
@patch(
    "app.services.convert_service.pypdf.PdfReader",
    side_effect=Exception("PDF error"),
)
async def test_convert_pdf_exception(mock_pdfreader):
    file_content = b"%PDF-1.4 test content"
    headers = Headers({"content-type": "application/pdf"})
    upload_file = UploadFile(
        filename="bad.pdf", file=io.BytesIO(file_content), headers=headers
    )

    with pytest.raises(Exception) as excinfo:
        await convert_file_service(upload_file)
    assert "PDF error" in str(excinfo.value)

    # Clean up the file created by the service
    if os.path.exists("bad.pdf"):
        os.remove("bad.pdf")
