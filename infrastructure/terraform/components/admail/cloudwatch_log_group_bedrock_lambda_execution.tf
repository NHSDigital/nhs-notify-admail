resource "aws_cloudwatch_log_group" "bedrock_lambda_execution" {
  name              = "/aws/lambda/${module.bedrock_messager.function_name}"
  retention_in_days = var.log_retention_in_days

  tags = merge(
    local.default_tags,
    {
      Name = module.bedrock_messager.function_name
    },
  )
}
