# LLM Evaluation Running Script How-To

## Scripts Purpose

`bedrock_evaluation_lambda.py` - This Lambda is designed to be triggered on a schedule (every 3 days) to run evaluations of the deployed Bedrock models. It pulls prompts from a specified S3 bucket, runs them through the model, and stores the results back in another S3 bucket for analysis.
`bedrock_evaluation_local.py` - This is the local script to run the evaluations, so you can run independently and test the evaluations using different models, prompts, etc.
`bedrock_evaluation_service.py` - This script sets up the necessary Bedrock configuration to run the evaluations.

## Using the script

- If the Python requirements are not installed, run `pip3 install -r ./requirements.txt`
- run `python3 tools/evaluation-runner/bedrock_evaluation_creator.py`

## Setting up local environment

- Copy .env-example, then rename to .env
- Update the variables to match the environment you wish to test against.

  Check the `infrastructure/terraform/etc/env_*.tfvars` var files, for the in-use model identifiers. The rest of the variables can be found from the deployed infrastructure

  Note: Defaults are included for easily inferrable variables. Look for any `REPLACE` sections, where the environment can be substituted.
