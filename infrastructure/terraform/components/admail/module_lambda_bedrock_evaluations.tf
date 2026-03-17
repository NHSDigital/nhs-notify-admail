module "bedrock_evaluations" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-lambda.zip"

  function_name = "bedrock-evaluations"
  description   = "Bedrock evaluations runner Lambda function"

  aws_account_id = var.aws_account_id
  component      = local.component
  environment    = var.environment
  project        = var.project
  region         = var.region
  group          = var.group

  log_retention_in_days = var.log_retention_in_days
  kms_key_arn           = module.kms.key_arn

  iam_policy_document = {
    body = data.aws_iam_policy_document.evaluations_lambda_policy_doc.json
  }

  package_type           = "Image"
  image_uri              = "${local.ecr_repository_url}:${var.project}-${var.environment}-${local.component}-example-lambda-${var.container_image_tag_suffix}"
  image_repository_names = ["${var.project}-${var.parent_acct_environment}-acct-${local.component}"]

  handler_function_name = "handler"
  runtime               = "nodejs22.x"

  memory    = 512
  timeout   = 30
  log_level = var.log_level

  force_lambda_code_deploy = var.force_lambda_code_deploy
  enable_lambda_insights   = false

  log_destination_arn       = local.log_destination_arn
  log_subscription_role_arn = local.acct.log_subscription_role_arn

  lambda_env_vars = {
    env_evaluator_model_identifier = var.evaluation_evaluator_model_identifier
    env_generator_model_identifier = var.evaluation_inference_model_identifier
    env_role_arn                   = aws_iam_role.iam_for_bedrock_evaluation.arn
    env_region                     = var.region
    env_input_prompt_s3_uri        = "s3://${module.s3bucket_evaluation_input_prompts.id}/${aws_s3_object.prompts_object.key}"
    env_results_s3_uri             = "s3://${module.s3bucket_evaluation_results.id}/${aws_s3_object.results_object.key}"
    env_resource_prefix            = local.csi
  }
}
