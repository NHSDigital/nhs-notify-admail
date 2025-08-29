import os
import json
import jsonlines
from pypdf import PdfReader
from docx import Document
import copy
from dotenv import load_dotenv
import re

load_dotenv()

"""
Letter converting tool to assist with the manual creation of the prompts.jsonl file.
Requires each letter in the the letter folder to have an existing reference response available.
"""

LETTERS_PATH = os.getenv("LETTERS_PATH")
RESPONSE_PATH = os.getenv("RESPONSE_PATH")
DATA_PATH = os.getenv("DATA_PATH")
MODEL = os.getenv("MODEL")
PROMPT = os.getenv("PROMPT")

with open(PROMPT, "r") as prompt_file:
    prompt_string = prompt_file.read()


letters = {}
bedrock_training_object = {
    "prompt": "",
    "referenceResponse": "",
    "category": "",
    "modelResponses": [{"response": "", "modelIdentifier": ""}],
}
bedrock_list = []


def count_files_in_folder(letter_path) -> int:
    count = 0
    for path in os.scandir(letter_path):
        if path.is_file():
            count += 1
    return count


with os.scandir(LETTERS_PATH) as letters_in_folder:
    for letter in letters_in_folder:
        filename, file_extension = os.path.splitext(letter)
        file_name = os.path.basename(letter)
        file_name = os.path.splitext(file_name)
        print("filename: ", file_name[0])

        # skip any files that aren't pdf or docx
        if file_extension != ".pdf" and file_extension != ".docx":
            continue

        letter_pdf = file_name[0] + ".pdf"
        letter_docx = file_name[0] + ".docx"
        letters_keys = letters.keys()

        # dont create docx or pdf duplicate letters entries
        if letter_pdf in letters_keys:
            continue
        if letter_docx in letters_keys:
            continue

        if letter.is_file():
            letters.update({letter.name: ""})
            if file_extension == ".pdf":
                try:
                    with open(letter.path, "rb") as file:
                        pdf = PdfReader(file)
                        text = []
                        for page in pdf.pages:
                            page_text = page.extract_text() or ""
                            text.append(page_text.strip())
                        pdf_string = " ".join(text)
                        letters[letter.name] = pdf_string

                except Exception as e:
                    print(f"Error processing pdf {letter.path}: {e}")
            else:
                with open(letter.path, "r") as open_letter:
                    letter_as_doc = Document(letter.path)
                    text = [para.text for para in letter_as_doc.paragraphs if para.text]
                    letter_as_str = " ".join(text).strip()
                    try:
                        # try cleaning some incompatible unicode
                        letter_as_str = letter_as_str.replace("\\u0027", "'")
                        # Remove control characters (\u0000 to \u001F)
                        letter_as_str = re.sub(r"[\u0000-\u001F]", "", letter_as_str)
                        # Replace non-breaking spaces with regular spaces
                        letter_as_str = letter_as_str.replace("\u00a0", " ")
                        # Replace curly quotes with straight quotes
                        letter_as_str = letter_as_str.replace("\u2019", "'")
                        # Replace en dashes with hyphens
                        letter_as_str = letter_as_str.replace("\u2013", "-")
                        # Replace bullet points with asterisks
                        letter_as_str = letter_as_str.replace("\u25cf", "*").replace(
                            "\u2022", "*"
                        )
                        # Replace plus-minus with +/-
                        letter_as_str = letter_as_str.replace("\u00b1", "+/-")
                        # Replace ampersands with 'and'
                        letter_as_str = letter_as_str.replace("&", "and")
                    except Exception as e:
                        print(f"Error cleaning: {e}")
                        continue

                    letters[letter.name] = letter_as_str

# join responses and prompts to bedrock object then we are creating our jsonl file
with open(RESPONSE_PATH, "r") as responses_file:
    json_text = responses_file.read()
    json_responses = json.loads(json_text)

    for k, v in letters.items():
        if k == ".DS_Store":
            continue
        try:
            bedrock_new_obj = copy.deepcopy(bedrock_training_object)
            bedrock_new_obj["prompt"] = prompt_string + " Input letter: " + v
            bedrock_new_obj["referenceResponse"] = json_responses[k]
            bedrock_new_obj["modelResponses"][0]["response"] = json_responses[k]
            bedrock_new_obj["modelResponses"][0]["modelIdentifier"] = MODEL
            bedrock_list.append(bedrock_new_obj)
        except Exception as e:
            print(f"Error processing letter {k}: {e}")
            continue

with jsonlines.open(DATA_PATH + "output.jsonl", mode="w") as writer:
    for obj in bedrock_list:
        writer.write(obj)
