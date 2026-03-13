resource "aws_iam_role" "eventbridge_scheduler_role" {
  name               = "${local.csi}-eventbridge-scheduler-role"
  assume_role_policy = data.aws_iam_policy_document.eventbridge_scheduler_assume_role.json
}

data "aws_iam_policy_document" "eventbridge_scheduler_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "eventbridge_scheduler_policy" {
  name   = "${local.csi}-eventbridge-scheduler-policy"
  policy = data.aws_iam_policy_document.eventbridge_scheduler_policy.json
}

resource "aws_iam_role_policy_attachment" "eventbridge_scheduler_attach" {
  role       = aws_iam_role.eventbridge_scheduler_role.name
  policy_arn = aws_iam_policy.eventbridge_scheduler_policy.arn
}

data "aws_iam_policy_document" "eventbridge_scheduler_policy" {
  statement {
    effect    = "Allow"
    actions   = ["lambda:InvokeFunction"]
    resources = [module.bedrock_evaluations.function_arn]
  }
}
