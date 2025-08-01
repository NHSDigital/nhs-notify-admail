import os
import json
from unittest import skip
import pytest
from unittest.mock import patch, MagicMock, mock_open
from bedrock_messager import BedrockConfig, call_admail_bedrock_prompt, _get_admail_tool_config, log_prompt_details_to_s3, format_converse_response

@pytest.fixture(autouse=True)
def set_env_vars(monkeypatch):
    monkeypatch.setenv("env_region", "us-east-1")
    monkeypatch.setenv("env_model_id", "test-model")
    monkeypatch.setenv("env_temperature", "0.2")
    monkeypatch.setenv("env_max_tokens", "1000")
    monkeypatch.setenv("env_top_p", "0.7")
    monkeypatch.setenv("env_logging_s3_bucket", "test-bucket")
    monkeypatch.setenv("env_logging_s3_key_prefix", "logs/")
    monkeypatch.setenv("env_guardrail_arn", "test-arn")
    monkeypatch.setenv("env_guardrail_version", "1")

def test_bedrock_config_reads_env_vars():
    config = BedrockConfig()
    assert config.region == "us-east-1"
    assert config.model_id == "test-model"
    assert config.temperature == 0.2
    assert config.max_tokens == 1000
    assert config.top_p == 0.7
    assert config.logging_s3_bucket == "test-bucket"
    assert config.logging_s3_key_prefix == "logs/"
    assert config.guardrail == "test-arn"
    assert config.guardrail_version == "1"

def test_call_admail_bedrock_prompt_missing_input_text():
    event = {"body": json.dumps({})}
    context = {}
    result = call_admail_bedrock_prompt(event, context)
    assert result["statusCode"] == 400
    assert "input_text" in result["body"]

def test_call_admail_bedrock_prompt_invalid_json():
    event = {"body": "not a json"}
    context = {}
    result = call_admail_bedrock_prompt(event, context)
    assert result["statusCode"] == 400

@patch("builtins.open", side_effect=FileNotFoundError)
def test_call_admail_bedrock_prompt_missing_system_prompt(mock_open_file):
    event = {"body": json.dumps({"input_text": "test letter"})}
    context = {}
    result = call_admail_bedrock_prompt(event, context)
    assert result["statusCode"] == 400
    assert "System prompt file not found" in result["body"]

@patch("builtins.open", new_callable=mock_open, read_data="system prompt")
@patch("boto3.client")
@patch("bedrock_messager.log_prompt_details_to_s3")
def test_call_admail_bedrock_prompt_success(mock_log, mock_boto_client, mock_open_file):
    mock_bedrock = MagicMock()
    mock_bedrock.converse.return_value = {
        "output": {
            "message": {
                "content": [
                    {
                        "toolUse": {
                            "input": {
                                "description": "desc",
                                "rating": "BUSINESS",
                                "reason": "reason",
                                "advice": "advice"
                            }
                        }
                    }
                ]
            }
        }
    }
    mock_boto_client.return_value = mock_bedrock
    event = {"body": json.dumps({"input_text": "test letter"})}
    context = {}
    result = call_admail_bedrock_prompt(event, context)
    assert result["statusCode"] == 200
    assert "description" in result["body"]
    assert mock_log.called


def test_format_converse_response_tool_used():
    response = {
        "output": {
            "message": {
                "content": [
                    {
                        "toolUse": {
                            "input": {
                                "description": "desc",
                                "rating": "BUSINESS",
                                "reason": "reason",
                                "advice": "advice"
                            }
                        }
                    }
                ]
            }
        }
    }
    formatted = format_converse_response(response)
    assert "description" in formatted
    assert "BUSINESS" in formatted


def test_format_converse_response_no_tool():
    response = {
        "output": {
            "message": {
                "content": [
                    {"text": "fallback response"}
                ]
            }
        }
    }
    formatted = format_converse_response(response)
    assert isinstance(formatted, str)
    assert formatted == "fallback response"

def test_get_admail_tool_config_structure():
    config = _get_admail_tool_config()
    assert "tools" in config
    assert config["tools"][0]["toolSpec"]["name"] == "admail_eligibility_analyzer"
    assert "toolChoice" in config

@patch("boto3.client")
def test_log_prompt_details_to_s3_success(mock_boto_client):
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3
    config = BedrockConfig()
    log_prompt_details_to_s3(
        config=config,
        promptinput="input",
        promptoutput="output"
    )
    assert mock_s3.put_object.called

def test_log_prompt_details_to_s3_missing_env(capfd):
    config = BedrockConfig()
    config.logging_s3_bucket = None
    config.logging_s3_key_prefix = None
    log_prompt_details_to_s3(
        config=config,
        promptinput="input",
        promptoutput="output"
    )
    out, _ = capfd.readouterr()
    assert "S3 logging environment variables not set" in out
