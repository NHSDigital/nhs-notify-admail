first-run   = false
environment = "dev1"
region      = "eu-west-1"

prompt-name                 = "prompt"
prompt-description          = "Admail prompt for Royal Mail"
prompt-input-text           = "This is the test input text as an nhs mail"
prompt-model-arn            = "eu.anthropic.claude-3-7-sonnet-20250219-v1:0"
prompt-max-tokens-to-sample = 200
prompt-temperature          = 0.699999988079071
prompt-top-p                = 0.9900000095367432
prompt-top-k                = 250

evaluation-evaluator-model-identifier = "arn:aws:bedrock:eu-west-1:AWSACCOUNTNUMBER:inference-profile/eu.anthropic.claude-3-7-sonnet-20250219-v1:0"
evaluation-inference-model-identifier = "arn:aws:bedrock:eu-west-1:AWSACCOUNTNUMBER:inference-profile/eu.anthropic.claude-3-7-sonnet-20250219-v1:0"