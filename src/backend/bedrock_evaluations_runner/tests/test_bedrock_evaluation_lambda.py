import os
import json
from unittest.mock import patch, MagicMock
from bedrock_evaluations_runner.bedrock_evaluation_lambda import lambda_handler


@patch.dict(
    os.environ,
    {
        "env_evaluator_model_identifier": "eval-model",
        "env_generator_model_identifier": "gen-model",
        "env_role_arn": "arn:aws:iam::123456789:role/test",
        "env_region": "eu-west-2",
        "env_input_prompt_s3_uri": "s3://input",
        "env_results_s3_uri": "s3://output",
    },
)
def test_lambda_handler_success():
    mock_evaluator = MagicMock()
    mock_evaluator.run_evaluation_job.return_value = {
        "jobName": "job",
        "jobArn": "arn",
        "consoleUrl": "url",
    }
    with patch(
        "bedrock_evaluations_runner.bedrock_evaluation_lambda.BedrockEvaluator", return_value=mock_evaluator
    ):
        event = {}
        context = {}
        response = lambda_handler(event, context)
        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["jobName"] == "job"
        assert body["jobArn"] == "arn"
        assert body["consoleUrl"] == "url"


@patch.dict(os.environ, {}, clear=True)
def test_lambda_handler_missing_env(monkeypatch):
    event = {}
    context = {}
    response = lambda_handler(event, context)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert "Missing environment variable" in body["error"]


@patch.dict(
    os.environ,
    {
        "env_evaluator_model_identifier": "eval-model",
        "env_generator_model_identifier": "gen-model",
        "env_role_arn": "arn:aws:iam::123456789:role/test",
        "env_region": "eu-west-2",
        "env_input_prompt_s3_uri": "s3://input",
        "env_results_s3_uri": "s3://output",
    },
)
def test_lambda_handler_internal_error():
    with patch(
        "bedrock_evaluations_runner.bedrock_evaluation_lambda.BedrockEvaluator", side_effect=Exception("fail")
    ):
        event = {}
        context = {}
        response = lambda_handler(event, context)
        assert response["statusCode"] == 500
        body = json.loads(response["body"])
        assert "internal error" in body["error"].lower()
