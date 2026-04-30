resource "aws_ecs_cluster" "main" {
  name = local.csi

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}
