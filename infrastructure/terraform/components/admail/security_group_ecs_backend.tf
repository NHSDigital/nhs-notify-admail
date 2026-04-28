resource "aws_security_group" "ecs_backend" {
  name        = "${local.csi}-ecs-backend"
  description = "Security group for backend ECS Fargate tasks"
  vpc_id      = local.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "ecs_backend_from_alb" {
  description                  = "Allow traffic from ALB on container port"
  security_group_id            = aws_security_group.ecs_backend.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_vpc_security_group_egress_rule" "ecs_backend_to_vpc_endpoints" {
  description                  = "Allow HTTPS to interface VPC endpoints (ECR, CloudWatch Logs, Bedrock)"
  security_group_id            = aws_security_group.ecs_backend.id
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  referenced_security_group_id = module.vpc.vpc_endpoint_security_group_id
}

resource "aws_vpc_security_group_egress_rule" "ecs_backend_to_s3" {
  description       = "Allow HTTPS to S3 via gateway endpoint (ECR image layers and prompt logging bucket)"
  security_group_id = aws_security_group.ecs_backend.id
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  prefix_list_id    = module.vpc.s3_prefix_list_id
}
