data "aws_ecr_repository" "main" {
  region = var.region
  name   = "${var.project}-${var.parent_acct_environment}-acct-${local.component}"
}
