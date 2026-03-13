resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = module.s3bucket_evaluation_results.id

  eventbridge = true # This flag enables sending notifications directly to EventBridge
}
