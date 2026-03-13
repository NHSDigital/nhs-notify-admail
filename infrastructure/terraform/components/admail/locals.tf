locals {
  aws_lambda_functions_dir_path = "../../../../lambdas"
  root_domain_name              = "${var.environment}.${local.acct.route53_zone_names["supplier-api"]}" # e.g. [main|dev|abxy0].supplier-api.[dev|nonprod|prod].nhsnotify.national.nhs.uk
  root_domain_id                = local.acct.route53_zone_ids["supplier-api"]
  root_domain_nameservers       = local.acct.route53_zone_nameservers["supplier-api"]

  log_destination_arn    = "arn:aws:logs:${var.region}:${var.shared_infra_account_id}:destination:nhs-${var.environment}-obs-firehose-logs"
  log_destination_arn_us = "arn:aws:logs:us-east-1:${var.shared_infra_account_id}:destination:nhs-${var.environment}-obs-us-east-1-firehose-logs"

  # Lambda names
  lambda_name             = "${local.csi}-bedrock-messager"
  evaluations_lambda_name = "${local.csi}-bedrock-evaluations"
  alerts_lambda_name      = "${local.csi}-bedrock-evaluations-alerts"

  # S3 keys and file names
  s3_lambda_logging_key = "prompt-executions/"
  prompt-file-name      = "prompts.jsonl"

  # API Gateway
  api-gateway-llm-path-param = "call-llm"
}
