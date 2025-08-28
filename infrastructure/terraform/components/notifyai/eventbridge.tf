module "eventbridge" {
  source  = "terraform-aws-modules/eventbridge/aws"
  version = "~> 3.0"

  bus_name = "${local.csi}-evaluations_bus"

  schedules = {
    "${local.csi}-lambda-cron" = {
      description         = "Trigger for Lambda evaluations"
      schedule_expression = "rate(${var.evaluation-schedule-days} days)"
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

# 1. Define the EventBridge Rule and its Event Pattern
# This rule listens for Bedrock evaluation jobs that have completed or failed.
resource "aws_cloudwatch_event_rule" "bedrock_evaluation_job_finished" {
  name        = "${local.csi}-bedrock-evaluation-finished-rule"
  description = "Triggers a Lambda when a Bedrock evaluation job completes or fails"

  event_pattern = jsonencode({
    "source"      = ["aws.bedrock"],
    "detail-type" = ["Bedrock Model Evaluation Job State Change"],
    "detail" = {
      "status" = ["Complete", "Failed"]
    }
  })
}

# 2. Set the Target for the Rule (with a custom input)
resource "aws_cloudwatch_event_target" "invoke_alerts_lambda_on_job_finish" {
  rule      = aws_cloudwatch_event_rule.bedrock_evaluation_job_finished.name
  target_id = "InvokeAlertsLambda"
  arn       = aws_lambda_function.evaluations_alerts.arn

  input_transformer {
    input_paths = {
      "jobArn"    = "$.detail.jobArn",
      "jobStatus" = "$.detail.status"
    }
    input_template = <<EOF
    {
      "jobArn": <jobArn>,
      "status": <jobStatus>
    }
    EOF
  }
}

# 3. Grant EventBridge Permission to Invoke the Lambda
# This policy is required for the EventBridge service to trigger your function.
resource "aws_lambda_permission" "allow_eventbridge_to_invoke_alerts_lambda" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.evaluations_alerts.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.bedrock_evaluation_job_finished.arn
}
