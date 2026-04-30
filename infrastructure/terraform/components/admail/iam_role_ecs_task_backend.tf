resource "aws_iam_role" "ecs_task_backend" {
  name               = "${local.csi}-ecs-task-backend"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json
}

resource "aws_iam_policy" "ecs_task_backend_s3" {
  name        = "${local.csi}-ecs-task-backend-s3"
  description = "Policy for ECS backend task to read from the prompt logging S3 bucket"
  policy      = data.aws_iam_policy_document.ecs_task_backend_s3.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_backend_s3" {
  role       = aws_iam_role.ecs_task_backend.name
  policy_arn = aws_iam_policy.ecs_task_backend_s3.arn
}

data "aws_iam_policy_document" "ecs_task_backend_s3" {
  statement {
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetObject",
    ]
    resources = [
      module.s3bucket_lambda_prompt_logging.arn,
      "${module.s3bucket_lambda_prompt_logging.arn}/*",
    ]
  }
}
