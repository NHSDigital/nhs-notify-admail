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

      end_date = "2025-12-16T00:00:00Z"
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

resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.evaluation_programatic_results.id # Your S3 bucket ID

  eventbridge = true # This flag enables sending notifications directly to EventBridge
}

resource "aws_cloudwatch_event_rule" "evaluation_results_uploaded" {
  name        = "${local.csi}-evaluation-results-uploaded-rule"
  description = "Triggers a Lambda when evaluation results are uploaded to S3"

  event_pattern = jsonencode({
    "source" : ["aws.s3"],
    "detail-type" : ["Object Created"],
    "detail" : {
      "bucket" : {
        "name" : [aws_s3_bucket.evaluation_programatic_results.id]
      }
    }
  })

  depends_on = [aws_s3_bucket_notification.bucket_notification]
}

resource "aws_cloudwatch_event_target" "invoke_alerts_lambda_on_results_upload" {
  rule      = aws_cloudwatch_event_rule.evaluation_results_uploaded.name
  target_id = "InvokeAlertsLambda"
  arn       = aws_lambda_function.evaluations_alerts.arn

  input_transformer {
    input_paths = {
      "bucket" = "$.detail.bucket.name",
      "key"    = "$.detail.object.key"
    }
    input_template = <<EOF
    {
      "message": "Object created in bucket <bucket> with key <key>.",
      "s3_bucket": <bucket>,
      "s3_key": <key>
    }
    EOF
  }
}

resource "aws_lambda_permission" "allow_eventbridge_to_invoke_alerts_lambda" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.evaluations_alerts.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.evaluation_results_uploaded.arn
}
