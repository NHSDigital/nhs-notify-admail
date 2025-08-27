import boto3
import json
from evaluations_alert_service import BedrockAlertsService
import os
import time
import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def lambda_handler(event, context):
    email_address = os.environ["env_sender_email"]
    complete_template = os.environ["env_template_complete"]
    failed_template = os.environ["env_template_failed"]
    job_id = event["job_id"]
    event_status = event["status"]
    s3_uri = event["s3Uri"]

    alerts = BedrockAlertsService(
        job_id, event_status, s3_uri, email_address, failed_template, complete_template
    )

    max_wait_seconds = 10800  # 3 hours
    wait_interval = 600  # 10 minutes
    elapsed_time = 0

    job_finished = False
    while not job_finished:
        if alerts.status not in ['Complete', 'Failed']:
            if elapsed_time >= max_wait_seconds:
                logger.error(f"Job {job_id} timed out after {max_wait_seconds/3600} hours")
                return {
                    'statusCode': 408,
                    'body': json.dumps({
                        'message': f'Job timed out after {max_wait_seconds/3600} hours',
                        'job_id': job_id
                    })
                }

            logger.info(f"Job {job_id} still in progress. Status: {alerts.status}")
            time.sleep(wait_interval)
            alerts.get_evaluation_status()
            elapsed_time += wait_interval
        else:
            job_finished = True
            logger.info(f"Job {job_id} finished with status: {alerts.status}")
            eval_results = alerts.get_evaluation_results()
            logger.info(eval_results)

    try:
        alerts.send_alert()
        logger.info(f"Alert sent successfully for job {job_id}")
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Alert sent successfully',
                'job_id': job_id,
                'status': alerts.status
            })
        }
    except Exception as e:
        logger.error(f"Failed to send alert for job {job_id}: {str(e)}")
        raise

    except Exception as e:
        logger.error(f"Error processing job: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': f'Error processing job: {str(e)}',
                'job_id': job_id if 'job_id' in locals() else 'unknown'
            })
        }
