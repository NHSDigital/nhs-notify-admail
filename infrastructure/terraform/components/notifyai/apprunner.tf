resource "aws_iam_role" "apprunner_ecr_role" {
  name = "${local.csi}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole",
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        },
        Effect = "Allow",
        Sid    = ""
      },
      {
        Action = "sts:AssumeRole",
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        },
        Effect = "Allow",
        Sid    = ""
      },
    ]
  })
}

resource "aws_iam_policy" "apprunner_ecr_policy" {
  name        = "${local.csi}"
  description = "Policy for App Runner to access ECR"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:DescribeImages",
        ],
        Effect   = "Allow",
        Resource = "*" #TODO: Lock this down a bit once the ECR is in TF, an almost-there example is below
        # Resource = "arn:aws:ecr:${var.region}:${var.aws_account_id}:repository/notifai" #TODO: update the repo name at the end, once we have ECR in TF
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_attach" {
  role       = aws_iam_role.apprunner_ecr_role.name
  policy_arn = aws_iam_policy.apprunner_ecr_policy.arn
}

resource "random_password" "app-runner-basic-auth-random-password" {
  length           = 20
  special          = true
  override_special = "!@#$%^&*()-_=+"
}

resource "aws_apprunner_service" "notifai_frontend_service" {
  service_name = "${local.csi}"
  count        = var.first-run ? 0 : 1

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_role.arn
    }
    auto_deployments_enabled = true
    image_repository {
      image_configuration {
        port = "80"
        runtime_environment_variables = {
          REACT_APP_BACKEND_API_BASE_URL = "${aws_apprunner_service.notifai_backend_service[0].service_url}"
          REACT_APP_COGNITO_ID           = aws_cognito_user_pool_client.main.id
          REACT_APP_COGNITO_USER_POOL_ID = aws_cognito_user_pool_client.main.user_pool_id
          REACT_APP_API_GATEWAY          = "${aws_api_gateway_stage.main.invoke_url}/${local.prompt-llm}"
        }
      }
      image_identifier      = "${aws_ecr_repository.notifai-frontend.repository_url}:latest"
      image_repository_type = "ECR"
    }
  }

  network_configuration {
    ingress_configuration {
      is_publicly_accessible = true
    }
    egress_configuration {
      egress_type = "DEFAULT"
    }
  }

  health_check_configuration {
    healthy_threshold   = 1
    interval            = 5
    path                = "/"
    protocol            = "TCP"
    timeout             = 2
    unhealthy_threshold = 5
  }

  instance_configuration {
    cpu    = "1024"
    memory = "2048"
  }
}

resource "aws_apprunner_service" "notifai_backend_service" {
  service_name = "${local.csi}"
  count        = var.first-run ? 0 : 1

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_role.arn
    }
    image_repository {
      image_configuration {
        port          = "8080"
        start_command = "fastapi run main.py --port 8080"
        runtime_environment_variables = {
          ENV_BASIC_AUTH_USERNAME = var.apprunner-basic-auth-username
          ENV_BASIC_AUTH_PASSWORD = random_password.app-runner-basic-auth-random-password.result #TODO: get this from secret storage
        }
      }
      image_identifier      = "${aws_ecr_repository.notifai-backend.repository_url}:latest"
      image_repository_type = "ECR"
    }
    auto_deployments_enabled = true
  }

  network_configuration {
    ingress_configuration {
      is_publicly_accessible = true
    }
    egress_configuration {
      egress_type = "DEFAULT"
      # egress_type       = "VPC"
      # vpc_connector_arn = aws_apprunner_vpc_connector.app_vpc_connector.arn
    }
  }

  health_check_configuration {
    healthy_threshold   = 1
    interval            = 5
    path                = "/"
    protocol            = "TCP"
    timeout             = 2
    unhealthy_threshold = 5
  }

  instance_configuration {
    cpu    = "1024"
    memory = "2048"
  }
}

# resource "aws_apprunner_vpc_ingress_connection" "notifai_backend_service_ingress_connection" {
#   name        = "${var.environment}-app-ingress-conn"
#   service_arn = aws_apprunner_service.notifai_backend_service.arn

#   ingress_vpc_configuration {
#     vpc_id          = aws_vpc.app_vpc.id
#     vpc_endpoint_id = aws_vpc_endpoint.vpc_endpoint_apprunner_ingress.id
#   }
# }
