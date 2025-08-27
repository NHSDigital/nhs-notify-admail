import boto3
import json
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BedrockAlertsService:
    def __init__(
        self,
        job_id: str = None,
        status: str = None,
        s3_uri: str = None,
        sender_email: str = None,
        complete_template = None,
        failed_template = None,
    ):
        self.job_id = job_id
        self.status = status
        self.s3_uri = s3_uri
        self.bedrock = boto3.client("bedrock")
        self.ses = boto3.client("ses")
        self.sender_email = sender_email
        self.complete_template = complete_template
        self.failed_template = failed_template

    def get_evaluation_status(self):
        try:
            response = self.bedrock.get_evaluation_job(jobIdentifier=self.job_id)
            self.status = response["status"]
            return self.status
        except Exception as e:
            logger.error(f"Failed to get evaluation status for job {self.job_id}: {str(e)}")
            raise

    def get_evaluation_results(self):
        try:
            response = self.bedrock.get_evaluation_job(jobIdentifier=self.job_id)
            self.s3_uri = response.get("outputDataConfig", {}).get("s3Uri", "N/A")
            return self.s3_uri
        except Exception as e:
            logger.error(f"Failed to get evaluation results for job {self.job_id}: {str(e)}")
            raise

    def send_alert(self):
        try:
            template_name = self.complete_template if self.status == 'Complete' else self.failed_template
            email_template_response = self.ses.get_template(TemplateName=template_name)

            response = self.ses.send_templated_email(
                Source=self.sender_email,
                Destination={
                    "ToAddresses": [self.sender_email],
                    "CcAddresses": [],
                },
                ReplyToAddresses=[self.sender_email],
                Template=template_name,
                TemplateData=json.dumps({
                    "name": self.sender_email.split('@')[0],
                    "job_id": self.job_id,
                    "status": self.status,
                    "results_location": self.s3_uri
                })
            )
            logger.info(f"Alert sent successfully for job {self.job_id}")
            return {"status": self.status}
        except self.ses.exceptions.TemplateDoesNotExistException as e:
            logger.error(f"Email template {template_name} does not exist: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Failed to send alert for job {self.job_id}: {str(e)}")
            raise
        except Exception as e:
            print("Error sending email:", e)
            raise e
        return {"status": self.status}
