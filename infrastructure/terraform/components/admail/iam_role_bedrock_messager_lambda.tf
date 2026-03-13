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

resource "aws_iam_policy" "bedrock_access_policy" {
  name   = "${local.csi}-bedrock-access-policy"
  policy = data.aws_iam_policy_document.bedrock_access.json
}

resource "aws_iam_role_policy_attachment" "bedrock_access_attachment" {
  role       = aws_iam_role.iam_for_lambda.name
  policy_arn = aws_iam_policy.bedrock_access_policy.arn
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
      "bedrock:GetEvaluationJob",
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:aws:bedrock:${var.region}::foundation-model/*",
      "arn:aws:bedrock:eu-central-1::foundation-model/*",
      "arn:aws:bedrock:eu-north-1::foundation-model/*",
      "arn:aws:bedrock:eu-west-3::foundation-model/*",
      "arn:aws:bedrock:*:${var.aws_account_id}:prompt/*",
      module.s3bucket_lambda_prompt_logging.arn,
      "${module.s3bucket_lambda_prompt_logging.arn}/${local.s3_lambda_logging_key}*",
      "arn:aws:bedrock:${var.region}:${var.aws_account_id}:guardrail/*",
      "arn:aws:bedrock:${var.region}:${var.aws_account_id}:inference-profile/eu.amazon.nova-pro-v1:*",
      "arn:aws:bedrock:${var.region}::foundation-model/amazon.nova-pro-v1:0",
      "arn:aws:logs:${var.region}:${var.aws_account_id}:log-group:/aws/lambda/${local.lambda_name}:*"
    ]
  }
}
