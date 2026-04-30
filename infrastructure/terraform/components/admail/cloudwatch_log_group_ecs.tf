resource "aws_cloudwatch_log_group" "ecs_backend" {
  name              = "/ecs/${local.csi}-backend"
  retention_in_days = var.log_retention_in_days
}

resource "aws_cloudwatch_log_group" "ecs_frontend" {
  name              = "/ecs/${local.csi}-frontend"
  retention_in_days = var.log_retention_in_days
}
