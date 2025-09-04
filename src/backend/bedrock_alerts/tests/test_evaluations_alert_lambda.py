import pytest
from unittest.mock import MagicMock, patch
import sys
import os
from bedrock_alerts.evaluations_alert_lambda import lambda_handler


@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    monkeypatch.setenv("env_sender_email", "test@example.com")
    monkeypatch.setenv("env_results_bucket", "my-test-bucket")
    monkeypatch.setenv("env_results_bucket_key", "my-test-key/")

@pytest.fixture
def mock_bedrock_service(mocker):
    """Mocks the BedrockAlertsService and its methods."""
    mock_service_instance = MagicMock()
    mocker.patch(
        'bedrock_alerts.evaluations_alert_lambda.BedrockAlertsService',
        return_value=mock_service_instance
    )
    return mock_service_instance

def test_lambda_handler_sends_alert_when_rating_is_low(mock_bedrock_service):
    """
    Tests that an alert is sent when the rating percentage is below the 75% threshold.
    """
    mock_bedrock_service.find_results_file_in_s3.return_value = [{"some": "data"}]
    mock_bedrock_service.calculate_rating_percentage_from_list.return_value = 50.0 # Low rating
    response = lambda_handler({}, None)
    mock_bedrock_service.find_results_file_in_s3.assert_called_with("my-test-bucket", "my-test-key/")
    mock_bedrock_service.send_alert.assert_called_once()

    assert response['statusCode'] == 200
    assert 'Alert sent successfully' in response['body']

def test_lambda_handler_no_alert_when_rating_is_high(mock_bedrock_service):
    """
    Tests that no alert is sent when the rating percentage is 75% or higher.
    """
    mock_bedrock_service.find_results_file_in_s3.return_value = [{"some": "data"}]
    mock_bedrock_service.calculate_rating_percentage_from_list.return_value = 85.0 # High rating
    response = lambda_handler({}, None)
    mock_bedrock_service.find_results_file_in_s3.assert_called_once()
    mock_bedrock_service.send_alert.assert_not_called()

    assert response is None

def test_lambda_handler_handles_exception(mock_bedrock_service):
    """
    Tests that the lambda handler raises an exception when the service fails.
    """
    mock_bedrock_service.find_results_file_in_s3.side_effect = Exception("S3 bucket not found")
    with pytest.raises(Exception, match="S3 bucket not found"):
        lambda_handler({}, None)
    mock_bedrock_service.send_alert.assert_not_called()
