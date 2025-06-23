aws bedrock create-evaluation-job \
--region $AWS_REGION \
--job-name "$JOB_NAME" \
--role-arn "$ROLE_ARN" \
--evaluation-config "{
    \"automated\": {
        \"datasetMetricConfigs\": [
            {
                \"taskType\": \"$TASK_TYPE\",
                \"dataset\": {
                    \"name\": \"notifaiprompts\",
                    \"datasetLocation\": {\"s3Uri\": $INPUT_PROMPT_S3_URI}
                },
                \"metricNames\": [
                    \"Builtin.Helpfulness\",
                    \"Builtin.Relevance\",
                    \"Builtin.Coherence\",
                    \"Builtin.Completeness\"
                ]
            }
        ],
        \"evaluatorModelConfig\": {
            \"bedrockEvaluatorModels\": [
                {\"modelIdentifier\": $EVALUATOR_MODEL_IDENTIFIER}
            ]
        }
    }
}" \
--inference-config "{\"models\":[{\"bedrockModel\":{\"modelIdentifier\":$INFERENCE_MODEL_IDENTIFIER,\"inferenceParams\":\"{\\\"inferenceConfig\\\":{\\\"maxTokens\\\":512,\\\"temperature\\\":0.7,\\\"topP\\\":0.9}}\"}}]}" \
--output-data-config "{\"s3Uri\":$RESULTS_S3_URI}" \
--job-description "$JOB_DESCRIPTION" \
--application-type "ModelEvaluation"