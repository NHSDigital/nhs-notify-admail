resource "aws_sns_topic" "admail_eval_alerts_topic" {
  name = "${local.csi}-notifyai-eval-alerts"
  tags = local.default_tags
}
