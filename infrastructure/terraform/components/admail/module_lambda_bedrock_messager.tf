module "bedrock_messager" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-lambda.zip"

  function_name = "bedrock-messager"
  description   = "Bedrock prompt messager Lambda function"

  aws_account_id = var.aws_account_id
  component      = local.component
  environment    = var.environment
  project        = var.project
  region         = var.region
  group          = var.group

  log_retention_in_days = var.log_retention_in_days
  kms_key_arn           = module.kms.key_arn

  iam_policy_document = {
    body = data.aws_iam_policy_document.bedrock_access.json
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
    env_region                = var.region
    env_model_id              = var.prompt_model
    env_temperature           = var.prompt_temperature
    env_max_tokens            = var.prompt_max_tokens_to_sample
    env_top_p                 = var.prompt_top_p
    env_logging_s3_bucket     = module.s3bucket_lambda_prompt_logging.id
    env_logging_s3_key_prefix = local.s3_lambda_logging_key
    env_guardrail_arn         = aws_bedrock_guardrail.main.guardrail_arn
    env_guardrail_version     = "DRAFT"
    env_logging_s3_account_id = var.aws_account_id
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = module.bedrock_messager.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/${aws_api_gateway_method.call_llm_post.http_method}${aws_api_gateway_resource.call_llm.path}"
}
