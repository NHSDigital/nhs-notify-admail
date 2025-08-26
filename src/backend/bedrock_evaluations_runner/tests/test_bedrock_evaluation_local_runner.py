import os
import importlib
import logging
from unittest.mock import patch
from bedrock_evaluations_runner import bedrock_evaluation_local_runner


@patch.dict(
    os.environ,
    {
        "env_evaluator_model_identifier": "eval-model",
        "env_generator_model_identifier": "gen-model",
        "env_role_arn": "arn:aws:iam::123456789:role/test",
        "env_input_prompt_s3_uri": "s3://input",
        "env_results_s3_uri": "s3://output",
        "env_region": "eu-west-2",
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
