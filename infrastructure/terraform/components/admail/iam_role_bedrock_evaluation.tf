data "aws_iam_policy_document" "assume_role_bedrock" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["bedrock.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "iam_for_bedrock_evaluation" {
  name               = "${local.csi}-bedrock-automatic-evaluation-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_bedrock.json
}

resource "aws_iam_policy" "bedrock_access_s3_policy" {
  name   = "${local.csi}-bedrock-automatic-evaluation-policy"
  policy = data.aws_iam_policy_document.bedrock_access_s3.json
}

resource "aws_iam_role_policy_attachment" "bedrock_access_s3_attachment" {
  role       = aws_iam_role.iam_for_bedrock_evaluation.name
  policy_arn = aws_iam_policy.bedrock_access_s3_policy.arn
}

data "aws_iam_policy_document" "bedrock_access_s3" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
      "s3:PutObject",
      "s3:GetBucketLocation",
      "s3:AbortMultipartUpload",
      "s3:ListBucketMultipartUploads",
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
      "bedrock:CreateModelInvocationJob",
      "bedrock:StopModelInvocationJob",
      "bedrock:GetProvisionedModelThroughput",
      "bedrock:GetInferenceProfile",
      "bedrock:ListInferenceProfiles",
      "bedrock:GetImportedModel",
      "bedrock:GetPromptRouter",
      "sagemaker:InvokeEndpoint"
    ]
    resources = [
      module.s3bucket_evaluation_input_prompts.arn,
      "${module.s3bucket_evaluation_input_prompts.arn}/*",
      module.s3bucket_evaluation_results.arn,
      "${module.s3bucket_evaluation_results.arn}/*",
      "arn:aws:bedrock:*::foundation-model/*",
      "arn:aws:bedrock:${var.region}:${var.aws_account_id}:inference-profile/eu.amazon.nova-pro-v1:0",
      "arn:aws:bedrock:${var.region}:${var.aws_account_id}:evaluation-job/*",
      "arn:aws:bedrock:${var.region}::prompt/*",
      "arn:aws:bedrock:*:${var.aws_account_id}:inference-profile/*",
      "arn:aws:bedrock:*:${var.aws_account_id}:provisioned-model/*",
      "arn:aws:bedrock:*:${var.aws_account_id}:imported-model/*",
      "arn:aws:bedrock:*:${var.aws_account_id}:application-inference-profile/*",
      "arn:aws:bedrock:*:${var.aws_account_id}:default-prompt-router/*",
      "arn:aws:bedrock:*:${var.aws_account_id}:prompt-router/*",
      "arn:aws:sagemaker:*:${var.aws_account_id}:endpoint/*",
      "arn:aws:bedrock:*:${var.aws_account_id}:marketplace/model-endpoint/all-access"
    ]
  }
}
