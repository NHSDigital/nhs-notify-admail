from datetime import datetime
import base64
import boto3
import json
import re
from core.config import BedrockConfig
from core import constants

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Content-Type": "application/json",
}

DATA_URL_PATTERN = re.compile(r'data\:([^;]+);base64,(.*)')

class BedrockService:
    def __init__(self):
        self.config = BedrockConfig()
        self.bedrock_runtime = boto3.client(
            service_name="bedrock-runtime", region_name=self.config.region
        )

    def call_admail_bedrock_prompt(self, input_letter, file_name):
        try:
            with open("system_prompt.txt", mode="r", encoding="utf-8") as prompt_file:
                system_prompt = prompt_file.read()
        except FileNotFoundError:
            return {"statusCode": 400, "body": constants.ERROR_SYSTEM_PROMPT_NOT_FOUND}

        try:
            mime, b64_bytes = DATA_URL_PATTERN.match(input_letter).groups()
        except AttributeError:
            return {"statusCode": 400, "body": "Invalid data url passed to bedrock service"}

        format = None
        if mime == 'application/pdf':
            format = 'pdf'
        elif mime == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            format = 'docx'
        elif mime == 'text/plain':
            format = 'txt'

        if not format:
            return {"statusCode": 400, "body": f"Unknown document format for mime type: {mime}"}

        user_prompt = "Analyze the following letter:"
        

        guardrail_assessment = self.bedrock_runtime.apply_guardrail(
            guardrailIdentifier=self.config.guardrail,
            guardrailVersion=self.config.guardrail_version,
            source="INPUT",
            content=[{"text": {"text": user_prompt}}],
        )

        messages = [
            { 
                'role': 'user', 
                'content': [
                    { 'text': user_prompt },
                    { 'document': { 
                        'format': format,
                        'name': 'the_letter',
                        'source': {
                            'bytes': base64.b64decode(b64_bytes)
                        }
                    }}
                ]
            }
        ]

        inference_config = {
            "temperature": self.config.temperature,
            "topP": self.config.top_p,
            "maxTokens": self.config.max_tokens,
        }

        response = self.bedrock_runtime.converse(
            modelId=self.config.model_id,
            system=[{"text": system_prompt}],
            messages=messages,
            inferenceConfig=inference_config,
            toolConfig=self._get_admail_tool_config(),
        )

        formatted_response = self.format_converse_response(response)
        api_gateway_response = {
            "statusCode": 200,
            "body": formatted_response,
            "headers": CORS_HEADERS,
        }
        self.log_prompt_details_to_s3(
            promptinput=user_prompt,
            promptoutput=api_gateway_response,
            guardrail_assessment=guardrail_assessment,
            filename=file_name,
        )
        return api_gateway_response

    def format_converse_response(self, response):
        response_message = response["output"]["message"]

        tool_use_block = next(
            (
                content
                for content in response_message["content"]
                if "toolUse" in content
            ),
            None,
        )

        if tool_use_block:
            tool_input = tool_use_block["toolUse"]["input"]
            formatted_content = json.dumps(tool_input, indent=4)
        else:
            formatted_content = response_message["content"][0]["text"]

        return formatted_content

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

    def log_prompt_details_to_s3(
        self, promptinput, promptoutput, guardrail_assessment, filename
    ):
        if not self.config.logging_s3_bucket or not self.config.logging_s3_key_prefix or not self.config.logging_s3_account_id:
            print(constants.ERROR_S3_LOGGING_NOT_CONFIGURED)
            return

        s3_client = boto3.client("s3")
        date_time_now = datetime.now().strftime("%d-%m-%Y_%H:%M:%S")
        s3_key = (
            f"{self.config.logging_s3_key_prefix}{date_time_now}|~{filename}|~.json"
        )

        log_data = {
            "prompt_input": promptinput,
            "prompt_output": promptoutput,
            "guardrail_assessment": guardrail_assessment,
            "model": self.config.model_id,
            "inference_parameters": {
                "temperature": self.config.temperature,
                "top_p": self.config.top_p,
                "max_tokens": self.config.max_tokens,
            },
            "date_time": date_time_now,
        }

        try:
            s3_client.put_object(
                Bucket=self.config.logging_s3_bucket,
                Key=s3_key,
                Body=json.dumps(log_data, indent=4),
                ContentType="application/json",
                ExpectedBucketOwner=self.config.logging_s3_account_id,
            )
        except Exception as e:
            print(f"Error logging to S3: {e}")
