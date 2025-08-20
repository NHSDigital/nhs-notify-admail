import boto3
from botocore.exceptions import ClientError
import json
import os
import logging
from typing import List, Dict

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

s3_client = boto3.client("s3")

BUCKET_NAME = os.getenv("S3_LLM_LOGS_BUCKET")
BUCKET_DIRECTORY = os.getenv("S3_LLM_LOGS_DIRECTORY")
BUCKET_ACCOUNT_ID = os.getenv("BUCKET_ACCOUNT_ID")

logger.info(f"S3 Bucket Name: {BUCKET_NAME}")
logger.info(f"S3 Bucket Directory: {BUCKET_DIRECTORY}")
logger.info(f"S3 Bucket Directory: {BUCKET_ACCOUNT_ID}")


async def fetch_s3_file_history() -> List[Dict]:

    paginator = s3_client.get_paginator("list_objects_v2")
    operation_params = {
        "Bucket": BUCKET_NAME,
        "Prefix": BUCKET_DIRECTORY,
        "ExpectedBucketOwner": BUCKET_ACCOUNT_ID,
    }

    try:
        files = []
        for page in paginator.paginate(**operation_params):
            logger.info(f"Received page with {len(page.get('Contents', []))} objects.")
            for obj in page.get("Contents", []):
                if not obj["Key"].endswith("/"):
                    files.append(
                        {
                            "name": obj["Key"],
                            "last_modified": obj["LastModified"],
                        }
                    )

        sorted_files = sorted(files, key=lambda x: x["last_modified"], reverse=True)

        logger.info(f"Successfully fetched and sorted {len(sorted_files)} files.")

        for file in sorted_files:
            file["last_modified"] = file["last_modified"].strftime("%Y-%m-%d %H:%M:%S")

        return sorted_files

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
