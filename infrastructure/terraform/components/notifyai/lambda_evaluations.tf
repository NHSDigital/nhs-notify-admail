locals {
  evaluations_lambda_name = "${local.csi}-bedrock-evaluations"
}

data "archive_file" "evaluations_lambda_file" {
  type        = "zip"
  source_dir  = "../../../../tools/evaluation-runner"
  output_path = "lambda_evaluations.zip"
}

resource "aws_lambda_function" "bedrock_evaluations" {
  function_name    = local.evaluations_lambda_name
  filename         = data.archive_file.evaluations_lambda_file.output_path
  role             = aws_iam_role.iam_for_lambda.arn
  handler          = "bedrock_evaluation_lambda.lambda_handler"
  source_code_hash = data.archive_file.evaluations_lambda_file.output_base64sha256
  runtime          = "python3.12"
  timeout          = 30

  environment {
    variables = {
      env_evaluator_model_identifier = var.evaluation-evaluator-model-identifier
      env_generator_model_identifier = var.evaluation-inference-model-identifier
      env_role_arn                   = aws_iam_role.iam_for_bedrock_evaluation.arn
      env_region                     = var.region
      env_input_prompt_s3_uri        = "s3://${aws_s3_object.prompts_object.bucket}/${aws_s3_object.prompts_object.key}"
      env_results_s3_uri             = "s3://${aws_s3_object.results_object.bucket}/${aws_s3_object.results_object.key}"
    }
  }
}

module "eventbridge" {
  source  = "terraform-aws-modules/eventbridge/aws"
  version = "~> 3.0"

  bus_name = "${local.csi}-evaluations_bus"

  schedules = {
    lambda-cron = {
      description         = "Trigger for Lambda evaluations"
      schedule_expression = "rate(3 days)"
      timezone            = "Europe/London"
      arn                 = aws_lambda_function.bedrock_evaluations.arn
      input               = jsonencode({ "job" : "cron-by-rate" })
      role_arn            = aws_iam_role.eventbridge_scheduler_role.arn
    }
  }
}

resource "aws_iam_role" "eventbridge_scheduler_role" {
  name = "${local.csi}-eventbridge-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "scheduler.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "eventbridge_scheduler_policy" {
  name = "${local.csi}-eventbridge-scheduler-policy"
  role = aws_iam_role.eventbridge_scheduler_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "lambda:InvokeFunction"
        Resource = aws_lambda_function.bedrock_evaluations.arn
      }
    ]
  })
}
