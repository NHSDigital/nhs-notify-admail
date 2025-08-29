# src/backend/bedrock_alerts/tests/test_evaluations_alert_service.py
import pytest
import boto3
import jsonlines
import io
from moto import mock_aws
from bedrock_alerts.evaluations_alert_service import BedrockAlertsService

MOCK_RECORDS_LIST = [
    {
        "automatedEvaluationResult": {
            "scores": [{"metricName": "Rating", "result": 1.0}]
        }
    },
    {
        "automatedEvaluationResult": {
            "scores": [{"metricName": "Rating", "result": 0.0}]
        }
    },
    {
        "automatedEvaluationResult": {
            "scores": [{"metricName": "Rating", "result": 1.0}]
        }
    },
    {
        "automatedEvaluationResult": {
            "scores": [{"metricName": "SomeOtherMetric", "result": 0.5}]
        }
    },
]

@pytest.fixture
def aws_credentials():
    """Mocked AWS Credentials for moto."""
    return {
        "AWS_ACCESS_KEY_ID": "testing",
        "AWS_SECRET_ACCESS_KEY": "testing",
        "AWS_SECURITY_TOKEN": "testing",
        "AWS_SESSION_TOKEN": "testing"
    }

@pytest.fixture
def s3_client(aws_credentials):
    """Yields a mock S3 client."""
    with mock_aws():
        yield boto3.client("s3", region_name="eu-west-2")

@pytest.fixture
def ses_client(aws_credentials):
    """Yields a mock SES client."""
    with mock_aws():
        client = boto3.client("ses", region_name="eu-west-2")
        client.verify_email_identity(EmailAddress="test@example.com")
        yield client

@pytest.fixture
def service(s3_client, ses_client):
    """Yields a BedrockAlertsService instance with mocked clients."""
    return BedrockAlertsService(sender_email="test@example.com", s3_client=s3_client, ses_client=ses_client)

def test_find_results_file_in_s3(s3_client, service):
    """Tests that the service can correctly find and parse the results file from S3."""
    bucket_name = "nhs-dev1-notifyai-results"
    file_key = "results/some-job-id_output.jsonl"
    s3_client.create_bucket(
        Bucket=bucket_name,
        CreateBucketConfiguration={"LocationConstraint": "eu-west-2"}
    )
    string_io = io.StringIO()
    with jsonlines.Writer(string_io) as writer:
        writer.write_all(MOCK_RECORDS_LIST)
    file_content = string_io.getvalue()
    s3_client.put_object(Bucket=bucket_name, Key=file_key, Body=file_content.encode("utf-8"))

    result = service.find_results_file_in_s3(bucket_name, "results/")

    assert result is not None
    assert len(result) == len(MOCK_RECORDS_LIST)
    assert result[0] == MOCK_RECORDS_LIST[0]

def test_calculate_rating_percentage_from_list(service):
    """Tests the rating calculation logic with valid data."""
    percentage = service.calculate_rating_percentage_from_list(MOCK_RECORDS_LIST)
    assert percentage == 67.0

def test_calculate_rating_percentage_handles_empty_records(service):
    """Tests that the rating calculation logic handles empty and partial records gracefully."""
    assert service.calculate_rating_percentage_from_list([]) == 0.0
    assert service.calculate_rating_percentage_from_list([{"scores": []}]) == 0.0

def test_calculate_rating_percentage_handles_invalid_data_type(service):
    """Tests that the calculation logic correctly raises an AttributeError."""
    invalid_records = [None, "not_a_dict"]
    with pytest.raises(AttributeError, match="'NoneType' object has no attribute 'get'"):
        service.calculate_rating_percentage_from_list(invalid_records)

def test_calculate_rating_percentage_no_ratings(service):
    """Tests the case where no records have a 'Rating' metric."""
    records_without_rating = [
        {"automatedEvaluationResult": {"scores": [{"metricName": "SomeOtherMetric", "result": 0.5}]}},
        {"automatedEvaluationResult": {"scores": [{"metricName": "AnotherMetric", "result": 1.0}]}}
    ]
    percentage = service.calculate_rating_percentage_from_list(records_without_rating)
    assert percentage == 0.0

def test_send_alert(service, ses_client):
    """Tests that the send_alert method correctly calls the SES send_raw_email API."""
    service.success_percentage = 42.0
    response = service.send_alert()

    assert response is not None
    assert response['ResponseMetadata']['HTTPStatusCode'] == 200
    sent_messages = ses_client.get_send_statistics()['SendDataPoints']
    assert len(sent_messages) == 1
