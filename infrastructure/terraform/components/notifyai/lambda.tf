locals {
  lambda_name           = "${local.csi}-bedrock-messager"
  s3_lambda_logging_key = "prompt-executions/"
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

  statement {
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.iam_for_bedrock_evaluation.arn]
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
