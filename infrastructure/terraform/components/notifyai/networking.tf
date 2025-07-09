# locals {
#   notifai-vpc-cidr-range = "10.0.2.0/23"
#   vpc-name               = "${local.csi}-app-vpc"
# }

# #trivy:ignore:AVD-AWS-0178 TODO: VPC Flowlogs for a PoC is excessive
# resource "aws_vpc" "app_vpc" {
#   cidr_block = local.notifai-vpc-cidr-range
#   tags = {
#     Name = local.vpc-name
#   }
# }

# resource "aws_subnet" "app_runner_subnet_1" {
#   vpc_id            = aws_vpc.app_vpc.id
#   cidr_block        = "10.0.2.0/24"
#   availability_zone = "eu-west-1a"
#   tags = {
#     Name = "${local.vpc-name}-eu-west-1a"
#   }
# }

# resource "aws_subnet" "app_runner_subnet_2" {
#   vpc_id            = aws_vpc.app_vpc.id
#   cidr_block        = "10.0.3.0/24"
#   availability_zone = "eu-west-1b"
#   tags = {
#     Name = "${local.vpc-name}-eu-west-1b"
#   }
# }

# resource "aws_apprunner_vpc_connector" "app_vpc_connector" {
#   vpc_connector_name = "${local.csi}-app-vpc-connector"
#   subnets = [
#     aws_subnet.app_runner_subnet_1.id,
#     aws_subnet.app_runner_subnet_2.id,
#   ]
#   security_groups = [aws_security_group.app_runner_sg.id]
# }

# resource "aws_security_group" "app_runner_sg" {
#   name   = "${local.csi}-app-runner-sg"
#   vpc_id = aws_vpc.app_vpc.id

#   ingress {
#     from_port   = 80
#     to_port     = 80
#     protocol    = "tcp"
#     cidr_blocks = ["10.0.2.0/23"]
#   }

#   ingress {
#     from_port   = 8080
#     to_port     = 8080
#     protocol    = "tcp"
#     cidr_blocks = ["10.0.2.0/23"]
#   }

#   egress {
#     from_port   = 0
#     to_port     = 0
#     protocol    = "-1"
#     cidr_blocks = ["0.0.0.0/0"]
#   }
# }

# resource "aws_vpc_endpoint" "vpc_endpoint_apprunner_ingress" {
#   vpc_id             = aws_vpc.app_vpc.id
#   service_name       = "com.amazonaws.${var.region}.apprunner.requests"
#   vpc_endpoint_type  = "Interface"
#   subnet_ids         = [aws_subnet.app_runner_subnet_1.id, aws_subnet.app_runner_subnet_2.id]
#   security_group_ids = [aws_security_group.app_runner_sg.id]
# }
