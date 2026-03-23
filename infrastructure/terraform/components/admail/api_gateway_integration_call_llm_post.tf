resource "aws_api_gateway_integration" "call_llm_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.call_llm.id
  http_method             = aws_api_gateway_method.call_llm_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = module.bedrock_messager.function_invoke_arn
}
