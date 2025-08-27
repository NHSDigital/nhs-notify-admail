resource "aws_ses_template" "complete" {
  name    = "${local.csi}-complete-template"
  subject = "Notifai evaluations complete"
  html    = "<h1>Hello {{name}},</h1><p>The Notifai evaluations are complete</p>"
  text    = "Hello {{name}},\r\nThe Notifai evaluations are complete"
}

resource "aws_ses_template" "failed" {
  name    = "${local.csi}-failed-template"
  subject = "Notifai evaluations have failed"
  html    = "<h1>Hello {{name}},</h1><p>The Notifai evaluations have failed to complete.</p>"
  text    = "Hello {{name}},\r\nThe Notifai evaluations have failed to complete."
}

resource "aws_ses_email_identity" "sender_email" {
  email = "christopher.bacon@hippodigital.co.uk"
}
