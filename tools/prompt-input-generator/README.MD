# Purpose
This utility generates input prompts for evaluating LLMs using the AWS Bedrock service.
It creates a JSONL file containing prompts that can be used to assess the performance of different language models.

# Usage
1. Ensure you have Python installed on your machine.
2. Copy the .env.example file to .env and fill in the required environment variables:

#### NOTE: for `DATA_PATH`: if you wish to use the .jsonl in deployed evaluations, the path should be infrastructure/terraform/components/notifyai/resources/prompt-data/prompts.jsonl, as this is the file from which terraform deploys the "evaluation inputs" file

#### NOTE: for `LETTERS_PATH`: this should be the path to a directory containing .docx and/or .pdf files of letters you wish to evaluate the model(s) on.

  ```bash
  cp tools/prompt-input-generator/.env.example tools/prompt-input-generator/.env
  ```

3. Navigate to the directory containing the `prompt_input_generator.py` script.
4. Run the script using the command: (Note: The .env.example paths assume you are running from the root of the repo)
  ```bash
  python3 tools/prompt-input-generator/prompt-input-generator.py
  ```
