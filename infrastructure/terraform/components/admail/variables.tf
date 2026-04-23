##
# Basic Required Variables for tfscaffold Components
##

variable "project" {
  type        = string
  description = "The name of the tfscaffold project"
}

variable "environment" {
  type        = string
  description = "The name of the tfscaffold environment"
}

variable "aws_account_id" {
  type        = string
  description = "The AWS Account ID (numeric)"
}

variable "region" {
  type        = string
  description = "The AWS Region"
}

variable "group" {
  type        = string
  description = "The group variables are being inherited from (often synonmous with account short-name)"
}

##
# tfscaffold variables specific to this component
##

# This is the only primary variable to have its value defined as
# a default within its declaration in this file, because the variables
# purpose is as an identifier unique to this component, rather
# then to the environment from where all other variables come.

variable "default_tags" {
  type        = map(string)
  description = "A map of default tags to apply to all taggable resources within the component"
  default     = {}
}

##
# Variables specific to the component
##

variable "force_destroy" {
  type        = bool
  description = "Flag to force deletion of S3 buckets"
  default     = false
}

variable "force_lambda_code_deploy" {
  type        = bool
  description = "If the lambda package in s3 has the same commit id tag as the terraform build branch, the lambda will not update automatically. Set to True if making changes to Lambda code from on the same commit for example during development"
  default     = false
}

variable "kms_deletion_window" {
  type        = string
  description = "When a kms key is deleted, how long should it wait in the pending deletion state?"
  default     = "30"
}

variable "log_level" {
  type        = string
  description = "The log level to be used in lambda functions within the component. Any log with a lower severity than the configured value will not be logged: https://docs.python.org/3/library/logging.html#levels"
  default     = "INFO"
}

variable "log_retention_in_days" {
  type        = number
  description = "The retention period in days for the Cloudwatch Logs events to be retained, default of 0 is indefinite"
  default     = 0
}

variable "parent_acct_environment" {
  type        = string
  description = "Name of the environment responsible for the acct resources used, affects things like DNS zone. Useful for named dev environments"
  default     = "main"
}

variable "shared_infra_account_id" {
  type        = string
  description = "The AWS Account ID of the shared infrastructure account"
  default     = "000000000000"
}

###
# Notify AI PoC variables
###

# Prompt Config
variable "prompt_model" {
  type        = string
  description = "Model name to use for the prompt"
}

variable "prompt_max_tokens_to_sample" {
  type        = number
  description = "Maximum number of tokens to sample for the prompt"
}

variable "prompt_temperature" {
  type        = number
  description = "Temperature setting for the prompt"
}

variable "prompt_top_p" {
  type        = number
  description = "Top-p setting for the prompt"
}

# Evaluation Config
variable "evaluation_evaluator_model_identifier" {
  type        = string
  description = "Full identifier of the model to use for the evaluation evaluator"
}

variable "evaluation_inference_model_identifier" {
  type        = string
  description = "Full identifier of the model to use for the evaluation inferance"
}

variable "evaluation_schedule_days" {
  type        = string
  description = "The amount of days between automated evaluations being run NOTE: Set quite high for dev envrionments, to lower costs"

}
variable "container_image_tag_suffix" {
  type        = string
  description = "Suffix used for container/image based Lambda image tags"
  default     = "latest"
}

variable "frontend_hosting_mode" {
  type        = string
  description = "Frontend hosting mode. Use 'amplify' for Amplify Hosting or 'apprunner' for legacy App Runner hosting."
  default     = "amplify"

  validation {
    condition     = contains(["amplify", "apprunner"], var.frontend_hosting_mode)
    error_message = "frontend_hosting_mode must be either 'amplify' or 'apprunner'."
  }
}

variable "branch_name" {
  type        = string
  description = "Source control branch name used for Amplify branch mapping (for example feature branches in PR preview environments)."
  default     = ""
}

variable "frontend_repository" {
  type        = string
  description = "Git repository URL connected to Amplify for frontend builds (for example https://github.com/NHSDigital/nhs-notify-admail)."
  default     = ""
}

variable "frontend_repository_access_token" {
  type        = string
  description = "Access token used by Amplify to connect to the frontend repository."
  default     = ""
  sensitive   = true
}

variable "enable_amplify_domain_association" {
  type        = bool
  description = "Whether to create an Amplify domain association for the admail hosted zone."
  default     = false
}
