import os
import json
import logging
from evaluations_alert_lambda import lambda_handler
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv()

response = lambda_handler({}, {})

print(json.dumps(response, indent=2))
