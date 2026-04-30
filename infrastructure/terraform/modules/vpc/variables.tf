variable "project" {
  type        = string
  description = "Project name, used to construct resource names"
}

variable "environment" {
  type        = string
  description = "Environment name, used to construct resource names"
}

variable "component" {
  type        = string
  description = "Component name, used to construct resource names"
}

variable "region" {
  type        = string
  description = "AWS region, used to construct VPC endpoint service names"
}
