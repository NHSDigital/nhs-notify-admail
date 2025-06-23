#Create the S3 buckets that store the Custom Evaluation Prompts & Evaluation Results
resource "aws_s3_bucket" "evaluation_programatic_input_prompts" {
  bucket = "input-prompts-${local.resource-suffix}"
}

resource "aws_s3_object" "prompts_object" {
  bucket = aws_s3_bucket.evaluation_programatic_input_prompts.bucket
  key    = local.prompt-file-name
  source = "${path.module}/resources/evaluation-prompts/${local.prompt-file-name}"
  etag   = filemd5("${path.module}/resources/evaluation-prompts/${local.prompt-file-name}")
}

resource "aws_s3_bucket" "evaluation_programatic_results" {
  bucket = "results-${local.resource-suffix}"
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
    #   values   = ["[[REPLACE-AWSACCOUNTNUMBER]]"]
    # }

    # condition {
    #   test     = "ArnEquals"
    #   variable = "aws:SourceArn"
    #   values   = ["arn:aws:bedrock:${var.region}:[[REPLACE-AWSACCOUNTNUMBER]]:evaluation-job/*"]
    # }
  }
}

resource "aws_iam_role" "iam_for_bedrock_evaluation" {
  name               = "bedrock-automatic-evaluation-role-${local.resource-suffix}"
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
    #TODO: Get the [[REPLACE-AWSACCOUNTNUMBER]] string in a better way, maybe from TF itself?
    resources = [
      aws_s3_bucket.evaluation_programatic_input_prompts.arn,
      "${aws_s3_bucket.evaluation_programatic_input_prompts.arn}/*",
      aws_s3_bucket.evaluation_programatic_results.arn,
      "${aws_s3_bucket.evaluation_programatic_results.arn}/*",
      "arn:aws:bedrock:*::foundation-model/*",
      "arn:aws:bedrock:eu-west-1:[[REPLACE-AWSACCOUNTNUMBER]]:inference-profile/eu.anthropic.claude-3-7-sonnet-20250219-v1:0",
      "arn:aws:bedrock:${var.region}:[[REPLACE-AWSACCOUNTNUMBER]]:evaluation-job/*",
      "arn:aws:bedrock:${var.region}::prompt/*",
      "arn:aws:bedrock:*:[[REPLACE-AWSACCOUNTNUMBER]]:inference-profile/*",
      "arn:aws:bedrock:*:[[REPLACE-AWSACCOUNTNUMBER]]:provisioned-model/*",
      "arn:aws:bedrock:*:[[REPLACE-AWSACCOUNTNUMBER]]:imported-model/*",
      "arn:aws:bedrock:*:[[REPLACE-AWSACCOUNTNUMBER]]:application-inference-profile/*",
      "arn:aws:bedrock:*:[[REPLACE-AWSACCOUNTNUMBER]]:default-prompt-router/*",
      "arn:aws:bedrock:*:[[REPLACE-AWSACCOUNTNUMBER]]:prompt-router/*",
      "arn:aws:sagemaker:*:[[REPLACE-AWSACCOUNTNUMBER]]:endpoint/*",
      "arn:aws:bedrock:*:[[REPLACE-AWSACCOUNTNUMBER]]:marketplace/model-endpoint/all-access"
    ]
  }
}

resource "aws_iam_policy" "bedrock_access_s3_policy" {
  name   = "bedrock-automatic-evaluation-policy-${local.resource-suffix}"
  policy = data.aws_iam_policy_document.bedrock_access_s3.json
}

resource "aws_iam_role_policy_attachment" "bedrock_access_s3_attachment" {
  role       = aws_iam_role.iam_for_bedrock_evaluation.name
  policy_arn = aws_iam_policy.bedrock_access_s3_policy.arn
}

resource "awscc_bedrock_prompt" "notifai-bedrock_prompt" {
  name        = "${var.prompt-name}-${local.resource-suffix}-${replace(replace(replace(var.prompt-model-arn, ".", "-"), ":", "-"), ":", "-")}"
  description = var.prompt-description

  default_variant = "${var.prompt-name}-${local.resource-suffix}"

  variants = [
    {
      name          = "${var.prompt-name}-${local.resource-suffix}"
      template_type = "TEXT"
      model_id      = "${var.prompt-model-arn}"
      inference_configuration = {
        text = {
          temperature    = var.prompt-temperature
          max_tokens     = var.prompt-max-tokens-to-sample
          top_p          = var.prompt-top-p
          top_k          = "${var.prompt-top-k}"
          stop_sequences = ["\\n\\nHuman:"]
        }
      }
      template_configuration = {
        text = {
          input_variables = [
            {
              name = "input"
            }
          ]
          text = "${var.prompt-input-text}{{input}}"
        }
      }
    }
  ]
}