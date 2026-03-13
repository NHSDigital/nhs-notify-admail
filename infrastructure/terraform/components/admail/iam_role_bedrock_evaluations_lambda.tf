resource "aws_iam_role" "iam_for_evaluations_lambda" {
  name               = "${local.csi}-iam-for-evaluations-lambda"
  assume_role_policy = data.aws_iam_policy_document.evaluations_lambda_assume_role.json
}

data "aws_iam_policy_document" "evaluations_lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
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

# trivy:ignore:AVD-AWS-0342 reason="iam:PassRole is required for the evaluations lambda to start a bedrock evaluation job. The passrole is also scoped minimally"
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
    ]
    resources = [
      "arn:aws:logs:${var.region}:${var.aws_account_id}:log-group:/aws/lambda/${local.evaluations_lambda_name}:*",
      "arn:aws:bedrock:${var.region}::foundation-model/${var.evaluation-evaluator-model-identifier}",
      "arn:aws:bedrock:${var.region}::foundation-model/${var.evaluation-inference-model-identifier}"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "bedrock:CreateEvaluationJob",
      "bedrock:DescribeEvaluationJob",
      "bedrock:GetEvaluationJob",
      "bedrock:ListEvaluationJobs"
    ]
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "iam:PassRole"
    ]
    resources = [aws_iam_role.iam_for_bedrock_evaluation.arn]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["bedrock.amazonaws.com"]
    }
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject"
    ]
    resources = ["arn:aws:s3:::${aws_s3_object.prompts_object.bucket}/${aws_s3_object.prompts_object.key}"]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject"
    ]
    resources = ["arn:aws:s3:::${aws_s3_object.results_object.bucket}/${aws_s3_object.results_object.key}*"]
  }
}
