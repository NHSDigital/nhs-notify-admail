import json
from unittest.mock import patch
from main import lambda_handler
from core import constants


def test_lambda_handler_missing_input_text():
    event = {"body": json.dumps({})}
    context = {}
    result = lambda_handler(event, context)
    assert result["statusCode"] == 400
    assert constants.ERROR_NO_INPUT_TEXT in result["body"]


def test_lambda_handler_no_body():
    event = {}
    context = {}
    response = lambda_handler(event, context)
    assert response["statusCode"] == 400
    assert "Request body must be a valid JSON object" in response["body"]


def test_lambda_handler_invalid_json():
    event = {"body": "not a json"}
    context = {}
    result = lambda_handler(event, context)
    assert result["statusCode"] == 400
    assert constants.ERROR_INVALID_JSON in result["body"]


@patch("main.BedrockService")
def test_lambda_handler_success(MockBedrockService):
    mock_service_instance = MockBedrockService.return_value
    mock_service_instance.call_admail_bedrock_prompt.return_value = {
        "statusCode": 200,
        "body": json.dumps({"description": "desc"}),
    }

    event = {"body": json.dumps({"input_text": "test letter"})}
    context = {}
    result = lambda_handler(event, context)

    assert result["statusCode"] == 200
    assert "description" in result["body"]
    MockBedrockService.assert_called_once()
    mock_service_instance.call_admail_bedrock_prompt.assert_called_once_with(
        "test letter"
    )


@patch("main.BedrockService")
def test_lambda_handler_service_exception(MockBedrockService):
    mock_service_instance = MockBedrockService.return_value
    mock_service_instance.call_admail_bedrock_prompt.side_effect = Exception(
        "Service Error"
    )

    event = {"body": json.dumps({"input_text": "test letter"})}
    context = {}
    result = lambda_handler(event, context)

    assert result["statusCode"] == 500
    assert constants.ERROR_INTERNAL_SERVER in result["body"]
    MockBedrockService.assert_called_once()
