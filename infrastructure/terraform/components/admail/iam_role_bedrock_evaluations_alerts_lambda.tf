resource "aws_iam_role" "iam_for_evaluations_alerts_lambda" {
  name               = "${local.csi}-iam-for-evaluations-alerts-lambda"
  assume_role_policy = data.aws_iam_policy_document.evaluations_alerts_lambda_assume_role.json
}

data "aws_iam_policy_document" "evaluations_alerts_lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
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

data "aws_iam_policy_document" "evaluations_lambda_alerts_policy_doc" {
  statement {
    effect = "Allow"
    actions = [
      "bedrock:GetEvaluationJob",
      "bedrock:DescribeEvaluationJob",
      "bedrock:ListEvaluationJobs",
      "s3:GetObject",
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "s3:ListBucket",
      "sns:Publish"
    ]
    resources = [
      "arn:aws:s3:::${aws_s3_object.results_object.bucket}/${aws_s3_object.results_object.key}*",
      "arn:aws:bedrock:${var.region}:${var.aws_account_id}:evaluation-job/*",
      "arn:aws:logs:${var.region}:${var.aws_account_id}:log-group:/aws/lambda/${local.alerts_lambda_name}:*",
      "arn:aws:s3:::${aws_s3_object.results_object.bucket}",
      "arn:aws:sns:${var.region}:${var.aws_account_id}:${aws_sns_topic.admail_eval_alerts_topic.name}",
    ]
  }
}
