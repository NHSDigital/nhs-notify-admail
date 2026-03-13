# Note: This guardrail is not enforced, but its result is logged, inside the Bedrock Lambda Function
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
