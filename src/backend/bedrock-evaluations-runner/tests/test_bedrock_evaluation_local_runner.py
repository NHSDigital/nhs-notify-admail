import os
import importlib
import logging
from unittest.mock import patch
import bedrock_evaluation_local_runner


@patch.dict(
    os.environ,
    {
        "EVALUATOR_MODEL_IDENTIFIER": "eval-model",
        "INFERENCE_MODEL_IDENTIFIER": "gen-model",
        "ROLE_ARN": "arn:aws:iam::123456789:role/test",
        "INPUT_PROMPT_S3_URI": "s3://input",
        "RESULTS_S3_URI": "s3://output",
        "AWS_REGION": "eu-west-2",
    },
)
@patch("boto3.client")
def test_bedrock_evaluation_local_main(mock_boto_client, caplog):
    caplog.set_level(logging.INFO)

    mock_boto_client.return_value.create_evaluation_job.return_value = {
        "jobArn": "test-arn"
    }

    importlib.reload(bedrock_evaluation_local_runner)

    assert mock_boto_client.return_value.create_evaluation_job.called

    assert "BedrockEvaluator initialized for region eu-west-2" in caplog.text
    assert "Starting model evaluation job" in caplog.text
    assert "Successfully created model evaluation job" in caplog.text
    assert "View progress here" in caplog.text
