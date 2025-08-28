# LLM Evaluation Running Script How-To

## Scripts Purpose

`bedrock_evaluation_lambda.py` - This Lambda is designed to be triggered on a schedule (every 3 days) to run evaluations of the deployed Bedrock models. It pulls prompts from a specified S3 bucket, runs them through the model, and stores the results back in another S3 bucket for analysis.
`bedrock_evaluation_service.py` - This script sets up the necessary Bedrock configuration to run the evaluations.
`bedrock_evaluation_local_runner.py` - This is the local script to run the evaluations, so you can run independently and test the evaluations using different models, prompts, etc.

## Using the script locally

Note: These scripts assume you are cd to src/backend/bedrock_evaluations_runner

- If the Python requirements are not installed, run `pip3 install -r src/backend/bedrock_evaluations_runner/requirements.txt`
- First Time? Set up the [environment variables](#setting-up-local-environment)
- run `python3 src/backend/bedrock_evaluations_runner/bedrock_evaluation_local_runner.py`

## Setting up local environment

- Copy .env-example, then rename to .env
- Update the variables to match the environment you wish to test against.

  Check the `infrastructure/terraform/etc/env_*.tfvars` var files, for the in-use model identifiers.
  Otherwise the variables can be found on the deployed bedrock evaluation runner's "Environment Variables

  Note: Defaults are included for easily inferrable variables. Look for any `REPLACE` sections, where the environment can be substituted.
