resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.call_llm.id,
      aws_api_gateway_method.call_llm_post.id,
      aws_api_gateway_method.call_llm_options.id,
      aws_api_gateway_integration.call_llm_post.id,
      aws_api_gateway_integration.call_llm_options.id,
      aws_api_gateway_method_response.call_llm_post.id,
      aws_api_gateway_method_response.call_llm_options.id,
      aws_api_gateway_integration_response.call_llm_options.id,
      aws_api_gateway_authorizer.cognito.id,
      aws_api_gateway_gateway_response.unauthorized.id,
      aws_api_gateway_gateway_response.access_denied.id,
      aws_api_gateway_gateway_response.default_4xx.id,
      aws_api_gateway_gateway_response.default_5xx.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}
