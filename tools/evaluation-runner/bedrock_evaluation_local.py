import boto3
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

evaluator_model = os.getenv("EVALUATOR_MODEL_IDENTIFIER").strip().strip('"')
generator_model = os.getenv("INFERENCE_MODEL_IDENTIFIER").strip().strip('"')
role_arn = os.getenv("ROLE_ARN").strip().strip('"')
input_data = os.getenv("INPUT_PROMPT_S3_URI").strip().strip('"')
output_path = os.getenv("RESULTS_S3_URI").strip().strip('"')
aws_region = os.getenv("AWS_REGION").strip().strip('"')

bedrock_client = boto3.client("bedrock", region_name=aws_region)

rating_metric = {
    "customMetricDefinition": {
        "name": "Rating",
        "instructions": """
If the 'Rating' value in the {{prediction}} matchs the 'Rating' value in the {{ground_truth}} return 1 else return 0.""",
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

model_eval_job_name = (
    f"model-evaluation-custom-metrics-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}"
)

print(f"Creating model evaluation job: {model_eval_job_name}")

model_eval_job = bedrock_client.create_evaluation_job(
    jobName=model_eval_job_name,
    jobDescription="Evaluate model performance with custom Rating metric",
    roleArn=role_arn,
    applicationType="ModelEvaluation",
    inferenceConfig={
        "models": [{"bedrockModel": {"modelIdentifier": generator_model}}]
    },
    outputDataConfig={"s3Uri": output_path},
    evaluationConfig={
        "automated": {
            "datasetMetricConfigs": [
                {
                    "taskType": "General",
                    "dataset": {
                        "name": "ModelEvalDataset",
                        "datasetLocation": {"s3Uri": input_data},
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
                    "bedrockEvaluatorModels": [{"modelIdentifier": evaluator_model}]
                },
            },
            "evaluatorModelConfig": {
                "bedrockEvaluatorModels": [{"modelIdentifier": evaluator_model}]
            },
        }
    },
)

print(f"Created model evaluation job: {model_eval_job_name}")

evaluation_aws_url = f"https://{aws_region}.console.aws.amazon.com/bedrock/home?region={aws_region}#/eval/model-evaluation/report?job={model_eval_job_name}&jobIdentifier={model_eval_job["jobArn"]}"
print("View the evaluation's progress in the AWS Console with the below link;")
print("NOTE: The evaluation can take 10 - 15 minutes to complete")
print("---")
print(f"{evaluation_aws_url}")
print("---")
