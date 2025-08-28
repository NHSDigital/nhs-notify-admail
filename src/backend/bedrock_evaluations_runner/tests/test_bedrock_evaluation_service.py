import os
import sys
import pytest
from unittest.mock import patch, MagicMock

# Add the parent directory to the system path to allow for absolute imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from bedrock_evaluation_service import BedrockEvaluator


@pytest.fixture
def mock_boto_client():
    with patch("boto3.client") as mock_client:
        yield mock_client


def test_bedrock_evaluator_init_success(mock_boto_client):
    evaluator = BedrockEvaluator(
        region="eu-west-2",
        role_arn="arn:aws:iam::123456789:role/test",
        resource_prefix="test-prefix",
    )
    assert evaluator.region == "eu-west-2"
    assert evaluator.role_arn == "arn:aws:iam::123456789:role/test"
    assert evaluator.bedrock_client == mock_boto_client.return_value


def test_bedrock_evaluator_init_missing_args():
    with pytest.raises(ValueError):
        BedrockEvaluator(region=None, role_arn=None, resource_prefix="test-prefix")


def test_run_evaluation_job_success(mock_boto_client):
    mock_client_instance = mock_boto_client.return_value
    mock_client_instance.create_evaluation_job.return_value = {"jobArn": "test-arn"}
    evaluator = BedrockEvaluator(
        region="eu-west-2",
        role_arn="arn:aws:iam::123456789:role/test",
        resource_prefix="test-prefix",
    )
    result = evaluator.run_evaluation_job(
        evaluator_model="eval-model",
        generator_model="gen-model",
        input_s3_uri="s3://input",
        output_s3_uri="s3://output",
    )
    assert "jobName" in result
    assert "jobArn" in result
    assert "consoleUrl" in result
    assert result["jobArn"] == "test-arn"
    mock_client_instance.create_evaluation_job.assert_called_once()


def test_run_evaluation_job_failure(mock_boto_client):
    mock_client_instance = mock_boto_client.return_value
    mock_client_instance.create_evaluation_job.side_effect = Exception("fail")
    evaluator = BedrockEvaluator(
        region="eu-west-2",
        role_arn="arn:aws:iam::123456789:role/test",
        resource_prefix="test-prefix",
    )
    with pytest.raises(Exception):
        evaluator.run_evaluation_job(
            evaluator_model="eval-model",
            generator_model="gen-model",
            input_s3_uri="s3://input",
            output_s3_uri="s3://output",
        )
