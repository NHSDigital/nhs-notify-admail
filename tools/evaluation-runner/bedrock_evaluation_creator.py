import boto3
from datetime import datetime
import os

# Configure knowledge base and model settings
evaluator_model = os.getenv("EVALUATOR_MODEL_IDENTIFIER").strip().strip('"')
generator_model = os.getenv("INFERENCE_MODEL_IDENTIFIER").strip().strip('"')
custom_metrics_evaluator_model = (
    os.getenv("EVALUATOR_MODEL_IDENTIFIER").strip().strip('"')
)
role_arn = os.getenv("ROLE_ARN").strip().strip('"')

# Specify S3 locations
input_data = os.getenv("INPUT_PROMPT_S3_URI").strip().strip('"')
output_path = os.getenv("RESULTS_S3_URI").strip().strip('"')

# Create Bedrock client
bedrock_client = boto3.client(
    "bedrock", region_name=os.getenv("AWS_REGION").strip().strip('"')
)

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

# Create the model evaluation job
model_eval_job_name = (
    f"model-evaluation-custom-metrics-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}"
)

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
                        "Builtin.Coherence",
                        "Builtin.Relevance",
                        "Builtin.FollowingInstructions",
                        "Rating",
                    ],
                }
            ],
            "customMetricConfig": {
                "customMetrics": [rating_metric],
                "evaluatorModelConfig": {
                    "bedrockEvaluatorModels": [
                        {"modelIdentifier": custom_metrics_evaluator_model}
                    ]
                },
            },
            "evaluatorModelConfig": {
                "bedrockEvaluatorModels": [{"modelIdentifier": evaluator_model}]
            },
        }
    },
)

print(f"Created model evaluation job: {model_eval_job_name}")
print(f"Job ID: {model_eval_job['jobArn']}")
