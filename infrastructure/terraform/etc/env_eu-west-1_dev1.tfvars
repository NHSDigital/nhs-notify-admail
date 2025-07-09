first-run   = false
environment = "dev1"
aws_account_id                = "[[AccountIDHere]]"

prompt-model-arn            = "arn:aws:bedrock:eu-west-1:[[AccountIDHere]]:inference-profile/eu.amazon.nova-pro-v1:0"
prompt-max-tokens-to-sample = 200
prompt-temperature          = 0.1
prompt-top-p                = 0.8

evaluation-evaluator-model-identifier = "arn:aws:bedrock:eu-west-1:[[AccountIDHere]]:inference-profile/eu.amazon.nova-pro-v1:0"
evaluation-inference-model-identifier = "arn:aws:bedrock:eu-west-1:[[AccountIDHere]]:inference-profile/eu.amazon.nova-pro-v1:0"
