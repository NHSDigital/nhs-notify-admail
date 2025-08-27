import boto3
import os
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class BedrockEvaluator:
    def __init__(self, region: str, role_arn: str, alert_lambda: str):
        if not all([region, role_arn, alert_lambda]):
            raise ValueError("Region and Role ARN must be provided.")

        self.region = region
        self.role_arn = role_arn
        self.bedrock_client = boto3.client("bedrock", region_name=self.region)
        self.alert_lambda = alert_lambda
        logger.info("BedrockEvaluator initialized for region %s", self.region)

    def run_evaluation_job(
        self,
        evaluator_model: str,
        generator_model: str,
        input_s3_uri: str,
        output_s3_uri: str,
    ) -> dict:
        job_name = f"model-evaluation-custom-metrics-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}"
        logger.info("Starting model evaluation job: %s", job_name)

        rating_metric = {
            "customMetricDefinition": {
                "name": "Rating",
                "instructions": """
        If the 'Rating' value in the {{prediction}} matches the 'Rating' value in the {{ground_truth}} return 1 else return 0.""",
                "ratingScale": [
                    {
                        "definition": "The 'Rating' value in the prediction matches the 'Rating' value in the ground truth",
                        "value": {"floatValue": 1},
                    },
                    {
                        "definition": "The 'Rating' value in the prediction does not match the 'Rating' value in the ground truth",
                        "value": {"floatValue": 0},
                    },
                ],
            }
        }

        try:
            response = self.bedrock_client.create_evaluation_job(
                jobName=job_name,
                jobDescription="Evaluate model performance with a custom Rating metric",
                roleArn=self.role_arn,
                applicationType="ModelEvaluation",
                inferenceConfig={
                    "models": [{"bedrockModel": {"modelIdentifier": generator_model}}]
                },
                outputDataConfig={"s3Uri": output_s3_uri},
                evaluationConfig={
                    "automated": {
                        "datasetMetricConfigs": [
                            {
                                "taskType": "General",
                                "dataset": {
                                    "name": "ModelEvalDataset",
                                    "datasetLocation": {"s3Uri": input_s3_uri},
                                },
                                "metricNames": [
                                    "Builtin.Correctness",
                                    "Builtin.Completeness",
                                    "Builtin.Faithfulness",
                                    "Builtin.Helpfulness",
                                    "Builtin.Coherence",
                                    "Builtin.Relevance",
                                    "Builtin.FollowingInstructions",
                                    "Builtin.ProfessionalStyleAndTone",
                                    "Builtin.Harmfulness",
                                    "Builtin.Stereotyping",
                                    "Builtin.Refusal",
                                    "Rating",
                                ],
                            }
                        ],
                        "customMetricConfig": {
                            "customMetrics": [rating_metric],
                            "evaluatorModelConfig": {
                                "bedrockEvaluatorModels": [
                                    {"modelIdentifier": evaluator_model}
                                ]
                            },
                        },
                        "evaluatorModelConfig": {
                            "bedrockEvaluatorModels": [
                                {"modelIdentifier": evaluator_model}
                            ]
                        },
                    }
                },
            )
            console_url = f"https://{self.region}.console.aws.amazon.com/bedrock/home?region={self.region}#/eval/model-evaluation/report?job={job_name}&jobIdentifier={job_arn}"
            result = {"jobName": job_name, "jobArn": job_arn, "consoleUrl": console_url}
            logger.info("Successfully created model evaluation job: %s", job_name)
            logger.info("View progress here: %s", console_url)
            # trigger alert lambda
            job_arn = response["jobArn"]
            status = response["status"]
            payload = {
                'job_id': response.get('jobArn', ''),
                'status': response.get('status', ''),
                's3_uri': response.get('outputDataConfig', {}).get('s3Uri', 'N/A')
            }
            lambda_client = boto3.client('lambda')
            lambda_client.invoke(
                FunctionName=self.alert_lambda,
                InvocationType='Event', # Asynchronous invocation
                Payload=json.dumps(payload)
            )
            return result

        except Exception as e:
            logger.error("Failed to create Bedrock evaluation job: %s", e)
            raise
