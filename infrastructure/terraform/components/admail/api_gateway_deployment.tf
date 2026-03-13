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
      aws_api_gateway_authorizer.cognito.id
    ]))
  }
  lifecycle {
    create_before_destroy = true
  }
  depends_on = [aws_api_gateway_account.main]
}
