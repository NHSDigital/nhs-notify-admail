from datetime import datetime
import boto3
import json
import os


class BedrockConfig:
    def __init__(self):
        self.region = os.environ.get("env_region")
        self.model_id = os.environ.get("env_model_id")
        self.temperature = float(os.environ.get("env_temperature", 0.1))
        self.max_tokens = int(os.environ.get("env_max_tokens", 2000))
        self.top_p = float(os.environ.get("env_top_p", 0.8))
        self.logging_s3_bucket = os.environ.get("env_logging_s3_bucket")
        self.logging_s3_key_prefix = os.environ.get("env_logging_s3_key_prefix")


def call_admail_bedrock_prompt(event, context):
    """
    Invokes a Bedrock model using the Converse API to determine advise on Admail eligibility,
    Forces JSON output using the System prompt, in combination with a JSON returning "tool".
    """
    try:
        config = BedrockConfig()

        input_letter = event.get("body", "")
        if not input_letter:
            return {"statusCode": 400, "body": "Error: No input letter provided."}

        try:
            with open("system_prompt.txt", mode="r", encoding="utf-8") as prompt_file:
                system_prompt = prompt_file.read()
        except FileNotFoundError:
            return {"statusCode": 400, "body": "Error: System prompt file not found."}

        bedrock_runtime = boto3.client(
            service_name="bedrock-runtime", region_name=config.region
        )

        user_prompt = f"Analyze the following letter:{input_letter}"

        messages = [{"role": "user", "content": [{"text": user_prompt}]}]

        inference_config = {
            "temperature": config.temperature,
            "topP": config.top_p,
            "maxTokens": config.max_tokens,
        }

        response = bedrock_runtime.converse(
            modelId=config.model_id,
            system=[{"text": system_prompt}],
            messages=messages,
            inferenceConfig=inference_config,
            toolConfig=_get_admail_tool_config(),
        )

        return_value = format_converse_response(response)

        log_prompt_details_to_s3(
            config=config,
            prompt_input=user_prompt,
            prompt_output=return_value,
        )

        return return_value

    except Exception as e:
        error_message = f"Error invoking model: {e}"
        print(error_message)
        return {"statusCode": 500, "body": error_message}


def format_converse_response(response):
    """Formats the response from the Bedrock Converse API call."""
    response_message = response["output"]["message"]

    # If a tool was used with Converse API, this block extracts the tool use content block, which contains our JSON Output as per the tool definition
    tool_use_block = None
    for content_block in response_message["content"]:
        if "toolUse" in content_block:
            tool_use_block = content_block
            break

    if tool_use_block:
        # The tool ran, here we return the extracted JSON
        tool_input = tool_use_block["toolUse"]["input"]
        return_value = json.dumps(tool_input, indent=4)
    else:
        # Fallback for when the tool did not run, and we fallback to returning the raw prompt response.
        # Potential to simply fail the call here if we're not happy with this solution
        return_value = response_message["content"][0]["text"]

    return return_value


def _get_admail_tool_config():
    return {
        "tools": [
            {
                "toolSpec": {
                    "name": "admail_eligibility_analyzer",
                    "description": "Analyse a letter, and provide a description and reasoning about AdMail eligibility.",
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
                                    "enum": ["BUSINESS", "UNSURE", "ADVERTISING"],
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
        "toolChoice": {"tool": {"name": "admail_eligibility_analyzer"}},
    }


def log_prompt_details_to_s3(config, prompt_input, prompt_output):
    """Logs prompt details to an S3 bucket."""
    if not config.logging_s3_bucket or not config.logging_s3_key_prefix:
        print("S3 logging environment variables not set. Skipping log.")
        return

    s3_client = boto3.client("s3")
    date_time_now = datetime.now().strftime("%d-%m-%Y_%H:%M:%S")
    s3_key = f"{config.logging_s3_key_prefix}{date_time_now}.json"

    log_data = {
        "prompt_input": prompt_input,
        "prompt_output": prompt_output,
        "model": config.model_id,
        "inference_parameters": {
            "temperature": config.temperature,
            "top_p": config.top_p,
            "max_tokens": config.max_tokens,
        },
        "date_time": date_time_now,
    }

    try:
        s3_client.put_object(
            Bucket=config.logging_s3_bucket,
            Key=s3_key,
            Body=json.dumps(log_data, indent=4),
            ContentType="application/json",
        )
    except Exception as e:
        print(f"Error logging to S3: {e}")
