import os
import jsonlines
import copy
from dotenv import load_dotenv
import re
import argparse

load_dotenv()

"""
This tool helps prepare the training data for usage with Converse API, there are options to train with either a Claude 3 Haiku model or Nova Pro model.
"""
PROMPTS_PATH = os.getenv("PROMPTS_PATH")
DATA_PATH = os.getenv("DATA_PATH")


def extract_relevant_info_from_prompt(prompt_object):
    """
    Extract relevant information from the prompt file, to populate the data structure.
    """
    training_info = {
        "system_instructions": "",
        "prompt":"",
        "example_response": ""
    }
    match = re.search(r'^.*?(?=\n\n)', prompt_object['prompt'], re.DOTALL)
    if match:
        system_instructions = match.group(0)
        training_info["system_instructions"] = system_instructions
    else:
        print("No match found.")

    prompt_removed_system_text = re.sub(r'(?s)^.*?\n\n', '', prompt_object['prompt'], count=1)
    training_info["prompt"] = prompt_removed_system_text
    training_info["example_response"] = prompt_object['referenceResponse']

    return training_info


def create_haiku_converse_data():
    """
    Create a Claude 3 Haiku converse training data, this will output all data as a single JSONL file.
    """
    claude_training_list = []
    claude3_haiku_converse = {
        "system": "<system message>",
        "messages": [
            {"role": "user", "content": "<user query>"},
            {"role": "assistant", "content": "<expected generated text>"},
        ],
    }
    with jsonlines.open(PROMPTS_PATH) as reader:
        for obj in reader:
            data = copy.deepcopy(claude3_haiku_converse)
            obj_info = extract_relevant_info_from_prompt(obj)
            data['system'] = obj_info["system_instructions"]
            data['messages'][0]['content'] = obj_info["prompt"]
            data['messages'][1]['content'] = obj_info["example_response"]
            claude_training_list.append(data)

    with jsonlines.open(DATA_PATH + '/training_claude_haiku.jsonl', mode='w') as writer:
        for obj in claude_training_list:
            writer.write(obj)


def create_nova_pro_converse_data():
    """
    Create a Nova Pro converse training data, this will output all data as a single JSONL file.
    """
    nova_pro_training_list = []
    nova_pro_converse = {
        "schemaVersion": "Converse-training-data-v1",
        "system": [{"text": "You are a digital assistant with a friendly personality"}],
        "messages": [
            {"role": "user", "content": [{"text": "What is the capital of Mars?"}]},
            {
                "role": "assistant",
                "content": [
                    {"text": "Mars does not have a capital. Perhaps it will one day."}
                ],
            },
        ],
    }
    data = copy.deepcopy(nova_pro_converse)
    with jsonlines.open(PROMPTS_PATH) as reader:
        for obj in reader:
            data = copy.deepcopy(nova_pro_converse)
            obj_info = extract_relevant_info_from_prompt(obj)
            data['system'][0]['text'] = obj_info["system_instructions"]
            data['messages'][0]['content'][0]['text'] = obj_info["prompt"]
            data['messages'][1]['content'][0]['text'] = obj_info["example_response"]
            nova_pro_training_list.append(data)

    with jsonlines.open(DATA_PATH + '/training_nova_pro.jsonl', mode='w') as writer:
        for obj in nova_pro_training_list:
            writer.write(obj)


def main():
    parser = argparse.ArgumentParser(
        description="Build and push Docker images to AWS ECR."
    )
    parser.add_argument(
        "--model",
        choices=["claude3-haiku", "nova-pro"],
        help="Specify the training data format you need to use, either 'claude3-haiku' or 'nova-pro'.",
    )
    args = parser.parse_args()

    if args.model == "claude3-haiku":
        print("Creating Claude 3 Haiku converse training data...")
        create_haiku_converse_data()
    elif args.model == "nova-pro":
        print("Creating Nova Pro converse training data...")
        create_nova_pro_converse_data()
    else:
        print("No valid model specified. Please choose either 'claude3-haiku' or 'nova-pro'.")
        exit(1)

if __name__ == "__main__":
    print("Preparing training data...")
    main()
    print("Training data creation complete")
