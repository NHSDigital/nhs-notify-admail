locals {
  bedrock_evaluations_alerts_function_name = "bedrock-evaluations-alerts"
}

module "bedrock_evaluations_alerts" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-lambda.zip"

  function_name = local.bedrock_evaluations_alerts_function_name
  description   = "Bedrock evaluations alerts Lambda function"

  aws_account_id = var.aws_account_id
  component      = local.component
  environment    = var.environment
  project        = var.project
  region         = var.region
  group          = var.group

  log_retention_in_days = var.log_retention_in_days
  kms_key_arn           = module.kms.key_arn

  iam_policy_document = {
    body = data.aws_iam_policy_document.evaluations_lambda_alerts_policy_doc.json
  }

  package_type           = "Image"
  image_uri              = "${var.aws_account_id}.dkr.ecr.${var.region}.amazonaws.com/${var.project}-${var.parent_acct_environment}-acct-${local.component}:${var.project}-${var.environment}-${local.component}-example-lambda-${var.container_image_tag_suffix}"
  image_repository_names = ["${var.project}-${var.parent_acct_environment}-acct-${local.component}"]

  handler_function_name = "handler"
  runtime               = "nodejs22.x"
  memory                = 512
  timeout               = 30
  log_level             = var.log_level

  force_lambda_code_deploy = var.force_lambda_code_deploy
  enable_lambda_insights   = false

  log_destination_arn       = local.log_destination_arn
  log_subscription_role_arn = local.acct.log_subscription_role_arn

  lambda_env_vars = {
    env_lambda_name        = local.bedrock_evaluations_alerts_function_name
    env_results_bucket     = module.s3bucket_evaluation_results.id
    env_results_bucket_key = aws_s3_object.results_object.key
    env_sns_topic_arn      = aws_sns_topic.admail_eval_alerts_topic.arn
  }
}

resource "aws_lambda_permission" "allow_eventbridge_to_invoke_alerts_lambda" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.bedrock_evaluations_alerts.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.evaluation_results_uploaded.arn
}
