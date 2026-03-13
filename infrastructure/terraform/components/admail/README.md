<!-- BEGIN_TF_DOCS -->
<!-- markdownlint-disable -->
<!-- vale off -->

## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.9.0 |
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 6.0 |
## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_aws_account_id"></a> [aws\_account\_id](#input\_aws\_account\_id) | The AWS Account ID (numeric) | `string` | n/a | yes |
| <a name="input_default_tags"></a> [default\_tags](#input\_default\_tags) | A map of default tags to apply to all taggable resources within the component | `map(string)` | `{}` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | The name of the tfscaffold environment | `string` | n/a | yes |
| <a name="input_evaluation-evaluator-model-identifier"></a> [evaluation-evaluator-model-identifier](#input\_evaluation-evaluator-model-identifier) | Full identifier of the model to use for the evaluation evaluator | `string` | n/a | yes |
| <a name="input_evaluation-inference-model-identifier"></a> [evaluation-inference-model-identifier](#input\_evaluation-inference-model-identifier) | Full identifier of the model to use for the evaluation inferance | `string` | n/a | yes |
| <a name="input_evaluation-schedule-days"></a> [evaluation-schedule-days](#input\_evaluation-schedule-days) | The amount of days between automated evaluations being run NOTE: Set quite high for dev envrionments, to lower costs | `string` | n/a | yes |
| <a name="input_first-run"></a> [first-run](#input\_first-run) | Doesn't create resources that are dependant on an external stimulus the first time, i.e. App Runner won't work first time, as it needs a docker container we upload after terraform, in the Github action | `bool` | n/a | yes |
| <a name="input_force_destroy"></a> [force\_destroy](#input\_force\_destroy) | Flag to force deletion of S3 buckets | `bool` | `false` | no |
| <a name="input_force_lambda_code_deploy"></a> [force\_lambda\_code\_deploy](#input\_force\_lambda\_code\_deploy) | If the lambda package in s3 has the same commit id tag as the terraform build branch, the lambda will not update automatically. Set to True if making changes to Lambda code from on the same commit for example during development | `bool` | `false` | no |
| <a name="input_group"></a> [group](#input\_group) | The group variables are being inherited from (often synonmous with account short-name) | `string` | n/a | yes |
| <a name="input_kms_deletion_window"></a> [kms\_deletion\_window](#input\_kms\_deletion\_window) | When a kms key is deleted, how long should it wait in the pending deletion state? | `string` | `"30"` | no |
| <a name="input_log_level"></a> [log\_level](#input\_log\_level) | The log level to be used in lambda functions within the component. Any log with a lower severity than the configured value will not be logged: https://docs.python.org/3/library/logging.html#levels | `string` | `"INFO"` | no |
| <a name="input_log_retention_in_days"></a> [log\_retention\_in\_days](#input\_log\_retention\_in\_days) | The retention period in days for the Cloudwatch Logs events to be retained, default of 0 is indefinite | `number` | `0` | no |
| <a name="input_parent_acct_environment"></a> [parent\_acct\_environment](#input\_parent\_acct\_environment) | Name of the environment responsible for the acct resources used, affects things like DNS zone. Useful for named dev environments | `string` | `"main"` | no |
| <a name="input_project"></a> [project](#input\_project) | The name of the tfscaffold project | `string` | n/a | yes |
| <a name="input_prompt-max-tokens-to-sample"></a> [prompt-max-tokens-to-sample](#input\_prompt-max-tokens-to-sample) | Maximum number of tokens to sample for the prompt | `number` | n/a | yes |
| <a name="input_prompt-model"></a> [prompt-model](#input\_prompt-model) | Model name to use for the prompt | `string` | n/a | yes |
| <a name="input_prompt-temperature"></a> [prompt-temperature](#input\_prompt-temperature) | Temperature setting for the prompt | `number` | n/a | yes |
| <a name="input_prompt-top-p"></a> [prompt-top-p](#input\_prompt-top-p) | Top-p setting for the prompt | `number` | n/a | yes |
| <a name="input_region"></a> [region](#input\_region) | The AWS Region | `string` | n/a | yes |
| <a name="input_shared_infra_account_id"></a> [shared\_infra\_account\_id](#input\_shared\_infra\_account\_id) | The AWS Account ID of the shared infrastructure account | `string` | `"000000000000"` | no |
## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_bedrock_evaluations"></a> [bedrock\_evaluations](#module\_bedrock\_evaluations) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-lambda.zip | n/a |
| <a name="module_bedrock_evaluations_alerts"></a> [bedrock\_evaluations\_alerts](#module\_bedrock\_evaluations\_alerts) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-lambda.zip | n/a |
| <a name="module_bedrock_messager"></a> [bedrock\_messager](#module\_bedrock\_messager) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-lambda.zip | n/a |
| <a name="module_eventbridge"></a> [eventbridge](#module\_eventbridge) | terraform-aws-modules/eventbridge/aws | ~> 3.0 |
| <a name="module_s3bucket_evaluation_input_prompts"></a> [s3bucket\_evaluation\_input\_prompts](#module\_s3bucket\_evaluation\_input\_prompts) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-s3bucket.zip | n/a |
| <a name="module_s3bucket_evaluation_results"></a> [s3bucket\_evaluation\_results](#module\_s3bucket\_evaluation\_results) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-s3bucket.zip | n/a |
| <a name="module_s3bucket_lambda_prompt_logging"></a> [s3bucket\_lambda\_prompt\_logging](#module\_s3bucket\_lambda\_prompt\_logging) | https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-s3bucket.zip | n/a |
## Outputs

| Name | Description |
|------|-------------|
| <a name="output_backend_ecr_repository_url"></a> [backend\_ecr\_repository\_url](#output\_backend\_ecr\_repository\_url) | The URL of the Notifai backend ECR repository |
| <a name="output_bedrock-guardrail-arn"></a> [bedrock-guardrail-arn](#output\_bedrock-guardrail-arn) | n/a |
| <a name="output_bedrock_evaluation_prompt_dataset_s3_uri"></a> [bedrock\_evaluation\_prompt\_dataset\_s3\_uri](#output\_bedrock\_evaluation\_prompt\_dataset\_s3\_uri) | S3 URI for the Bedrock evaluation prompt dataset |
| <a name="output_bedrock_evaluation_results_s3_uri"></a> [bedrock\_evaluation\_results\_s3\_uri](#output\_bedrock\_evaluation\_results\_s3\_uri) | S3 URI for the Bedrock evaluation results |
| <a name="output_bedrock_role_arn"></a> [bedrock\_role\_arn](#output\_bedrock\_role\_arn) | ARN of the IAM role for Bedrock automatic evaluation |
| <a name="output_evaluation-evaluator-model-identifier"></a> [evaluation-evaluator-model-identifier](#output\_evaluation-evaluator-model-identifier) | Identifier for the Bedrock evaluator model |
| <a name="output_evaluation-inference-model-identifier"></a> [evaluation-inference-model-identifier](#output\_evaluation-inference-model-identifier) | Identifier for the Bedrock inference model |
| <a name="output_frontend_ecr_repository_url"></a> [frontend\_ecr\_repository\_url](#output\_frontend\_ecr\_repository\_url) | The URL of the Notifai frontend ECR repository |
<!-- vale on -->
<!-- markdownlint-enable -->
<!-- END_TF_DOCS -->
