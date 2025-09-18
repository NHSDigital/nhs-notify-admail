resource "aws_sns_topic" "admail_eval_alerts_topic" {
  name = "${local.csi}-notifyai-eval-alerts"
  tags = local.default_tags

}
resource "aws_sns_topic_subscription" "admail_eval_alerts_subscription" {
  topic_arn = aws_sns_topic.admail_eval_alerts_topic.arn
  protocol  = "email"
  endpoint  = "admail-eval-alerts@example.com"
}
