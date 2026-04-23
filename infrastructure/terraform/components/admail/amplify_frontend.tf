data "aws_iam_policy_document" "amplify_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["amplify.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "amplify_service_role" {
  count = var.frontend_hosting_mode == "amplify" ? 1 : 0

  name               = "${local.csi}-amplify-service-role"
  assume_role_policy = data.aws_iam_policy_document.amplify_assume_role.json
}

resource "aws_iam_role_policy_attachment" "amplify_service_role" {
  count = var.frontend_hosting_mode == "amplify" ? 1 : 0

  role       = aws_iam_role.amplify_service_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAmplifyServiceRolePolicy"
}

resource "aws_amplify_app" "frontend" {
  count = var.frontend_hosting_mode == "amplify" ? 1 : 0

  name                 = "${local.csi}-frontend"
  platform             = "WEB"
  iam_service_role_arn = aws_iam_role.amplify_service_role[0].arn

  repository   = var.frontend_repository != "" ? var.frontend_repository : null
  access_token = var.frontend_repository_access_token != "" ? var.frontend_repository_access_token : null

  # TODO: CCM-12345 Wire Amplify repository/auth inputs from nhs-notify-internal
  # deployment workflows once cross-repo migration tasks are agreed.

  build_spec = file("${path.root}/../../../../amplify.yml")

  environment_variables = {
    REACT_APP_BACKEND_API_BASE_URL = aws_apprunner_service.service_backend.service_url
    REACT_APP_API_GATEWAY          = "${aws_api_gateway_stage.main.invoke_url}/${local.api_gateway_llm_path_param}"
    REACT_APP_COGNITO_ID           = aws_cognito_user_pool_client.main.id
    REACT_APP_COGNITO_USER_POOL_ID = aws_cognito_user_pool_client.main.user_pool_id
  }

  enable_branch_auto_deletion = true

  # Preserve SPA deep-link behavior currently handled by Nginx try_files.
  custom_rule {
    source = "/<*>"
    target = "/index.html"
    status = "404-200"
  }

  tags = local.default_tags

  depends_on = [aws_iam_role_policy_attachment.amplify_service_role]
}

resource "aws_amplify_branch" "frontend" {
  count = var.frontend_hosting_mode == "amplify" ? 1 : 0

  app_id      = aws_amplify_app.frontend[0].id
  branch_name = local.amplify_branch_name

  stage                       = var.environment == "main" ? "PRODUCTION" : "DEVELOPMENT"
  enable_auto_build           = true
  enable_pull_request_preview = var.environment != "main"
  framework                   = "Create React App"

  environment_variables = {
    REACT_APP_BACKEND_API_BASE_URL = aws_apprunner_service.service_backend.service_url
    REACT_APP_API_GATEWAY          = "${aws_api_gateway_stage.main.invoke_url}/${local.api_gateway_llm_path_param}"
    REACT_APP_COGNITO_ID           = aws_cognito_user_pool_client.main.id
    REACT_APP_COGNITO_USER_POOL_ID = aws_cognito_user_pool_client.main.user_pool_id
  }
}

resource "aws_amplify_domain_association" "frontend" {
  count = var.frontend_hosting_mode == "amplify" && var.enable_amplify_domain_association ? 1 : 0

  app_id      = aws_amplify_app.frontend[0].id
  domain_name = local.acct.route53_zone_names["admail"]

  sub_domain {
    branch_name = aws_amplify_branch.frontend[0].branch_name
    prefix      = var.environment
  }
}
