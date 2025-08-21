import pytest
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError
from app.services.s3_service import fetch_s3_file_history, get_s3_file_content
from datetime import datetime


@pytest.mark.asyncio
async def test_fetch_s3_file_history_success(mock_s3_client):
    paginator_mock = MagicMock()
    page1 = {
        "Contents": [
            {"Key": "dir/", "LastModified": datetime(2023, 1, 1, 10, 0, 0)},
            {"Key": "dir/file2.json", "LastModified": datetime(2023, 1, 2, 10, 0, 0)},
        ]
    }
    page2 = {
        "Contents": [
            {"Key": "dir/file1.json", "LastModified": datetime(2023, 1, 3, 10, 0, 0)}
        ]
    }
    paginator_mock.paginate.return_value = [page1, page2]
    mock_s3_client.get_paginator.return_value = paginator_mock

    result = await fetch_s3_file_history()

    assert len(result) == 2
    assert result[0]["name"] == "dir/file1.json"
    assert result[1]["name"] == "dir/file2.json"
    assert result[0]["last_modified"] == "2023-01-03 10:00:00"
    assert result[1]["last_modified"] == "2023-01-02 10:00:00"


@pytest.mark.asyncio
async def test_get_s3_file_content_success(mock_s3_client):
    mock_body = MagicMock()
    mock_body.read.return_value.decode.return_value = '{"test": "content"}'
    mock_s3_client.get_object.return_value = {"Body": mock_body}

    result = await get_s3_file_content("test.json")

    assert result == {"test": "content"}
    mock_s3_client.get_object.assert_called_once_with(
        Bucket="test-bucket", Key="test.json", ExpectedBucketOwner=None
    )


@pytest.mark.asyncio
async def test_get_s3_file_content_client_error(mock_s3_client):
    mock_s3_client.get_object.side_effect = ClientError(
        {"Error": {"Message": "Test Client Error"}}, "get_object"
    )

    with pytest.raises(Exception) as excinfo:
        await get_s3_file_content("test.json")
    assert "Error fetching S3 file content" in str(excinfo.value)
    assert "Test Client Error" in str(excinfo.value)
