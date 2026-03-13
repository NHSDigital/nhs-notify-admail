module "bedrock_evaluations_alerts" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-lambda.zip"

  function_name = "bedrock-evaluations-alerts"
  description   = "Bedrock evaluations alerts Lambda function"

  aws_account_id = var.aws_account_id
  component      = local.component
  environment    = var.environment
  project        = var.project
  region         = var.region
  group          = var.group

  log_retention_in_days = var.log_retention_in_days
  kms_key_arn           = local.acct.kms_key_arns["cmk"]

  iam_policy_document = {
    body = data.aws_iam_policy_document.evaluations_lambda_alerts_policy_doc.json
  }

  function_s3_bucket      = local.acct.s3_buckets["lambda_function_artefacts"]["id"]
  function_code_base_path = local.aws_lambda_functions_dir_path
  function_code_dir       = "example-lambda/dist"
  function_include_common = true
  handler_function_name   = "handler"
  runtime                 = "nodejs22.x"
  memory                  = 512
  timeout                 = 30
  log_level               = var.log_level

  force_lambda_code_deploy = var.force_lambda_code_deploy
  enable_lambda_insights   = false

  log_destination_arn       = local.log_destination_arn
  log_subscription_role_arn = local.acct.log_subscription_role_arn

  lambda_env_vars = {
    env_lambda_name        = local.alerts_lambda_name
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
