locals {
  lambda_name             = "${local.csi}-bedrock-messager"
  s3_lambda_logging_key   = "prompt-executions/"
  evaluations_lambda_name = "${local.csi}-bedrock-evaluations"
  alerts_lambda_name      = "${local.csi}-bedrock-evaluations-alerts"
}

resource "aws_s3_bucket" "lambda_prompt_logging_s3_bucket" {
  bucket = "logfiles-${local.lambda_name}"
}

resource "aws_s3_bucket_versioning" "lambda_prompt_logging_s3_bucket_versioning" {
  bucket = aws_s3_bucket.lambda_prompt_logging_s3_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_object" "lambda_prompt_logging_s3_bucket_object" {
  bucket       = aws_s3_bucket.lambda_prompt_logging_s3_bucket.bucket
  key          = local.s3_lambda_logging_key
  content_type = "application/x-directory"
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "iam_for_lambda" {
  name               = "${local.csi}-iam-for-lambda"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

data "aws_iam_policy_document" "bedrock_access" {
  statement {
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:GetPrompt",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:PutObject",
      "bedrock:ApplyGuardrail",
      "bedrock:CreateEvaluationJob",
      "bedrock:DescribeEvaluationJob",
      "bedrock:GetEvaluationJob"
    ]
    resources = [
      "arn:aws:bedrock:${var.region}::foundation-model/*",
      "arn:aws:bedrock:eu-central-1::foundation-model/*",
      "arn:aws:bedrock:eu-north-1::foundation-model/*",
      "arn:aws:bedrock:eu-west-3::foundation-model/*",
      "arn:aws:bedrock:*:${var.aws_account_id}:prompt/*",
      aws_s3_bucket.lambda_prompt_logging_s3_bucket.arn,
      "${aws_s3_bucket.lambda_prompt_logging_s3_bucket.arn}/${local.s3_lambda_logging_key}*",
      "arn:aws:bedrock:${var.region}:${var.aws_account_id}:guardrail/*",
      "arn:aws:bedrock:${var.region}:${var.aws_account_id}:inference-profile/eu.amazon.nova-pro-v1:*",
      "arn:aws:bedrock:${var.region}::foundation-model/amazon.nova-pro-v1:0"
    ]
  }
}

resource "aws_iam_policy" "bedrock_access_policy" {
  name   = "${local.csi}-bedrock-access-policy"
  policy = data.aws_iam_policy_document.bedrock_access.json
}

resource "aws_iam_role_policy_attachment" "bedrock_access_attachment" {
  role       = aws_iam_role.iam_for_lambda.name
  policy_arn = aws_iam_policy.bedrock_access_policy.arn
}

data "archive_file" "docx_to_string_file" {
  type        = "zip"
  source_dir  = "../../../../src/backend/bedrock-prompt-messager"
  output_path = "lambda_function.zip"
}

resource "aws_lambda_function" "bedrock-messager" {
  function_name    = local.lambda_name
  filename         = data.archive_file.docx_to_string_file.output_path
  role             = aws_iam_role.iam_for_lambda.arn
  handler          = "main.lambda_handler"
  source_code_hash = data.archive_file.docx_to_string_file.output_base64sha256
  runtime          = "python3.12"
  timeout          = 30

  environment {
    variables = {
      env_region                = var.region
      env_model_id              = var.prompt-model
      env_temperature           = var.prompt-temperature
      env_max_tokens            = var.prompt-max-tokens-to-sample
      env_top_p                 = var.prompt-top-p
      env_logging_s3_bucket     = aws_s3_bucket.lambda_prompt_logging_s3_bucket.bucket
      env_logging_s3_key_prefix = local.s3_lambda_logging_key
      env_guardrail_arn         = aws_bedrock_guardrail.notifai-bedrock-guardrail.guardrail_arn
      env_guardrail_version     = "DRAFT"
    }
  }
}

data "archive_file" "evaluations_lambda_file" {
  type        = "zip"
  source_dir  = "../../../../src/backend/bedrock_evaluations_runner"
  output_path = "lambda_evaluations.zip"
}

resource "aws_lambda_function" "bedrock_evaluations" {
  function_name    = local.evaluations_lambda_name
  filename         = data.archive_file.evaluations_lambda_file.output_path
  role             = aws_iam_role.iam_for_evaluations_lambda.arn
  handler          = "bedrock_evaluation_lambda.lambda_handler"
  source_code_hash = data.archive_file.evaluations_lambda_file.output_base64sha256
  runtime          = "python3.12"
  timeout          = 30

  environment {
    variables = {
      env_evaluator_model_identifier  = var.evaluation-evaluator-model-identifier
      env_generator_model_identifier  = var.evaluation-inference-model-identifier
      env_role_arn                    = aws_iam_role.iam_for_bedrock_evaluation.arn
      env_region                      = var.region
      env_input_prompt_s3_uri         = "s3://${aws_s3_object.prompts_object.bucket}/${aws_s3_object.prompts_object.key}"
      env_results_s3_uri              = "s3://${aws_s3_object.results_object.bucket}/${aws_s3_object.results_object.key}"
      env_lambda_alerts_function_name = local.alerts_lambda_name
    }
  }
}

resource "aws_iam_role" "iam_for_evaluations_lambda" {
  name = "${local.csi}-iam-for-evaluations-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

data "aws_iam_policy_document" "evaluations_lambda_policy_doc" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "bedrock:InvokeModel",
      "bedrock:CreateEvaluationJob",
      "s3:GetObject",
      "s3:PutObject",
      "lambda:InvokeFunction",
      "iam:PassRole"
    ]
    resources = [
      "arn:aws:logs:${var.region}:${var.aws_account_id}:log-group:/aws/lambda/${local.evaluations_lambda_name}:*",
      "arn:aws:bedrock:${var.region}::foundation-model/${var.evaluation-evaluator-model-identifier}",
      "arn:aws:bedrock:${var.region}::foundation-model/${var.evaluation-inference-model-identifier}",
      "arn:aws:bedrock:${var.region}::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:s3:::${aws_s3_object.prompts_object.bucket}/${aws_s3_object.prompts_object.key}",
      "arn:aws:s3:::${aws_s3_object.results_object.bucket}/${aws_s3_object.results_object.key}*",
      aws_iam_role.iam_for_bedrock_evaluation.arn,
      "arn:aws:lambda:${var.region}:${var.aws_account_id}:function:${local.alerts_lambda_name}"
    ]
  }
}

