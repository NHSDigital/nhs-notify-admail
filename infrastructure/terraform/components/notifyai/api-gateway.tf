resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.service_name}-${var.environment}-api"
  description = "API Gateway for Bedrock Messager with Cognito authentication"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Environment = var.environment
    Service     = var.service_name
    Source      = "Terraform"
  }
}

resource "aws_api_gateway_authorizer" "cognito" {
  name            = "CognitoAuthorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.main.arn]
  identity_source = "method.request.header.Authorization"
}

resource "aws_api_gateway_resource" "call_llm" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "call-llm"
}

resource "aws_api_gateway_method" "call_llm_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.call_llm.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_method" "call_llm_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.call_llm.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "call_llm_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.call_llm.id
  http_method             = aws_api_gateway_method.call_llm_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.bedrock-messager.invoke_arn
}

resource "aws_api_gateway_integration" "call_llm_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.call_llm.id
  http_method = aws_api_gateway_method.call_llm_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "call_llm_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.call_llm.id
  http_method = aws_api_gateway_method.call_llm_post.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "call_llm_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.call_llm.id
  http_method = aws_api_gateway_method.call_llm_post.http_method
  status_code = aws_api_gateway_method_response.call_llm_post.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'${local.frontend_origin}'"
  }
  depends_on = [aws_api_gateway_integration.call_llm_post]
}

resource "aws_api_gateway_method_response" "call_llm_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.call_llm.id
  http_method = aws_api_gateway_method.call_llm_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Methods" = true,
    "method.response.header.Access-Control-Allow-Headers" = true,
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "call_llm_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.call_llm.id
  http_method = aws_api_gateway_method.call_llm_options.http_method
  status_code = aws_api_gateway_method_response.call_llm_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.frontend_origin}'",
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'",
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
  }
  response_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }


  depends_on = [aws_api_gateway_integration.call_llm_options]
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bedrock-messager.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/${aws_api_gateway_method.call_llm_post.http_method}${aws_api_gateway_resource.call_llm.path}"
}

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.call_llm.id,
      aws_api_gateway_method.call_llm_post.id,
      aws_api_gateway_method.call_llm_options.id,
      aws_api_gateway_integration.call_llm_post.id,
      aws_api_gateway_integration.call_llm_options.id,
      aws_api_gateway_authorizer.cognito.id,
    ]))
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "main" {
  deployment_id        = aws_api_gateway_deployment.main.id
  rest_api_id          = aws_api_gateway_rest_api.main.id
  stage_name           = var.environment
  xray_tracing_enabled = true
  tags = {
    Environment = var.environment
    Service     = var.service_name
    Source      = "Terraform"
  }
}

output "api_gateway_url" {
  description = "API Gateway Invoke URL"
  value       = aws_api_gateway_stage.main.invoke_url
}
