terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.97.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.6.0"
    }
  }
  backend "s3" {
    bucket = "notifai-poc-terraform-eu-west-1"
    key    = "dev1.tfstate" #Default for local dev, replaced when deployed with GitHub Actions
    region = "eu-west-1"
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Service     = "notifai-poc"
      Environment = var.environment
      Source      = "Terraform"
    }
  }
}

provider "random" {}
