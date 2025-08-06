# pragma: no cover
import os


class BedrockConfig:
    def __init__(self):
        self.region = os.environ.get("env_region")
        self.model_id = os.environ.get("env_model_id")
        self.temperature = float(os.environ.get("env_temperature", 0.1))
        self.max_tokens = int(os.environ.get("env_max_tokens", 2000))
        self.top_p = float(os.environ.get("env_top_p", 0.5))
        self.logging_s3_bucket = os.environ.get("env_logging_s3_bucket")
        self.logging_s3_key_prefix = os.environ.get("env_logging_s3_key_prefix")
        self.guardrail = os.environ.get("env_guardrail_arn")
        self.guardrail_version = os.environ.get("env_guardrail_version")
