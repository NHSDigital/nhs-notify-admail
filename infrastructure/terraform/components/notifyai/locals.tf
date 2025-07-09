locals {
  prompt-file-name = "prompts.jsonl"
  prompt-model-arn = "arn:aws:bedrock:${var.region}:${var.aws_account_id}:inference-profile/${var.prompt-model}"

  evaluation-evaluator-model-identifier-arn = "arn:aws:bedrock:${var.region}:${var.aws_account_id}:inference-profile/${var.evaluation-evaluator-model-identifier}"
  evaluation-inference-model-identifier-arn = "arn:aws:bedrock:${var.region}:${var.aws_account_id}:inference-profile/${var.evaluation-inference-model-identifier}"
}
