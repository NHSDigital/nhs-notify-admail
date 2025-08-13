import pytest
import io
import os
from unittest.mock import patch, MagicMock
from fastapi import UploadFile
from starlette.datastructures import Headers
from app.services.convert_service import convert_file_service
from app.core.constants import CONVERTED_FILE_NAME


@pytest.mark.asyncio
@patch("app.services.convert_service.pypdf.PdfReader")
async def test_convert_pdf_success(mock_pdfreader):
    pdf_convert_result = "PDF Converted to text output"

    mock_reader = MagicMock()
    mock_page = MagicMock()
    mock_page.extract_text.return_value = pdf_convert_result
    mock_reader.pages = [mock_page]
    mock_pdfreader.return_value = mock_reader

    file_content = b"%PDF-1.4 test content"
    headers = Headers({"content-type": "application/pdf"})
    upload_file = UploadFile(
        filename="test.pdf", file=io.BytesIO(file_content), headers=headers
    )

    result = await convert_file_service(upload_file)
    extracted_text = result.extracted_text
    assert pdf_convert_result in extracted_text

    # Clean up the file created by the service
    if os.path.exists("test.pdf"):
        os.remove("test.pdf")


@pytest.mark.asyncio
@patch("app.services.convert_service.os.remove")
@patch("app.services.convert_service.subprocess.run")
async def test_convert_docx_success(mock_run, mock_remove):
    txt_convert_result = b"docx converted to text output"

    # Simulate Pandoc conversion
    mock_run.return_value = MagicMock(check=True, capture_output=True)

    def custom_open_mock(filename, mode="r"):
        if filename == CONVERTED_FILE_NAME:
            # If opening the pandoc output, return the mock content, otherwise the test will fail with the wrong result
            return io.BytesIO(txt_convert_result)
        else:
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
        extracted_text = result.extracted_text
        assert txt_convert_result in extracted_text

    # Assert that the service attempted to clean up the files
    mock_remove.assert_any_call(CONVERTED_FILE_NAME)
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
