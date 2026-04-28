module "vpc" {
  source = "../../modules/vpc"

  project     = var.project
  environment = var.environment
  component   = local.component
  region      = var.region
}
