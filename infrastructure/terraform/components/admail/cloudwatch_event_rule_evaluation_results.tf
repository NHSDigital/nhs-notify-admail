resource "aws_cloudwatch_event_rule" "evaluation_results_uploaded" {
  name        = "${local.csi}-evaluation-results-uploaded-rule"
  description = "Triggers a Lambda when evaluation results are uploaded to S3"

  event_pattern = jsonencode({
    "source" : ["aws.s3"],
    "detail-type" : ["Object Created"],
    "detail" : {
      "bucket" : {
        "name" : [module.s3bucket_evaluation_results.id]
      }
    }
  })

  depends_on = [aws_s3_bucket_notification.bucket_notification]
}
