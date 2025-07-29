import pytest
import io
import os
from unittest.mock import patch, MagicMock
from fastapi import UploadFile
from starlette.datastructures import Headers
from app.services.convert_service import convert_file_service


@pytest.mark.asyncio
@patch("app.services.convert_service.pypdf.PdfReader")
async def test_convert_pdf_success(mock_pdfreader):
    # Mock PDF extraction
    mock_reader = MagicMock()
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Hello PDF"
    mock_reader.pages = [mock_page]
    mock_pdfreader.return_value = mock_reader

    file_content = b"%PDF-1.4 test content"
    headers = Headers({"content-type": "application/pdf"})
    upload_file = UploadFile(
        filename="test.pdf", file=io.BytesIO(file_content), headers=headers
    )

    result = await convert_file_service(upload_file)
    assert "Hello PDF" in result

    # Clean up the file created by the service
    if os.path.exists("test.pdf"):
        os.remove("test.pdf")


@pytest.mark.asyncio
@patch("app.services.convert_service.os.remove")
@patch("app.services.convert_service.subprocess.run")
async def test_convert_txt_success(mock_run, mock_remove):
    # Simulate Pandoc conversion
    mock_run.return_value = MagicMock(check=True, capture_output=True)

    # This custom mock handles the two separate 'open' calls in the service
    def custom_open_mock(filename, mode="r"):
        if filename == "file.txt":
            # If opening the pandoc output, return the mock content
            return io.BytesIO(b"Converted text from docx")
        else:
            # For any other file open (like writing the initial file),
            # return a dummy, writable object.
            return io.BytesIO()

    with patch("app.services.convert_service.open", side_effect=custom_open_mock):
        file_content = b"docx content"
        headers = Headers(
            {
                "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            }
        )
        upload_file = UploadFile(
            filename="test.docx",
            file=io.BytesIO(file_content),
            headers=headers,
        )

        result = await convert_file_service(upload_file)
        assert b"Converted text from docx" in result

    # Assert that the service attempted to clean up the files
    mock_remove.assert_any_call("file.txt")
    mock_remove.assert_any_call("test.docx")


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
