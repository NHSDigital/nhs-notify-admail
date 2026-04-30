resource "aws_ecs_task_definition" "frontend" {
  family                   = "${local.csi}-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name  = "${local.csi}-frontend"
      image = "${local.ecr_repository_url}:${var.project}-${var.environment}-${local.component}-frontend-${var.container_image_tag_suffix}"

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "REACT_APP_BACKEND_API_BASE_URL", value = "http://${aws_lb.main.dns_name}" },
        { name = "REACT_APP_COGNITO_ID", value = aws_cognito_user_pool_client.main.id },
        { name = "REACT_APP_COGNITO_USER_POOL_ID", value = aws_cognito_user_pool_client.main.user_pool_id },
        { name = "REACT_APP_API_GATEWAY", value = "${aws_api_gateway_stage.main.invoke_url}/${local.api_gateway_llm_path_param}" },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs_frontend.name
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}