resource "aws_iam_policy" "evaluations_lambda_policy" {
  name   = "${local.csi}-evaluations-lambda-policy"
  policy = data.aws_iam_policy_document.evaluations_lambda_policy_doc.json
}

resource "aws_iam_role_policy_attachment" "evaluations_lambda_attachment" {
  role       = aws_iam_role.iam_for_evaluations_lambda.name
  policy_arn = aws_iam_policy.evaluations_lambda_policy.arn
}

resource "aws_lambda_function" "evaluations_alerts" {
  function_name    = local.alerts_lambda_name
  role             = aws_iam_role.iam_for_evaluations_alerts_lambda.arn
  filename         = data.archive_file.evaluations_alerts_zip.output_path
  source_code_hash = data.archive_file.evaluations_alerts_zip.output_base64sha256
  handler          = "evaluations_alert_lambda.lambda_handler"
  runtime          = "python3.12"
  timeout          = 30

  environment {
    variables = {
      env_lambda_name       = local.alerts_lambda_name
      env_template_complete = aws_ses_template.complete.name
      env_template_failed   = aws_ses_template.failed.name
      env_sender_email      = aws_ses_email_identity.sender_email.email
    }
  }
}

data "archive_file" "evaluations_alerts_zip" {
  type        = "zip"
  source_dir  = "../../../../src/backend/bedrock_alerts"
  output_path = "${path.module}/evaluations_alerts.zip"
}


resource "aws_iam_role" "iam_for_evaluations_alerts_lambda" {
  name = "${local.csi}-iam-for-evaluations-alerts-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

data "aws_iam_policy_document" "evaluations_lambda_alerts_policy_doc" {
  statement {
    effect = "Allow"
    actions = [
      "bedrock:GetEvaluationJob",
      "bedrock:DescribeEvaluationJob",
      "bedrock:ListEvaluationJobs",
      "ses:SendEmail",
      "ses:SendRawEmail",
      "ses:getTemplate",
      "ses:sendTemplatedEmail",
      "s3:GetObject"
    ]
    resources = [
      "arn:aws:s3:::${aws_s3_object.results_object.bucket}/${aws_s3_object.results_object.key}*",
      "arn:aws:bedrock:${var.region}:${var.aws_account_id}:evaluation-job/*",
    ]
  }
}

resource "aws_iam_policy" "evaluations_lambda_alerts_policy" {
  name   = "${local.csi}-evaluations-lambda-alerts-policy"
  policy = data.aws_iam_policy_document.evaluations_lambda_alerts_policy_doc.json
}

resource "aws_iam_role_policy_attachment" "evaluations_lambda_alerts_attachment" {
  role       = aws_iam_role.iam_for_evaluations_alerts_lambda.name
  policy_arn = aws_iam_policy.evaluations_lambda_alerts_policy.arn
}
