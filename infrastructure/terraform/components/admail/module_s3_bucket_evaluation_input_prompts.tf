module "s3bucket_evaluation_input_prompts" {
  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-s3bucket.zip"

  name = "evaluation-input-prompts"

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
    Name = "Evaluation Input Prompts"
  }
}

resource "aws_s3_object" "prompts_object" {
  bucket = module.s3bucket_evaluation_input_prompts.id
  key    = local.prompt_file_name
  source = "${path.module}/resources/prompt-data/${local.prompt_file_name}"
  etag   = filemd5("${path.module}/resources/prompt-data/${local.prompt_file_name}")
}

resource "aws_s3_bucket_cors_configuration" "evaluation_input_prompts" {
  bucket = module.s3bucket_evaluation_input_prompts.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["Access-Control-Allow-Origin"]
  }
}
