import json
import logging
from services.bedrock_service import BedrockService
from core import constants

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def lambda_handler(event, context):
    try:
        body_string = event.get("body", "{}")
        body_data = json.loads(body_string)
        input_letter = body_data.get("input_text")

        if not input_letter:
            logger.warning("Request received without 'input_text' in the body.")
            return {
                "statusCode": 400,
                "body": json.dumps({"error": constants.ERROR_NO_INPUT_TEXT}),
            }

        bedrock_service = BedrockService()
        return bedrock_service.call_admail_bedrock_prompt(input_letter)

    except json.JSONDecodeError:
        logger.error("Failed to decode JSON from request body.")
        return {
            "statusCode": 400,
            "body": json.dumps({"error": constants.ERROR_INVALID_JSON}),
        }
    except Exception as e:
        logger.exception(f"An unexpected error occurred: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": constants.ERROR_INTERNAL_SERVER}),
        }
