resource "aws_cognito_user_pool" "main" {
  name = "${local.csi}-cognito-user-pool"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
}
