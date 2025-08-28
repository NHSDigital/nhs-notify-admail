import boto3
import jsonlines
import os
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from botocore.exceptions import ClientError
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BedrockAlertsService:
    def __init__(
        self,
        job_id: str = None,
        status: str = None,
        sender_email: str = None,
        complete_template=None,
        failed_template=None,
    ):
        self.job_id = job_id
        self.status = status
        self.s3_uri = None
        self.bedrock = boto3.client("bedrock")
        self.ses = boto3.client("ses")
        self.sender_email = sender_email
        self.complete_template = complete_template
        self.failed_template = failed_template
        self.success_percentage = 0.0

    def get_evaluation_status(self):
        try:
            response = self.bedrock.get_evaluation_job(jobIdentifier=self.job_id)
            self.status = response["status"]
            return self.status
        except Exception as e:
            logger.error(
                f"Failed to get evaluation status for job {self.job_id}: {str(e)}"
            )
            raise

    def get_evaluation_results(self):
        try:
            response = self.bedrock.get_evaluation_job(jobIdentifier=self.job_id)
            self.s3_uri = response.get("outputDataConfig", {}).get("s3Uri", "N/A")
            return response
        except Exception as e:
            logger.error(
                f"Failed to get evaluation results for job {self.job_id}: {str(e)}"
            )
            raise

    def find_results_file_in_s3(self, bucket, prefix):
        s3_client = boto3.client('s3')
        try:
            print(f"Searching for files in bucket '{bucket}' with prefix '{prefix}'...")
            # Use a paginator for potentially large numbers of files
            paginator = s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=bucket, Prefix=prefix)
            for page in pages:
                if "Contents" in page:
                    for obj in page["Contents"]:
                        if obj['Key'].endswith('_output.jsonl'):
                            response = s3_client.get_object(Bucket=bucket, Key=obj['Key'])
                            file_content_string = response['Body'].read().decode('utf-8')
                            try:
                                file_like_object = io.StringIO(file_content_string)
                                with jsonlines.Reader(file_like_object) as reader:
                                    return [obj for obj in reader]
                            except Exception as e:
                                print("No matching file found.")
                                return None

        except ClientError as e:
            print(f"An AWS error occurred while listing objects: {e}")
            return None

    def calculate_rating_percentage_from_list(self, records_list: list) -> float:
        total_rating_score = 0
        rating_records_count = 0
        for record in records_list:
            try:
                scores = record.get('automatedEvaluationResult', {}).get('scores', [])
                for metric in scores:
                    if metric.get('metricName') == 'Rating':
                        total_rating_score += metric.get('result', 0.0)
                        rating_records_count += 1
                        break
            except TypeError:
                print(f"Warning: Skipping a record that is not in the expected format: {record}")
                continue

        if rating_records_count == 0:
            print("Warning: No 'Rating' metrics were found in the list.")
            return 0.0

        success_percentage = round((total_rating_score / rating_records_count) * 100)
        self.success_percentage = success_percentage
        return success_percentage


    def send_alert(self):
        try:
            subject = f"Bedrock Evaluation Job {self.status} Rating Alert: {self.success_percentage}"
            body = f"""
            Job ID: {self.job_id or 'N/A'}\n
            Status: {self.status or 'N/A'}\n
            Results Location: {self.s3_uri or 'N/A'}\n
            Alert Percentage: {self.success_percentage or 'N/A'}
            \n\nThis is an automated alert from Bedrock.\n"""
            msg = MIMEMultipart()
            msg["Subject"] = subject
            msg["From"] = self.sender_email
            msg["To"] = self.sender_email
            msg.attach(MIMEText(body, "plain"))

            response = self.ses.send_raw_email(
                Source=self.sender_email,
                Destinations=[self.sender_email],
                RawMessage={"Data": msg.as_string()},
            )
            logger.info(f"Raw alert email sent successfully for job {self.job_id}")
            return response
        except Exception as e:
            logger.error(
                f"Failed to send raw alert email for job {self.job_id}: {str(e)}"
            )
            raise
