import os
import json
import jsonlines
import re
from pathlib import Path

import boto3
from dotenv import load_dotenv

load_dotenv()

"""
Letter converting tool to assist with the manual creation of the prompts.jsonl file.
Requires each letter to be available in an S3 bucket.  The folder path in S3 must
contain the actual class for each document.

For example:
- s3://$BUCKET/Advertising Mail/Digitrial Letter L48 - NOTIFY.pdf => ADVERTISING
- s3://$BUCKET/Business Mail/NHSBT_DSCMM2_Mailing_201023_Lee.pdf => BUSINESS
"""

INPUT_BUCKET = os.getenv("INPUT_BUCKET")
DATA_PATH = os.getenv("DATA_PATH")
MODEL = os.getenv("MODEL")
PROMPT= os.getenv("PROMPT")

assert INPUT_BUCKET
assert DATA_PATH
assert MODEL
assert PROMPT

with open(PROMPT, "r") as prompt_file:
    prompt_string = prompt_file.read()

S3 = boto3.client('s3')

documents = [
    obj['Key'] for obj in S3.list_objects_v2(Bucket=INPUT_BUCKET)['Contents']
    if obj['Key'].endswith(("docx","csv","html","txt","pdf","md"," oc","xlsx","xls"))
]

bedrock_list = []
for doc in documents:
    doc_path = Path(doc)
    format = doc_path.suffix[1:]

    if "advert" in str(doc_path.parent).lower():
        actual = 'ADVERTISING'
    elif 'bus' in str(doc_path.parent).lower():
        actual = 'BUSINESS'
    elif 'unsure' in str(doc_path.parent).lower():
        actualClass = 'UNSURE'

    bedrock_list.append({
        'recordId': doc,
        'actualClass': actual,
        'modelInput': {
            'system': prompt_string,
            'messages': [{
                'role': 'user',
                'content': [
                    { 'text': "Analyze the following letter:" },
                    { 'document': {
                        'format': format,
                        'name': 'the_letter',
                        'source': {
                            's3Location': {
                                "uri": f"s3://{INPUT_BUCKET}/{doc}",
                            }
                        }
                    }}
                ]
            }]
        }
    })

with jsonlines.open(DATA_PATH, mode="w") as writer:
    for obj in bedrock_list:
        writer.write(obj)

# Check the file is valid and can be read back
with open(DATA_PATH, 'r') as f:
    assert all(jsonlines.Reader(f).iter())

print(DATA_PATH, "written successfully")
