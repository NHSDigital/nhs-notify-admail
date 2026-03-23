resource "aws_api_gateway_rest_api" "main" {
  name        = "${local.csi}-api-gateway-rest-api"
  description = "API Gateway for Bedrock Messager with Cognito authentication"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}
