locals {
  aws_lambda_functions_dir_path = "../../../../lambdas"

  root_domain_name        = "${var.environment}.${local.acct.route53_zone_names["admail"]}" # e.g. [main|dev|abxy0].admail.[dev|nonprod|prod].nhsnotify.national.nhs.uk
  root_domain_id          = local.acct.route53_zone_ids["admail"]
  root_domain_nameservers = local.acct.route53_zone_nameservers["admail"]

  log_destination_arn    = "arn:aws:logs:${var.region}:${var.shared_infra_account_id}:destination:nhs-${var.parent_acct_environment}-obs-firehose-logs"
  log_destination_arn_us = "arn:aws:logs:us-east-1:${var.shared_infra_account_id}:destination:nhs-${var.parent_acct_environment}-obs-us-east-1-firehose-logs"

  ecr_repository_url = "${var.aws_account_id}.dkr.ecr.${var.region}.amazonaws.com/${var.project}-${var.parent_acct_environment}-acct-${local.component}"

  # S3 keys and file names
  s3_lambda_logging_key = "prompt-executions/"

  # API Gateway
  api_gateway_llm_path_param = "call-llm"

  # AWS ALB and target group names are limited to 32 characters.
  # Truncate csi to 23 characters to accommodate the longest suffix "-frontend" (9 characters).
  ecs_name_prefix = length(local.csi) > 23 ? substr(local.csi, 0, 23) : local.csi
}
