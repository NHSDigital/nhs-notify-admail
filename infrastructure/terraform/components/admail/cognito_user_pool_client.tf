resource "aws_cognito_user_pool_client" "main" {
  name                   = "${local.csi}-cognito-client"
  user_pool_id           = aws_cognito_user_pool.main.id
  access_token_validity  = 15 # minutes
  id_token_validity      = 15 # minutes
  refresh_token_validity = 8  # hours – covers a working day; sessions do not persist overnight

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "hours"
  }

  # Ensure tokens are invalidated server-side immediately on logout
  # (works in conjunction with the GlobalSignOutCommand called by the frontend)
  enable_token_revocation = true

  # Prevent secret generation for public clients (SPAs)
  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  supported_identity_providers = ["COGNITO"]
}
