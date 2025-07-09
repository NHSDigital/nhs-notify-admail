# Variables shared by any environment that chooses to be subscribed to it
group          = "nhs-notify-poc001"
aws_account_id = "767397886959"
region         = "eu-west-2"

# Generics
log_retention_in_days = 10
kms_deletion_window   = 15

budget_amount          = 300
cost_anomaly_threshold = 20
