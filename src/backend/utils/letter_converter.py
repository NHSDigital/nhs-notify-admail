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

LETTERS_PATH = os.getenv('LETTERS_PATH')
RESPONSE_PATH = os.getenv('RESPONSE_PATH')
DATA_PATH = os.getenv('DATA_PATH')
MODEL = os.getenv('MODEL')
PROMPT = os.getenv('PROMPT')
# prompt_hard = "System instructions Task: You are an expert specializing exclusively in the Royal Mail Advertising Mail (Admail) guidelines. Your role is to provide detailed, accurate, and precise guidance about Admail eligibility based solely on the provided \"Royal Mail Guidance\" document. Instructions: 1. Review the \"Royal Mail Guidance\" section carefully to understand the core eligibility criteria and examples for Admail. 2. When presented with a user input (e.g., a letter or mailing content), follow these steps: <eligibility_determination> - Clearly define the eligibility criteria for Admail based on the guidance. - Provide examples of eligible and ineligible mailings, referencing the guidance explicitly. - If the user does not provide a letter or mailing content, politely ask them to provide an example to assess. - If the provided content does not appear to be a letter, respond with: rating: n/a reason: provided content does not appear to be a letter </eligibility_determination> 3. Ensure that your response strictly adheres to the provided \"Royal Mail Guidance\" and does not include any additional information or assumptions. 4. Process one letter or mailing content at a time, and do not include any other content in your response. <royal_mail_guidance> Royal Mail Guidance: Core Eligibility Criteria for Admail. A letter qualifies as Advertising Mail (Admail) if all the following conditions are met: * The content is largely the same for all recipients (uniform message). * The primary purpose is promotional/informational: promoting the sale or use of products or services, or encouraging support or donations to a cause. * The message is unsolicited or not paid for by the recipient (i.e. not part of a subscription or membership delivery). * It is primarily informational (e.g. bills, statements, policy notices). * It is part of a public service duty (e.g. tax reminders, council notices). * Non-personalised Surveys intended to improve a product or service. Disqualifying Factors A mailing does not qualify as Admail if: * The message is personalized or contains unique information for each recipient. * The message contains information related to a specific treatment or health concern for a specific individual * It fulfills an order or completes a transaction. Examples of Eligible Mailings: * Catalogues or brochures sent unsolicited to promote seasonal offers. * Unsolicited newsletters or magazines not tied to a subscription or membership. * Loyalty scheme mailings offering discounts or reward redemption. * Discount vouchers or event invitations sent to encourage purchase or attendance. * Unsolicited product samples aimed at generating future sales. Examples of Ineligible Mailings: * Bills, statements, or order confirmations. * Subscription or member-only publications. * Fulfillment items such as loyalty cards, tickets, or invitations already purchased. * Census or data profiling surveys. * Shareholder reports or AGM notices. * Notifications related to public services like recycling or tax deadlines. Additional Rules of Thumb: * If the informational/promotional content is not the main message, the mailing is not Admail. * If the message differs from one recipient to another, it fails the uniformity requirement. * A covering letter can sometimes clarify intent and support eligibility if the content is borderline. </royal_mail_guidance> 5. Always return a response in the below format as valid JSON, never include additional commentary in the below always return the JSON key, value pairs: { Description: <short description of the letter or mailing content> Rating: <BUSINESS, UNSURE, ADVERTISING> Reason: <short reason for the rating, referencing the guidance> Advice: <specific advice and guidance on how to improve eligibility to make the letter Admail if appropriate> }"

with open(PROMPT, 'r') as prompt_file:
    prompt_string = prompt_file.read()



letters = {}
bedrock_training_object = {
    "prompt": "",
    "referenceResponse": "",
    "category": "",
    "modelResponses": [
        {
            "response": "",
            "modelIdentifier": ""
        }
    ]
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
        print('filename: ', file_name[0])

        # skip any files that aren't pdf or docx
        if file_extension != '.pdf' and file_extension != '.docx':
            continue

        letter_pdf = file_name[0] + '.pdf'
        letter_docx = file_name[0] + '.docx'
        letters_keys = letters.keys()

        # dont create docx or pdf duplicate letters entries
        if letter_pdf in letters_keys:
            continue
        if letter_docx in letters_keys:
            continue


        if letter.is_file():
            letters.update({letter.name:""})
            if file_extension == '.pdf':
                    try:
                        with open(letter.path, 'rb') as file:
                            pdf = PdfReader(file)
                            text = []
                            for page in pdf.pages:
                                page_text = page.extract_text() or ""
                                text.append(page_text.strip())
                            pdf_string =  " ".join(text)
                            letters[letter.name] = pdf_string

                    except Exception as e:
                        print(f"Error processing pdf {letter.path}: {e}")
            else:
                with open(letter.path, 'r') as open_letter:
                    letter_as_doc = Document(letter.path)
                    text = [para.text for para in letter_as_doc.paragraphs if para.text]
                    letter_as_str = " ".join(text).strip()
                    try:
                        # try cleaning some incompatible unicode
                        letter_as_str = letter_as_str.replace('\\u0027', "'")
                        # Remove control characters (\u0000 to \u001F)
                        letter_as_str = re.sub(r'[\u0000-\u001F]', '', letter_as_str)
                        # Replace non-breaking spaces with regular spaces
                        letter_as_str = letter_as_str.replace('\u00A0', ' ')
                        # Replace curly quotes with straight quotes
                        letter_as_str = letter_as_str.replace('\u2019', "'")
                        # Replace en dashes with hyphens
                        letter_as_str = letter_as_str.replace('\u2013', '-')
                        # Replace bullet points with asterisks
                        letter_as_str = letter_as_str.replace('\u25CF', '*').replace('\u2022', '*')
                        # Replace plus-minus with +/-
                        letter_as_str = letter_as_str.replace('\u00B1', '+/-')
                        # Replace ampersands with 'and'
                        letter_as_str = letter_as_str.replace('&', 'and')
                    except Exception as e:
                        print(f"Error cleaning: {e}")
                        continue

                    letters[letter.name] = letter_as_str

# join responses and prompts to bedrock object then we are creating our jsonl file
with open(RESPONSE_PATH, 'r') as responses_file:
    json_text = responses_file.read()
    json_responses = json.loads(json_text)

    for k, v in letters.items():
        if k == '.DS_Store':
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

with jsonlines.open(DATA_PATH + 'output.jsonl', mode='w') as writer:
    for obj in bedrock_list:
        writer.write(obj)
