# LLM Evaluation Running Script How-To

## Script Purpose

This script allows us to create LLM Evaluations programmatically, to remove manual effort, and data entry errors.
Also, the script can be used for automated evaluation runs, to ensure regular check-ups on the LLM performance

## Using the script

- cd to tools/evaluation-runner
- if Boto3 is not installed, run `pip install -r tools/evaluation-runner/requirements.txt`
- run;
`python tools/evaluation-runner/bedrock_evaluation_creator.py`

## Setting up local environment

- Copy .env-example, then rename to .env
- Update the variables to match the environment you wish to test against.

  Check the `infrastructure/terraform/etc/env_*.tfvars` var files, for the in-use model identifiers. The rest of the variables can be found from the deployed infrastructure

  Note: Defaults are include for easily inferrable variable, look for any `REPLACE` sections, where the environment can be substituted
