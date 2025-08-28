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
    complete_template = os.environ["env_template_complete"]
    failed_template = os.environ["env_template_failed"]
    job_id =  "arn:aws:bedrock:eu-west-2:767397886959:evaluation-job/ueg98p1fytp3" # event["jobArn"]
    status =  "Complete" #event["status"]
    alerts = BedrockAlertsService(
        job_id, status, email_address, failed_template, complete_template,
    )
    try:
        print('Trying Print')
        # alerts.get_evaluation_results()
        print('sending alert')
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
