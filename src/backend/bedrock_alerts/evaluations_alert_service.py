import boto3
import jsonlines
import logging
from botocore.exceptions import ClientError
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BedrockAlertsService:
    def __init__(self, sns_client=None, s3_client=None):
        self.sns = sns_client if sns_client is not None else boto3.client("sns")
        self.s3 = s3_client if s3_client is not None else boto3.client("s3")
        self.success_percentage = 0.0

    def find_results_file_in_s3(self, bucket, prefix):
        try:
            logger.info(f"Searching for files in bucket '{bucket}' with prefix '{prefix}'...")
            paginator = self.s3.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=bucket, Prefix=prefix)
            for page in pages:
                if "Contents" in page:
                    for obj in page["Contents"]:
                        if obj['Key'].endswith('_output.jsonl'):
                            response = self.s3.get_object(Bucket=bucket, Key=obj['Key'])
                            file_content_string = response['Body'].read().decode('utf-8')
                            try:
                                file_like_object = io.StringIO(file_content_string)
                                with jsonlines.Reader(file_like_object) as reader:
                                    logger.info(f"Using contents of {obj['Key']}...")
                                    return [obj for obj in reader]
                            except Exception as e:
                                print(f"Error occurred while reading the file: {e}")
                                return None

        except ClientError as e:
            print(f"An AWS error occurred while listing objects: {e}")
            return None

    def calculate_rating_percentage_from_list(self, records_list: list) -> float:
        total_rating_score = 0
        rating_records_count = 0
        for record in records_list:
            try:
                rating = record.get('rating')
                actual = record.get('actualClass')
                total_rating_score += 1 if rating == actual else 0
                rating_records_count += 1
            except TypeError:
                logger.warning(f"Skipping a record that is not in the expected format: {record}")
                continue

        if rating_records_count == 0:
            logger.warning("No 'Rating' metrics were found in the list.")
            return 0.0

        success_percentage = round((total_rating_score / rating_records_count) * 100)
        self.success_percentage = success_percentage
        return success_percentage


    def send_alert(self, topic_arn=None):
        try:
            subject = "Bedrock Model Evaluation Alert"
            message = f"Alert Percentage: {self.success_percentage or 'N/A'}\n\nThis alert is below the threshold, please review bedrock model evaluations performance.\n\nThis is an automated alert from Bedrock."
            response = self.sns.publish(TopicArn=topic_arn, Message=message, Subject=subject)
            print(f"Alert sent successfully with response: {response}")
            print("Message published")

            return response
        except Exception as e:
            logger.error(
                f"Failed to send alert: {str(e)}"
            )
            raise
