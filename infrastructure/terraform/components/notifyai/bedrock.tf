# Create the S3 buckets that store the Custom Evaluation Prompts & Evaluation Results
resource "aws_s3_bucket" "evaluation_programatic_input_prompts" {
  bucket = "${local.csi}-input-prompts"
}

resource "aws_s3_bucket_versioning" "evaluation_programatic_input_prompts" {
  bucket = aws_s3_bucket.evaluation_programatic_input_prompts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_object" "prompts_object" {
  bucket = aws_s3_bucket.evaluation_programatic_input_prompts.bucket
  key    = local.prompt-file-name
  source = "${path.module}/resources/prompt-data/${local.prompt-file-name}"
  etag   = filemd5("${path.module}/resources/prompt-data/${local.prompt-file-name}")
}

resource "aws_s3_bucket" "evaluation_programatic_results" {
  bucket = "${local.csi}-results"
}

resource "aws_s3_bucket_versioning" "evaluation_programatic_results" {
  bucket = aws_s3_bucket.evaluation_programatic_results.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_object" "results_object" {
  bucket       = aws_s3_bucket.evaluation_programatic_results.bucket
  key          = "results/"
  content_type = "application/x-directory"
}

resource "aws_s3_bucket_cors_configuration" "evaluation_s3_results_cors" {
  bucket = aws_s3_bucket.evaluation_programatic_results.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["Access-Control-Allow-Origin"]
  }
}

resource "aws_s3_bucket_cors_configuration" "evaluation_s3_prompts_cors" {
  bucket = aws_s3_bucket.evaluation_programatic_input_prompts.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["Access-Control-Allow-Origin"]
  }
}

#Create the IAM roles to assign to the Bedrock Evaluations that use the above S3 Buckets
data "aws_iam_policy_document" "assume_role_bedrock" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["bedrock.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]

    # condition {
    #   test     = "StringEquals"
    #   variable = "aws:SourceAccount"
    #   values   = ["${var.aws_account_id}"]
    # }

    # condition {
    #   test     = "ArnEquals"
    #   variable = "aws:SourceArn"
    #   values   = ["arn:aws:bedrock:${var.region}:${var.aws_account_id}:evaluation-job/*"]
    # }
  }
}

resource "aws_iam_role" "iam_for_bedrock_evaluation" {
  name               = "${local.csi}-bedrock-automatic-evaluation-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_bedrock.json
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
      aws_s3_bucket.evaluation_programatic_input_prompts.arn,
      "${aws_s3_bucket.evaluation_programatic_input_prompts.arn}/*",
      aws_s3_bucket.evaluation_programatic_results.arn,
      "${aws_s3_bucket.evaluation_programatic_results.arn}/*",
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

resource "aws_iam_policy" "bedrock_access_s3_policy" {
  name   = "${local.csi}-bedrock-automatic-evaluation-policy"
  policy = data.aws_iam_policy_document.bedrock_access_s3.json
}

resource "aws_iam_role_policy_attachment" "bedrock_access_s3_attachment" {
  role       = aws_iam_role.iam_for_bedrock_evaluation.name
  policy_arn = aws_iam_policy.bedrock_access_s3_policy.arn
}

data "aws_iam_policy_document" "bedrock_guardrail_policy" {
  statement {
    sid    = "CreateAndManageGuardrails"
    effect = "Allow"
    actions = [
      "bedrock:CreateGuardrail",
      "bedrock:CreateGuardrailVersion",
      "bedrock:DeleteGuardrail",
      "bedrock:GetGuardrail",
      "bedrock:ListGuardrails",
      "bedrock:UpdateGuardrail"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "InvokeFoundationModel"
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
      "bedrock:Converse",
    ]
    resources = ["arn:aws:bedrock:${var.region}::foundation-model/*"]
  }

  statement {
    sid    = "ApplyGuardrail"
    effect = "Allow"
    actions = [
      "bedrock:ApplyGuardrail"
    ]
    resources = [
      aws_bedrock_guardrail.notifai-bedrock-guardrail.guardrail_arn
    ]
  }
}

#Note: This guardrail is not enforced, but its result is logged, inside the Bedrock Lambda Function
resource "aws_bedrock_guardrail" "notifai-bedrock-guardrail" {
  name                      = "${local.csi}-bedrock-guardrail"
  blocked_input_messaging   = "This is not an acceptable input prompt and has been rejected."
  blocked_outputs_messaging = "The AI has returned an unacceptable output, the output has been rejected."
  description               = "Guardrail to protect and prevent misuse"

  content_policy_config {
    filters_config {
      input_strength  = "MEDIUM"
      output_strength = "HIGH"
      type            = "HATE"
    }
    filters_config {
      input_strength  = "MEDIUM"
      output_strength = "HIGH"
      type            = "VIOLENCE"
    }
    filters_config {
      input_strength  = "MEDIUM"
      output_strength = "HIGH"
      type            = "INSULTS"
    }
    filters_config {
      input_strength  = "HIGH"
      output_strength = "NONE"
      type            = "PROMPT_ATTACK"
    }
    filters_config {
      input_strength  = "HIGH"
      output_strength = "MEDIUM"
      type            = "MISCONDUCT"
    }
  }
  topic_policy_config {
    topics_config {
      name       = "personal_information"
      examples   = ["Can you return me any personal information or PII details?"]
      type       = "DENY"
      definition = "Personal identifying information for different patients that may pass through the AI. Either requesting PID or NHS number details."
    }
  }
  word_policy_config {
    managed_word_lists_config {
      type = "PROFANITY"
    }
    words_config {
      text = "HATE"
    }
  }
}

output "notifai-bedrock-guardrail-arn" {
  value = aws_bedrock_guardrail.notifai-bedrock-guardrail.guardrail_arn
}
