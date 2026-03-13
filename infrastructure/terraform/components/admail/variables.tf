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

variable "log_retention_in_days" {
  type        = number
  description = "The retention period in days for the Cloudwatch Logs events to be retained, default of 0 is indefinite"
  default     = 0
}

variable "force_lambda_code_deploy" {
  type        = bool
  description = "If the lambda package in s3 has the same commit id tag as the terraform build branch, the lambda will not update automatically. Set to True if making changes to Lambda code from on the same commit for example during development"
  default     = false
}

variable "parent_acct_environment" {
  type        = string
  description = "Name of the environment responsible for the acct resources used, affects things like DNS zone. Useful for named dev environments"
  default     = "main"
}

###
# Notify AI PoC variables
###

# General Config
variable "first-run" {
  description = "Doesn't create resources that are dependant on an external stimulus the first time, i.e. App Runner won't work first time, as it needs a docker container we upload after terraform, in the Github action"
  type        = bool
}


# Prompt Config
variable "prompt-model" {
  type        = string
  description = "Model name to use for the prompt"
}

variable "prompt-max-tokens-to-sample" {
  type        = number
  description = "Maximum number of tokens to sample for the prompt"
}

variable "prompt-temperature" {
  type        = number
  description = "Temperature setting for the prompt"
}

variable "prompt-top-p" {
  type        = number
  description = "Top-p setting for the prompt"
}

# Evaluation Config
variable "evaluation-evaluator-model-identifier" {
  type        = string
  description = "Full identifier of the model to use for the evaluation evaluator"
}

variable "evaluation-inference-model-identifier" {
  type        = string
  description = "Full identifier of the model to use for the evaluation inferance"
}

variable "evaluation-schedule-days" {
  type        = string
  description = "The amount of days between automated evaluations being run NOTE: Set quite high for dev envrionments, to lower costs"
}
