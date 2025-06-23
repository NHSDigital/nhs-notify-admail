#General Config
variable "first-run" {
  description = "Doesn't create resources that are dependant on an external stimulus the first time, i.e. App Runner won't work first time, as it needs a docker container we upload after terraform, in the Github action"
  type        = bool
}

variable "environment" {
  description = "named environment, i.e. dev, test, prod. used for naming services, and picking config files when deploying"
  type        = string
}

variable "region" {
  description = "Default Region for Infra"
  type        = string
}

#Prompt Config
variable "prompt-name" {
  type        = string
  description = "Name for the prompt"
}

variable "prompt-description" {
  type        = string
  description = "Description for the prompt"
}

variable "prompt-input-text" {
  type        = string
  description = "Prompt Input Text"
}

variable "prompt-model-arn" {
  type        = string
  description = "Model arn to use for the prompt"
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

variable "prompt-top-k" {
  type        = number
  description = "Top-k setting for the prompt"
}

#Evaluation Config
variable "evaluation-evaluator-model-identifier" {
  type        = string
  description = "Full identifier of the model to use for the evaluation evaluator"
}

variable "evaluation-inference-model-identifier" {
  type        = string
  description = "Full identifier of the model to use for the evaluation inferance"
}
