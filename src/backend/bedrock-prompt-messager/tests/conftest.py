import pytest


@pytest.fixture(autouse=True)
def set_env_vars(monkeypatch):
    monkeypatch.setenv("env_region", "eu-west-2")
    monkeypatch.setenv("env_model_id", "test-model")
    monkeypatch.setenv("env_temperature", "0.2")
    monkeypatch.setenv("env_max_tokens", "1000")
    monkeypatch.setenv("env_top_p", "0.7")
    monkeypatch.setenv("env_logging_s3_bucket", "test-bucket")
    monkeypatch.setenv("env_logging_s3_key_prefix", "logs/")
    monkeypatch.setenv("env_guardrail_arn", "test-arn")
    monkeypatch.setenv("env_guardrail_version", "1")
