# VPC - Terraform

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
| <a name="input_component"></a> [component](#input\_component) | Component name, used to construct resource names | `string` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Environment name, used to construct resource names | `string` | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | Project name, used to construct resource names | `string` | n/a | yes |
| <a name="input_region"></a> [region](#input\_region) | AWS region, used to construct VPC endpoint service names | `string` | n/a | yes |
## Modules

No modules.
## Outputs

| Name | Description |
|------|-------------|
| <a name="output_private_subnet_ids"></a> [private\_subnet\_ids](#output\_private\_subnet\_ids) | IDs of the private subnets (for ECS Fargate tasks) |
| <a name="output_public_subnet_ids"></a> [public\_subnet\_ids](#output\_public\_subnet\_ids) | IDs of the public subnets (for the Application Load Balancer) |
| <a name="output_s3_prefix_list_id"></a> [s3\_prefix\_list\_id](#output\_s3\_prefix\_list\_id) | ID of the AWS-managed prefix list for S3 in the configured region (use in egress rules targeting the S3 gateway endpoint) |
| <a name="output_vpc_endpoint_security_group_id"></a> [vpc\_endpoint\_security\_group\_id](#output\_vpc\_endpoint\_security\_group\_id) | ID of the security group attached to all interface VPC endpoints |
| <a name="output_vpc_id"></a> [vpc\_id](#output\_vpc\_id) | ID of the VPC |
<!-- vale on -->
<!-- markdownlint-enable -->
<!-- END_TF_DOCS -->
