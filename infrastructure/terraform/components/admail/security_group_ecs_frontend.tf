resource "aws_security_group" "ecs_frontend" {
  name        = "${local.csi}-ecs-frontend"
  description = "Security group for frontend ECS Fargate tasks"
  vpc_id      = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "ecs_frontend_http_from_alb" {
  description                  = "Allow HTTP traffic from the ALB"
  security_group_id            = aws_security_group.ecs_frontend.id
  from_port                    = 80
  to_port                      = 80
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_vpc_security_group_egress_rule" "ecs_frontend_allow_all_outbound" {
  description       = "Allow all outbound traffic"
  security_group_id = aws_security_group.ecs_frontend.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
