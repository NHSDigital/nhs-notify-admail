output "bedrock_role_arn" {
  description = "ARN of the IAM role for Bedrock automatic evaluation"
  value       = aws_iam_role.iam_for_bedrock_evaluation.arn
}

output "bedrock_evaluation_prompt_dataset_s3_uri" {
  description = "S3 URI for the Bedrock evaluation prompt dataset"
  value       = "s3://${aws_s3_object.prompts_object.bucket}/${aws_s3_object.prompts_object.key}"
}

output "bedrock_evaluation_results_s3_uri" {
  description = "S3 URI for the Bedrock evaluation results"
  value       = "s3://${aws_s3_object.results_object.bucket}/${aws_s3_object.results_object.key}"
}

output "evaluation_evaluator_model_identifier" {
  description = "Identifier for the Bedrock evaluator model"
  value       = var.evaluation_evaluator_model_identifier
}

output "evaluation_inference_model_identifier" {
  description = "Identifier for the Bedrock inference model"
  value       = var.evaluation_inference_model_identifier
}

output "bedrock_guardrail_arn" {
  value = aws_bedrock_guardrail.main.guardrail_arn
}
