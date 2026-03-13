resource "aws_cloudwatch_log_group" "bedrock_lambda_evaluations" {
  name              = "/aws/lambda/${module.bedrock_evaluations.function_name}"
  retention_in_days = var.log_retention_in_days

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [tags]
  }

  tags = merge(
    local.default_tags,
    {
      Name = module.bedrock_evaluations.function_name
    },
  )
}
