resource "aws_cloudwatch_event_target" "invoke_alerts_lambda_on_results_upload" {
  rule      = aws_cloudwatch_event_rule.evaluation_results_uploaded.name
  target_id = "InvokeAlertsLambda"
  arn       = module.bedrock_evaluations_alerts.function_arn

  input_transformer {
    input_paths = {
      "bucket" = "$.detail.bucket.name",
      "key"    = "$.detail.object.key"
    }
    input_template = <<EOF
    {
      "message": "Object created in bucket <bucket> with key <key>.",
      "s3_bucket": <bucket>,
      "s3_key": <key>
    }
    EOF
  }
}
