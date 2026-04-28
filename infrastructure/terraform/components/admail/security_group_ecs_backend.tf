resource "aws_security_group" "ecs_backend" {
  name        = "${local.csi}-ecs-backend"
  description = "Security group for backend ECS Fargate tasks"
  vpc_id      = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "ecs_backend_from_alb" {
  description                  = "Allow traffic from ALB on container port"
  security_group_id            = aws_security_group.ecs_backend.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_vpc_security_group_egress_rule" "ecs_backend_allow_all_outbound" {
  description       = "Allow all outbound traffic"
  security_group_id = aws_security_group.ecs_backend.id
  from_port         = -1
  to_port           = -1
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
