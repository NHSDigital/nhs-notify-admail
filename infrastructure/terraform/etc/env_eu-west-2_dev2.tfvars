first-run   = false
environment = "dev2"

prompt-model-arn            = "arn:aws:bedrock:eu-west-1:[[AccountIDHere]]:inference-profile/eu.amazon.nova-pro-v1:0"
prompt-max-tokens-to-sample = 2000
prompt-temperature          = 0.1
prompt-top-p                = 0.5

evaluation-evaluator-model-identifier = "arn:aws:bedrock:eu-west-1:[[AccountIDHere]]:inference-profile/eu.amazon.nova-pro-v1:0"
evaluation-inference-model-identifier = "arn:aws:bedrock:eu-west-1:[[AccountIDHere]]:inference-profile/eu.amazon.nova-pro-v1:0"
