import pytest
from unittest.mock import patch, MagicMock, mock_open
from services.bedrock_service import BedrockService
from core import constants


@pytest.fixture
def bedrock_service():
    return BedrockService()


def test_format_converse_response_tool_used(bedrock_service):
    response = {
        "output": {
            "message": {
                "content": [
                    {
                        "toolUse": {
                            "input": {
                                "description": "desc",
                                "rating": constants.RATING_BUSINESS,
                                "reason": "reason",
                                "advice": "advice",
                            }
                        }
                    }
                ]
            }
        }
    }
    formatted = bedrock_service.format_converse_response(response)
    assert "description" in formatted
    assert constants.RATING_BUSINESS in formatted


def test_format_converse_response_no_tool(bedrock_service):
    response = {"output": {"message": {"content": [{"text": "fallback response"}]}}}
    formatted = bedrock_service.format_converse_response(response)
    assert isinstance(formatted, str)
    assert formatted == "fallback response"


def test_get_admail_tool_config_structure(bedrock_service):
    config = bedrock_service._get_admail_tool_config()
    assert "tools" in config
    assert config["tools"][0]["toolSpec"]["name"] == constants.TOOL_NAME
    assert "toolChoice" in config


@patch("boto3.client")
def test_log_prompt_details_to_s3_success(mock_boto_client, bedrock_service):
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3
    bedrock_service.log_prompt_details_to_s3(
        promptinput="input", promptoutput="output", guardrail_assessment={}
    )
    assert mock_s3.put_object.called


def test_log_prompt_details_to_s3_missing_env(capfd, bedrock_service):
    bedrock_service.config.logging_s3_bucket = None
    bedrock_service.config.logging_s3_key_prefix = None
    bedrock_service.log_prompt_details_to_s3(
        promptinput="input", promptoutput="output", guardrail_assessment={}
    )
    out, _ = capfd.readouterr()
    assert constants.ERROR_S3_LOGGING_NOT_CONFIGURED in out


@patch("builtins.open", side_effect=FileNotFoundError)
def test_call_admail_bedrock_prompt_missing_system_prompt(
    mock_open_file, bedrock_service
):
    result = bedrock_service.call_admail_bedrock_prompt("test letter")
    assert result["statusCode"] == 400
    assert constants.ERROR_SYSTEM_PROMPT_NOT_FOUND in result["body"]


@patch("builtins.open", new_callable=mock_open, read_data="system prompt")
@patch("boto3.client")
def test_call_admail_bedrock_prompt_success(
    mock_boto_client, mock_open_file, bedrock_service
):
    mock_bedrock = MagicMock()
    mock_bedrock.converse.return_value = {
        "output": {
            "message": {
                "content": [
                    {
                        "toolUse": {
                            "input": {
                                "description": "desc",
                                "rating": constants.RATING_BUSINESS,
                                "reason": "reason",
                                "advice": "advice",
                            }
                        }
                    }
                ]
            }
        }
    }
    mock_bedrock.apply_guardrail.return_value = {}
    mock_boto_client.return_value = mock_bedrock

    with patch.object(bedrock_service, "log_prompt_details_to_s3") as mock_log:
        result = bedrock_service.call_admail_bedrock_prompt("test letter")
        assert result["statusCode"] == 200
        assert "description" in result["body"]
        mock_log.assert_called_once()
