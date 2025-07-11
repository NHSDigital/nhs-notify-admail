locals {
  lambda_name           = "${local.csi}-bedrock-messager"
  s3_lambda_logging_key = "prompt-executions/"
}

resource "aws_s3_bucket" "lambda_prompt_logging_s3_bucket" {
  bucket = "${local.csi_global}-logfiles"
}

resource "aws_s3_bucket_versioning" "lambda_prompt_logging_s3_bucket" {
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
    ]
    resources = [
      "arn:aws:bedrock:${var.region}::foundation-model/*",
      "arn:aws:bedrock:eu-central-1::foundation-model/*",
      "arn:aws:bedrock:eu-north-1::foundation-model/*",
      "arn:aws:bedrock:eu-west-3::foundation-model/*",
      "arn:aws:bedrock:${var.region}:${var.aws_account_id}:inference-profile/eu.amazon.nova-pro-v1:0",
      "arn:aws:bedrock:*:${var.aws_account_id}:prompt/*",
      aws_s3_bucket.lambda_prompt_logging_s3_bucket.arn,
      "${aws_s3_bucket.lambda_prompt_logging_s3_bucket.arn}/${local.s3_lambda_logging_key}*",
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
  function_name    = "${local.csi}-bedrock-messager"
  filename         = data.archive_file.docx_to_string_file.output_path
  role             = aws_iam_role.iam_for_lambda.arn
  handler          = "bedrock_messager.call_admail_bedrock_prompt"
  source_code_hash = data.archive_file.docx_to_string_file.output_base64sha256
  runtime          = "python3.12"

  timeout = 30

  environment {
    variables = {
      env_region                = "${var.region}",
      env_model_id              = "${local.prompt-model-arn}",
      env_temperature           = "${var.prompt-temperature}"
      env_max_tokens            = "${var.prompt-max-tokens-to-sample}"
      env_top_p                 = "${var.prompt-top-p}"
      env_logging_s3_bucket     = "${aws_s3_bucket.lambda_prompt_logging_s3_bucket.bucket}"
      env_logging_s3_key_prefix = "${local.s3_lambda_logging_key}"
    }
  }
}

#There is a circular dependancy on this block. the frontend apprunner need to know the lambda URL, and vice versa
#As a workaround the CORS is not set here, to enforce no allowance, then the null_resource.update_lambda_url_cors block updates the cors afterwards to specifically only allow in the frontend
resource "aws_lambda_function_url" "bedrock_messager_url" {
  count              = var.first-run ? 0 : 1
  function_name      = aws_lambda_function.bedrock-messager.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = true
    allow_headers     = ["content-type", "authorization"]
    allow_methods     = ["*"]
    allow_origins     = ["https://cors.tobeconfigured.innullresource"]
    expose_headers    = []
    max_age           = 300
  }
}

# This resource will run a local command after the dependencies are met.
resource "null_resource" "update_lambda_url_cors" {
  depends_on = [
    aws_lambda_function_url.bedrock_messager_url[0],
    aws_apprunner_service.notifai_frontend_service[0],
  ]

  count = var.first-run ? 0 : 1

  # Trigger a re-run if the App Runner URL changes
  triggers = {
    apprunner_url = aws_apprunner_service.notifai_frontend_service[0].service_url
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws lambda update-function-url-config \
        --function-name "${aws_lambda_function.bedrock-messager.function_name}" \
        --cors '{"AllowOrigins": ["https://${aws_apprunner_service.notifai_frontend_service[0].service_url}"], "AllowMethods": ["*"], "AllowHeaders": ["content-type", "authorization"], "AllowCredentials": true, "MaxAge": 300}' \
        --region "${var.region}"
    EOT
  }

  lifecycle {
    replace_triggered_by = [
      aws_apprunner_service.notifai_frontend_service[0],
      aws_lambda_function_url.bedrock_messager_url[0]
    ]
  }
}
