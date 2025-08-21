locals {
  lambda_name = "${local.csi}-bedrock-evaluations"
}

data "archive_file" "docx_to_string_file" {
  type        = "zip"
  source_dir  = "../../../../tools/evaluation-runner"
  output_path = "lambda_evaluations.zip"
}

resource "aws_lambda_function" "bedrock-evaluations" {
  function_name    = local.lambda_name
  filename         = data.archive_file.docx_to_string_file.output_path
  role             = aws_iam_role.iam_for_lambda.arn
  handler          = "bedrock_evaluation_lambda.lambda_handler"
  source_code_hash = data.archive_file.docx_to_string_file.output_base64sha256
  runtime          = "python3.12"
  timeout          = 30

  environment {
    variables = {
      env_evaluator_model_identifier = var.evaluation_evaluator_model_identifier
      env_generator_model_identifier = var.evaluation_inference_model_identifier
      env_role_arn                   = aws_iam_role.iam_for_bedrock_evaluation.arn
      env_region                     = var.region
      env_input_prompt_s3_uri        = bedrock_evaluation_prompt_dataset_s3_uri
      env_results_s3_uri             = bedrock_evaluation_results_s3_uri
    }
  }
}

module "eventbridge" {
  source = "terraform-aws-modules/eventbridge/aws"
  version = 1.0.0

  bus_name = "example" # "default" bus already support schedule_expression in rules

  schedules = {
    lambda-cron = {
      description         = "Trigger for Lambda evaluations"
      schedule_expression = "rate(3 days)"
      timezone            = "Europe/London"
      arn                 = aws_lambda_function.bedrock-evaluations.arn
      input               = jsonencode({ "job" : "cron-by-rate" })
    }
  }
}
