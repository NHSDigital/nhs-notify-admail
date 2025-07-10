locals {
  prompt-file-name = "prompts.jsonl"
  prompt-model-arn = "${var.prompt-model}"

  evaluation-evaluator-model-identifier-arn = "${var.evaluation-evaluator-model-identifier}"
  evaluation-inference-model-identifier-arn = "${var.evaluation-inference-model-identifier}"
}
