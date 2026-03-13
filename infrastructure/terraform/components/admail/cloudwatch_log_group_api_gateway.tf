resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "${local.csi}-api-gateway-logs"
  retention_in_days = 14
}
