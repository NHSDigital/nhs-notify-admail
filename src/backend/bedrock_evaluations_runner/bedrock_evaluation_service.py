import boto3
import logging
import os
import io
import json
import jsonlines
import constants
from datetime import datetime
from urllib import parse as up

logger = logging.getLogger(__name__)


class BedrockEvaluator:
    def __init__(self, region: str, resource_prefix: str):
        if not all([region]):
            raise ValueError("Region, Role ARN and resource prefix must be provided.")

        self.region = region
        self.resource_prefix = resource_prefix
        self.bedrock_client = boto3.client("bedrock-runtime", region_name=self.region)
        logger.info("BedrockEvaluator initialized for region %s", self.region)
        self.s3_client = boto3.client('s3')

    def _get_admail_tool_config(self):
        return {
            "tools": [
                {
                    "toolSpec": {
                        "name": constants.TOOL_NAME,
                        "description": constants.TOOL_DESCRIPTION,
                        "inputSchema": {
                            "json": {
                                "type": "object",
                                "properties": {
                                    "description": {
                                        "type": "string",
                                        "description": "Brief description of the letter or mailing content.",
                                    },
                                    "rating": {
                                        "type": "string",
                                        "description": "The eligibility rating for AdMail, as defined by ourselves, use with our prompt",
                                        "enum": [
                                            constants.RATING_BUSINESS,
                                            constants.RATING_UNSURE,
                                            constants.RATING_ADVERTISING,
                                        ],
                                    },
                                    "reason": {
                                        "type": "string",
                                        "description": "Bullet pointed explaination of letter eligibility for Admail",
                                    },
                                    "advice": {
                                        "type": "string",
                                        "description": "Actionable bullet points to convert the letter to Admail, if applicable.",
                                    },
                                },
                                "required": [
                                    "description",
                                    "rating",
                                    "reason",
                                    "advice",
                                ],
                            }
                        },
                    }
                }
            ],
            "toolChoice": {"tool": {"name": constants.TOOL_NAME}},
        }

    def run_evaluation_job(
        self,
        generator_model: str,
        input_s3_uri: str,
        output_s3_uri: str,
    ) -> dict:
        job_name = f"{self.resource_prefix}-evaluation-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}"
        logger.info("Starting model evaluation job: %s", job_name)

        inference_config = {
            "temperature": float(os.environ.get("env_temperature", 0.1)),
            "topP": float(os.environ.get("env_top_p", 0.5)),
            "maxTokens": int(os.environ.get("env_max_tokens", 5000)),
        }

        try:
            s3_in_url = up.urlparse(input_s3_uri)
            prompt_response = self.s3_client.get_object(
                Bucket=s3_in_url.hostname,
                Key=s3_in_url.path[1:],
            )
            buffered_prompts = io.BytesIO(prompt_response['Body'].read())
            prompts = jsonlines.Reader(buffered_prompts).iter()
        except Exception as e:
            logger.error(f"Failed to load evaulation prompts from {s3_in_url}", e)
            raise

        try:
            responses = []
            for prompt in prompts:
                system_prompt = prompt['modelInput']['system'];
                messages = prompt['modelInput']['messages']

                response = self.bedrock_client.converse(
                    modelId=generator_model,
                    system=[{"text": system_prompt}],
                    messages=messages,
                    inferenceConfig=inference_config,
                    toolConfig=self._get_admail_tool_config(),
                )

                response_message = response["output"]["message"]
                response = next((
                    content
                    for content in response_message["content"]
                    if "toolUse" in content
                ))["toolUse"]["input"]

                # Add the actual correct class to the response for later scoring
                response['actualClass'] = prompt['actualClass']
                responses.append(response)

            assert responses, "No responses to write"

            output = io.BytesIO()
            jsonlines.Writer(output).write_all(responses)
            s3_out_uri = up.urlparse(output_s3_uri)

            return self.s3_client.put_object(
                Bucket=s3_out_uri.hostname,
                Key=s3_out_uri.path[1:],
                Body=output.getvalue(),
            )


        except Exception as e:
            logger.error("Failed to create Bedrock evaluation job: %s", e)
            raise
