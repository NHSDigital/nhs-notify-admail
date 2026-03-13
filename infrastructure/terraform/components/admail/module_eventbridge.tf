module "eventbridge" {
  source  = "terraform-aws-modules/eventbridge/aws"
  version = "~> 3.0"

  bus_name = "${local.csi}-evaluations_bus"

  schedules = {
    "${local.csi}-lambda-cron" = {
      description         = "Trigger for Lambda evaluations"
      schedule_expression = "rate(${var.evaluation-schedule-days} days)"
      timezone            = "Europe/London"
      arn                 = module.bedrock_evaluations.function_arn
      input               = jsonencode({ "job" : "cron-by-rate" })
      role_arn            = aws_iam_role.eventbridge_scheduler_role.arn
    }
  }
}
