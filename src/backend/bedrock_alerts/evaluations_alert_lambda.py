import json
from evaluations_alert_service import BedrockAlertsService
import os
import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def lambda_handler(event, context):
    email_address = os.environ["env_sender_email"]
    bucket = os.environ["env_results_bucket"]
    bucket_key = os.environ["env_results_bucket_key"]

    alerts = BedrockAlertsService(email_address)
    try:
        results = alerts.find_results_file_in_s3(bucket, bucket_key)
        rating_percentage = alerts.calculate_rating_percentage_from_list(results)
        if rating_percentage < 75.0:
            alerts.send_alert()
            logger.info(f"Alert sent successfully rating below 75 percent")
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Alert sent successfully',
                })
            }
        else:
            alerts.send_alert()
    except Exception as e:
        logger.error(f"Failed to send alert: {str(e)}")
        raise

    except Exception as e:
        logger.error(f"Error processing alert: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': f'Error processing alert: {str(e)}',
            })
        }
