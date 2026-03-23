resource "aws_iam_role" "apprunner_ecr_role" {
  name               = "${local.csi}-apprunner-ecr-role"
  assume_role_policy = data.aws_iam_policy_document.apprunner_assume_role.json
}

data "aws_iam_policy_document" "apprunner_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type = "Service"
      identifiers = [
        "build.apprunner.amazonaws.com",
        "tasks.apprunner.amazonaws.com"
      ]
    }
  }
}

resource "aws_iam_policy" "apprunner_ecr_policy" {
  name        = "${local.csi}-apprunner-ecr-policy"
  description = "Policy for App Runner to access ECR"
  policy      = data.aws_iam_policy_document.apprunner_ecr.json
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_attach" {
  role       = aws_iam_role.apprunner_ecr_role.name
  policy_arn = aws_iam_policy.apprunner_ecr_policy.arn
}

resource "aws_iam_policy" "apprunner_s3_policy" {
  name        = "${local.csi}-apprunner-s3-policy"
  description = "Policy for App Runner to access S3 bucket"
  policy      = data.aws_iam_policy_document.apprunner_s3.json
}

resource "aws_iam_role_policy_attachment" "apprunner_s3_attach" {
  role       = aws_iam_role.apprunner_ecr_role.name
  policy_arn = aws_iam_policy.apprunner_s3_policy.arn
}

data "aws_iam_policy_document" "apprunner_ecr" {
  # GetAuthorizationToken is a service-level action and must target "*"
  statement {
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:DescribeImages",
    ]
    resources = [
      data.aws_ecr_repository.main.arn,
    ]
  }
}

data "aws_iam_policy_document" "apprunner_s3" {
  statement {
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetObject"
    ]
    resources = [
      module.s3bucket_lambda_prompt_logging.arn,
      "${module.s3bucket_lambda_prompt_logging.arn}/*"
    ]
  }
}
