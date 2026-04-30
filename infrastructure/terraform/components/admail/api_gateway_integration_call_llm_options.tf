resource "aws_api_gateway_integration" "call_llm_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.call_llm.id
  http_method = aws_api_gateway_method.call_llm_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration_response" "call_llm_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.call_llm.id
  http_method = aws_api_gateway_method.call_llm_options.http_method
  status_code = aws_api_gateway_method_response.call_llm_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'",
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'",
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
  }
  response_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
  depends_on = [aws_api_gateway_integration.call_llm_options]
}
