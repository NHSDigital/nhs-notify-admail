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
| <a name="input_component"></a> [component](#input\_component) | The variable encapsulating the name of this component | `string` | `"notifyai"` | no |
| <a name="input_default_tags"></a> [default\_tags](#input\_default\_tags) | A map of default tags to apply to all taggable resources within the component | `map(string)` | `{}` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | The name of the tfscaffold environment | `string` | n/a | yes |
| <a name="input_evaluation-evaluator-model-identifier"></a> [evaluation-evaluator-model-identifier](#input\_evaluation-evaluator-model-identifier) | Full identifier of the model to use for the evaluation evaluator | `string` | n/a | yes |
| <a name="input_evaluation-inference-model-identifier"></a> [evaluation-inference-model-identifier](#input\_evaluation-inference-model-identifier) | Full identifier of the model to use for the evaluation inferance | `string` | n/a | yes |
| <a name="input_first-run"></a> [first-run](#input\_first-run) | Doesn't create resources that are dependant on an external stimulus the first time, i.e. App Runner won't work first time, as it needs a docker container we upload after terraform, in the Github action | `bool` | n/a | yes |
| <a name="input_group"></a> [group](#input\_group) | The group variables are being inherited from (often synonmous with account short-name) | `string` | n/a | yes |
| <a name="input_log_retention_in_days"></a> [log\_retention\_in\_days](#input\_log\_retention\_in\_days) | The retention period in days for the Cloudwatch Logs events to be retained, default of 0 is indefinite | `number` | `0` | no |
| <a name="input_project"></a> [project](#input\_project) | The name of the tfscaffold project | `string` | n/a | yes |
| <a name="input_prompt-max-tokens-to-sample"></a> [prompt-max-tokens-to-sample](#input\_prompt-max-tokens-to-sample) | Maximum number of tokens to sample for the prompt | `number` | n/a | yes |
| <a name="input_prompt-model"></a> [prompt-model](#input\_prompt-model) | Model name to use for the prompt | `string` | n/a | yes |
| <a name="input_prompt-temperature"></a> [prompt-temperature](#input\_prompt-temperature) | Temperature setting for the prompt | `number` | n/a | yes |
| <a name="input_prompt-top-p"></a> [prompt-top-p](#input\_prompt-top-p) | Top-p setting for the prompt | `number` | n/a | yes |
| <a name="input_region"></a> [region](#input\_region) | The AWS Region | `string` | n/a | yes |
## Modules

No modules.
## Outputs

| Name | Description |
|------|-------------|
| <a name="output_bedrock_evaluation_prompt_dataset_s3_uri"></a> [bedrock\_evaluation\_prompt\_dataset\_s3\_uri](#output\_bedrock\_evaluation\_prompt\_dataset\_s3\_uri) | S3 URI for the Bedrock evaluation prompt dataset |
| <a name="output_bedrock_evaluation_results_s3_uri"></a> [bedrock\_evaluation\_results\_s3\_uri](#output\_bedrock\_evaluation\_results\_s3\_uri) | S3 URI for the Bedrock evaluation results |
| <a name="output_bedrock_role_arn"></a> [bedrock\_role\_arn](#output\_bedrock\_role\_arn) | ARN of the IAM role for Bedrock automatic evaluation |
| <a name="output_evaluation-evaluator-model-identifier"></a> [evaluation-evaluator-model-identifier](#output\_evaluation-evaluator-model-identifier) | Identifier for the Bedrock evaluator model |
| <a name="output_evaluation-inference-model-identifier"></a> [evaluation-inference-model-identifier](#output\_evaluation-inference-model-identifier) | Identifier for the Bedrock inference model |
| <a name="output_notifai_backend_ecr_repository_url"></a> [notifai\_backend\_ecr\_repository\_url](#output\_notifai\_backend\_ecr\_repository\_url) | The URL of the Notifai backend ECR repository |
| <a name="output_notifai_frontend_ecr_repository_url"></a> [notifai\_frontend\_ecr\_repository\_url](#output\_notifai\_frontend\_ecr\_repository\_url) | The URL of the Notifai frontend ECR repository |
<!-- vale on -->
<!-- markdownlint-enable -->
<!-- END_TF_DOCS -->
