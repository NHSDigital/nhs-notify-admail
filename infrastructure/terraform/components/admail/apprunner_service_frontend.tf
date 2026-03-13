resource "aws_apprunner_service" "notifai_frontend_service" {
  service_name = "${local.csi}-frontend"
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
          REACT_APP_API_GATEWAY          = "${aws_api_gateway_stage.main.invoke_url}/${local.api-gateway-llm-path-param}"
        }
      }
      image_identifier      = "${aws_ecr_repository.frontend.repository_url}:latest"
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
