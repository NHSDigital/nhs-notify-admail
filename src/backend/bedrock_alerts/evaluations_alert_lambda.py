import json
from bedrock_alerts.evaluations_alert_service import BedrockAlertsService
import os
import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def lambda_handler(event, context):
    bucket = os.environ["env_results_bucket"]
    bucket_key = os.environ["env_results_bucket_key"]
    sns_topic_arn = os.environ["env_sns_topic_arn"]

    alerts = BedrockAlertsService()
    try:
        results = alerts.find_results_file_in_s3(bucket, bucket_key)
        rating_percentage = alerts.calculate_rating_percentage_from_list(results)
        if rating_percentage < 75.0:
            alerts.send_alert(sns_topic_arn)
            logger.info(f"Alert sent successfully rating below 75 percent")
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Alert sent successfully',
                })
            }
        else:
            return
    except Exception as e:
        logger.error(f"Failed to send alert: {str(e)}")
        raise
