import boto3
import os
import json
import logging
from datetime import datetime


logger = logging.getLogger()
logger.setLevel(logging.INFO)


class BedrockEvaluator:
    def __init__(self, region: str, role_arn: str):
        if not all([region, role_arn]):
            raise ValueError("Region and Role ARN must be provided.")

        self.region = region
        self.role_arn = role_arn
        self.bedrock_client = boto3.client("bedrock", region_name=self.region)
        logger.info("BedrockEvaluator initialized for region %s", self.region)

    def run_evaluation_job(
        self,
        evaluator_model: str,
        generator_model: str,
        input_s3_uri: str,
        output_s3_uri: str,
    ) -> dict:
        job_name = f"model-eval-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}"
        logger.info("Starting model evaluation job: %s", job_name)

        rating_metric = {
            "name": "Rating",
            "instructions": "If the 'Rating' value in the {{prediction}} matches the 'Rating' value in the {{ground_truth}} return 1 else return 0.",
            "ratingScale": [
                {"definition": "Match", "value": {"floatValue": 1}},
                {"definition": "No Match", "value": {"floatValue": 0}},
            ],
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
                            "customMetrics": [
                                {"customMetricDefinition": rating_metric}
                            ],
                            "evaluatorModelConfig": {
                                "bedrockEvaluatorModels": [
                                    {"modelIdentifier": evaluator_model}
                                ]
                            },
                        },
                    }
                },
            )

            job_arn = response["jobArn"]
            console_url = f"https://{self.region}.console.aws.amazon.com/bedrock/home?region={self.region}#/eval/model-evaluation/report?job={job_name}&jobIdentifier={job_arn}"

            result = {"jobName": job_name, "jobArn": job_arn, "consoleUrl": console_url}

            logger.info("Successfully created model evaluation job: %s", job_name)
            logger.info("View progress here: %s", console_url)

            return result

        except Exception as e:
            logger.error("Failed to create Bedrock evaluation job: %s", e)
            raise
