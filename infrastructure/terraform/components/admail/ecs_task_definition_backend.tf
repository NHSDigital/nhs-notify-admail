resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.csi}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task_backend.arn

  container_definitions = jsonencode([
    {
      name  = "${local.csi}-backend"
      image = "${local.ecr_repository_url}:${var.project}-${var.environment}-${local.component}-backend-${var.container_image_tag_suffix}"

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "COGNITO_REGION", value = var.region },
        { name = "COGNITO_USER_POOL_ID", value = aws_cognito_user_pool.main.id },
        { name = "COGNITO_APP_CLIENT_ID", value = aws_cognito_user_pool_client.main.id },
        { name = "S3_LLM_LOGS_BUCKET", value = module.s3bucket_lambda_prompt_logging.id },
        { name = "S3_LLM_LOGS_DIRECTORY", value = aws_s3_object.lambda_prompt_logging_s3_bucket_object.key },
        { name = "S3_LLM_LOGS_BUCKET_ACCOUNT_ID", value = var.aws_account_id },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs_backend.name
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}
