import os
import json
import logging
from datetime import datetime
from bedrock_evaluation_service import BedrockEvaluator

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def lambda_handler(event, context):
    try:
        generator_model = os.environ["env_generator_model_identifier"]
        aws_region = os.environ["env_region"]
        input_s3_uri = os.environ["env_input_prompt_s3_uri"]
        output_s3_uri = os.environ["env_results_s3_uri"]
        resource_prefix = os.environ["env_resource_prefix"]

        evaluator = BedrockEvaluator(
            region=aws_region,
            resource_prefix=resource_prefix,
        )

        result = evaluator.run_evaluation_job(
            generator_model=generator_model,
            input_s3_uri=input_s3_uri,
            output_s3_uri=output_s3_uri,
        )
        return {"statusCode": 200, "body": json.dumps(result)}

    except KeyError as e:
        logger.error("Missing environment variable: %s", e)
        return {
            "statusCode": 400,
            "body": json.dumps(
                {"error": f"Configuration error: Missing environment variable {e}"}
            ),
        }
    except Exception as e:
        logger.error("An unexpected error occurred: %s", e)
        return {
            "statusCode": 500,
            "body": json.dumps(
                {"error": "An internal error occurred. Check logs for details."}
            ),
        }
