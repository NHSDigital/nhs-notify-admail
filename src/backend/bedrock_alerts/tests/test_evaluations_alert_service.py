import pytest
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError
import jsonlines
import io
import sys
import os
from evaluations_alert_service import BedrockAlertsService

@pytest.fixture
def mock_aws_clients(mocker):
    """Mocks the S3 and SES boto3 clients."""
    mocker.patch('boto3.client', return_value=MagicMock())


def test_calculate_rating_percentage_from_list():
    """
    Tests that the rating percentage is calculated correctly from a list of records.
    """
    service = BedrockAlertsService(sender_email="test@example.com")
    records = [
        {"automatedEvaluationResult": {"scores": [{"metricName": "Rating", "result": 1.0}]}},
        {"automatedEvaluationResult": {"scores": [{"metricName": "Rating", "result": 0.5}]}},
        {"automatedEvaluationResult": {"scores": [{"metricName": "SomeOtherMetric", "result": 0.9}]}},
        {"automatedEvaluationResult": {"scores": [{"metricName": "Rating", "result": 0.0}]}},
        {}, # Malformed record
    ]

    # Expected: (1.0 + 0.5 + 0.0) / 3 * 100 = 50
    expected_percentage = 50.0
    actual_percentage = service.calculate_rating_percentage_from_list(records)

    assert actual_percentage == expected_percentage
    assert service.success_percentage == expected_percentage

def test_calculate_rating_percentage_no_ratings():
    """
    Tests the case where no records have a 'Rating' metric.
    """
    service = BedrockAlertsService(sender_email="test@example.com")
    records = [
        {"automatedEvaluationResult": {"scores": [{"metricName": "Accuracy", "result": 1.0}]}},
        {"automatedEvaluationResult": {"scores": [{"metricName": "Toxicity", "result": 0.1}]}},
    ]

    assert service.calculate_rating_percentage_from_list(records) == 0.0

def test_send_alert(mocker):
    """
    Tests that the send_alert method calls the SES send_raw_email with the correct parameters.
    """
    mock_ses_client = MagicMock()
    mocker.patch('boto3.client', return_value=mock_ses_client)
    sender = "sender@example.com"
    service = BedrockAlertsService(sender_email=sender)
    service.success_percentage = 42.0  # Set a value to be included in the email
    service.send_alert()
    mock_ses_client.send_raw_email.assert_called_once()
    call_args = mock_ses_client.send_raw_email.call_args[1]

    assert call_args['Source'] == sender
    assert call_args['Destinations'] == [sender]

    raw_message_data = call_args['RawMessage']['Data']
    assert f"Subject: Bedrock Evaluation Job Rating Alert: 42.0" in raw_message_data
    assert f"Alert Percentage: 42.0" in raw_message_data


def test_find_results_file_in_s3_success(mocker):
    """
    Tests successfully finding and parsing a .jsonl file in S3.
    """
    mock_s3_client = MagicMock()
    mock_paginator = MagicMock()
    mock_paginator.paginate.return_value = [
        {
            "Contents": [
                {"Key": "some/path/results_123_output.jsonl"},
                {"Key": "some/path/another_file.txt"}
            ]
        }
    ]
    mock_s3_client.get_paginator.return_value = mock_paginator
    jsonl_content = '{"key": "value1"}\n{"key": "value2"}'
    mock_s3_object_body = MagicMock()
    mock_s3_object_body.read.return_value = jsonl_content.encode('utf-8')
    mock_s3_client.get_object.return_value = {"Body": mock_s3_object_body}
    mocker.patch('boto3.client', return_value=mock_s3_client)
    service = BedrockAlertsService("test@example.com")
    results = service.find_results_file_in_s3("my-bucket", "some/path/")

    assert len(results) == 2
    assert results[0]['key'] == 'value1'

    mock_s3_client.get_object.assert_called_with(Bucket="my-bucket", Key="some/path/results_123_output.jsonl")


def test_find_results_file_in_s3_not_found(mocker):
    """
    Tests the case where no matching .jsonl file is found.
    """
    mock_s3_client = MagicMock()
    mock_paginator = MagicMock()
    mock_paginator.paginate.return_value = [
        {
            "Contents": [
                {"Key": "some/path/another_file.txt"}
            ]
        }
    ]
    mock_s3_client.get_paginator.return_value = mock_paginator
    mocker.patch('boto3.client', return_value=mock_s3_client)
    service = BedrockAlertsService("test@example.com")
    results = service.find_results_file_in_s3("my-bucket", "some/path/")
    mock_s3_client.get_object.assert_not_called()

    assert results is None
