resource "aws_security_group" "ecs_frontend" {
  name        = "${local.csi}-ecs-frontend"
  description = "Security group for frontend ECS Fargate tasks"
  vpc_id      = local.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "ecs_frontend_http_from_alb" {
  description                  = "Allow HTTP traffic from the ALB"
  security_group_id            = aws_security_group.ecs_frontend.id
  from_port                    = 80
  to_port                      = 80
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_vpc_security_group_egress_rule" "ecs_frontend_to_vpc_endpoints" {
  description                  = "Allow HTTPS to VPC interface endpoints (ECR, CloudWatch Logs)"
  security_group_id            = aws_security_group.ecs_frontend.id
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  referenced_security_group_id = module.vpc.vpc_endpoint_security_group_id
}

resource "aws_vpc_security_group_egress_rule" "ecs_frontend_to_s3" {
  description       = "Allow HTTPS to S3 via gateway endpoint (ECR image layer pulls)"
  security_group_id = aws_security_group.ecs_frontend.id
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  prefix_list_id    = module.vpc.s3_prefix_list_id
}
