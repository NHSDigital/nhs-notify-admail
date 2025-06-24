output "notifai_frontend_ecr_repository_url" {
  description = "The URL of the Notifai frontend ECR repository"
  value       = aws_ecr_repository.notifai-frontend.repository_url
}

output "notifai_backend_ecr_repository_url" {
  description = "The URL of the Notifai backend ECR repository"
  value       = aws_ecr_repository.notifai-backend.repository_url
}

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

output "evaluation-evaluator-model-identifier" {
  description = "Identifier for the Bedrock evaluator model"
  value       = var.evaluation-evaluator-model-identifier
}

output "evaluation-inference-model-identifier" {
  description = "Identifier for the Bedrock inference model"
  value       = var.evaluation-inference-model-identifier
}