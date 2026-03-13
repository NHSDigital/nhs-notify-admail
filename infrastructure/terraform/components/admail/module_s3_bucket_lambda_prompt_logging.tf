module "s3bucket_lambda_prompt_logging" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-s3bucket.zip"

  name = "lambda-prompt-logging"

  aws_account_id = var.aws_account_id
  region         = var.region
  project        = var.project
  environment    = var.environment
  component      = local.component

  acl           = "private"
  force_destroy = var.force_destroy
  versioning    = true

  bucket_logging_target = {
    bucket = local.acct.s3_buckets["access_logs"]["id"]
  }

  public_access = {
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
  }

  default_tags = {
    Name = "Lambda Prompt Logging"
  }
}

resource "aws_s3_object" "lambda_prompt_logging_s3_bucket_object" {
  bucket       = module.s3bucket_lambda_prompt_logging.id
  key          = local.s3_lambda_logging_key
  content_type = "application/x-directory"
}
