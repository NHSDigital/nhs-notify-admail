import boto3
from botocore.exceptions import ClientError
import json
import os
import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

s3_client = boto3.client("s3")

BUCKET_NAME = os.getenv("S3_LLM_LOGS_BUCKET")
BUCKET_DIRECTORY = os.getenv("S3_LLM_LOGS_DIRECTORY")

logger.info(f"S3 Bucket Name: {BUCKET_NAME}")
logger.info(f"S3 Bucket Directory: {BUCKET_DIRECTORY}")


async def fetch_s3_file_history(batch: int, start_after: str = None):
    logger.info(
        f"Fetching S3 file history with batch size: {batch} and start_after: {start_after}"
    )

    paginator = s3_client.get_paginator("list_objects_v2")
    operation_params = {
        "Bucket": BUCKET_NAME,
        "MaxKeys": batch,
        "Prefix": BUCKET_DIRECTORY,
    }
    if start_after:
        operation_params["StartAfter"] = start_after

    try:
        page_iterator = paginator.paginate(**operation_params)
        files = []

        for page in page_iterator:
            logger.info(f"Received page with {len(page.get('Contents', []))} objects.")
            for obj in page.get("Contents", []):
                if not obj["Key"].endswith("/"):
                    files.append(
                        {
                            "name": obj["Key"],
                            "last_modified": obj["LastModified"].strftime(
                                "%Y-%m-%d %H:%M:%S"
                            ),
                        }
                    )
            break  # Only fetch one page at a time

        logger.info(f"Successfully fetched {len(files)} files.")
        return files

    except ClientError as e:
        logger.error(
            f"AWS ClientError fetching file history: {e.response['Error']['Message']}"
        )
        raise Exception(f"Error fetching S3 file history: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error fetching file history: {str(e)}")
        raise Exception(f"Error fetching S3 file history: {str(e)}")


async def get_s3_file_content(file_name: str):
    logger.info(f"Attempting to fetch file content for key: {file_name}")

    try:
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=file_name)
        file_content = response["Body"].read().decode("utf-8")
        json_content = json.loads(file_content)

        logger.info(f"Successfully fetched and parsed content for file: {file_name}")
        return json_content

    except ClientError as e:
        logger.error(
            f"AWS ClientError fetching file content: {e.response['Error']['Message']}"
        )
        raise Exception(f"Error fetching S3 file content: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error fetching file content: {str(e)}")
        raise Exception(f"Error fetching S3 file content: {str(e)}")
