resource "aws_iam_role" "ecs_task_execution" {
  name               = "${local.csi}-ecs-task-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json
}

data "aws_iam_policy_document" "ecs_task_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "ecs_task_execution" {
  name        = "${local.csi}-ecs-task-execution"
  description = "ECS task execution policy for ECR image pull and CloudWatch log delivery"
  policy      = data.aws_iam_policy_document.ecs_task_execution.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = aws_iam_policy.ecs_task_execution.arn
}

data "aws_iam_policy_document" "ecs_task_execution" {
  # GetAuthorizationToken is a service-level action and must target "*"
  statement {
    sid       = "AllowECRAuthToken"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "AllowECRImagePull"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:DescribeImages",
    ]
    resources = [data.aws_ecr_repository.main.arn]
  }

  statement {
    sid    = "AllowCloudWatchLogDelivery"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = [
      "${aws_cloudwatch_log_group.ecs_backend.arn}:*",
      "${aws_cloudwatch_log_group.ecs_frontend.arn}:*",
    ]
  }
}
