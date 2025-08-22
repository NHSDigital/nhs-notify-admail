import os
import json
import logging
from bedrock_evaluation_lambda import lambda_handler

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

from dotenv import load_dotenv

load_dotenv()

response = lambda_handler({}, {})

print(json.dumps(response, indent=2))
