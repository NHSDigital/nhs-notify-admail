resource "aws_apprunner_service" "service_backend" {
  service_name = "${local.csi}-backend"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_role.arn
    }

    image_repository {
      image_configuration {
        port = "8080"
        runtime_environment_variables = {
          COGNITO_REGION                = var.region
          COGNITO_USER_POOL_ID          = aws_cognito_user_pool.main.id
          COGNITO_APP_CLIENT_ID         = aws_cognito_user_pool_client.main.id
          S3_LLM_LOGS_BUCKET            = module.s3bucket_lambda_prompt_logging.id
          S3_LLM_LOGS_DIRECTORY         = "${aws_s3_object.lambda_prompt_logging_s3_bucket_object.key}"
          S3_LLM_LOGS_BUCKET_ACCOUNT_ID = var.aws_account_id
        }
      }

      image_identifier      = "${local.ecr_repository_url}:${var.project}-${var.environment}-${local.component}-backend-${var.container_image_tag_suffix}"
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
    cpu               = "1024"
    memory            = "2048"
    instance_role_arn = aws_iam_role.apprunner_ecr_role.arn
  }
}
