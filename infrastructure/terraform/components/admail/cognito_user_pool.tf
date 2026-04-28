resource "aws_cognito_user_pool" "main" {
  name = "${local.csi}-cognito-user-pool"

  password_policy {
    minimum_length    = 16
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Enforce MFA for all users using TOTP (authenticator app).
  # SMS MFA is intentionally omitted: it requires SNS configuration and a
  # phone-number attribute, and is considered less secure than TOTP.
  mfa_configuration = "ON"

  software_token_mfa_configuration {
    enabled = true
  }

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
}
