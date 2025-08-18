import boto3
from botocore.exceptions import ClientError
from datetime import datetime
import os

s3_client = boto3.client("s3")

BUCKET_NAME = os.getenv("S3_LLM_LOGS_BUCKET")
BUCKET_DIRECTORY = os.getenv("S3_LLM_LOGS_DIRECTORY")


async def fetch_s3_file_history(batch: int, start_after: str = None):
    paginator = s3_client.get_paginator("list_objects_v2")
    operation_params = {
        "Bucket": BUCKET_NAME,
        "MaxKeys": batch,
        "Prefix": BUCKET_DIRECTORY,
    }
    if start_after:
        operation_params["StartAfter"] = start_after

    page_iterator = paginator.paginate(**operation_params)
    files = []

    for page in page_iterator:
        for obj in page.get("Contents", []):
            files.append(
                {
                    "name": obj["Key"],
                    "last_modified": obj["LastModified"].strftime("%Y-%m-%d %H:%M:%S"),
                }
            )
        break  # Only fetch one page at a time

    return files


async def generate_presigned_url(file_name: str):
    try:
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": f"{BUCKET_DIRECTORY}{file_name}"},
            ExpiresIn=3600,
        )
        return url
    except ClientError as e:
        raise Exception(f"Error generating presigned URL: {str(e)}")
