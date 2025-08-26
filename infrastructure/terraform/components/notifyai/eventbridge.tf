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
