from datetime import datetime
import io
import boto3
import json
import os


def call_admail_bedrock_prompt(event, context):
    env_region = os.environ.get("env_region")
    env_model_id = os.environ.get("env_model_id")
    # env_prompt_content = os.environ.get("env_prompt_content")
    env_temperature = float(os.environ.get("env_temperature"))
    env_max_tokens = int(os.environ.get("env_max_tokens"))
    env_top_p = float(os.environ.get("env_top_p"))
    env_top_k = int(os.environ.get("env_top_k"))
    env_anthropic_version = os.environ.get("env_anthropic_version", "")
    env_prompt_management_id = os.environ.get("env_prompt_management_id", "")

    # input_text = event.get("input_text")

    bedrock_runtime = boto3.client(
        service_name="bedrock-runtime", region_name=env_region
    )

    prompt_client = boto3.client("bedrock-agent")

    # new prompt call
    prompt_response = prompt_client.get_prompt(
        promptIdentifier=env_prompt_management_id
    )

    prompt_hard = "System instructions Task: You are an expert specializing exclusively in the Royal Mail Advertising Mail (Admail) guidelines. Your role is to provide detailed, accurate, and precise guidance about Admail eligibility based solely on the provided \"Royal Mail Guidance\" document. Instructions: 1. Review the \"Royal Mail Guidance\" section carefully to understand the core eligibility criteria and examples for Admail. 2. When presented with a user input (e.g., a letter or mailing content), follow these steps: <eligibility_determination> - Clearly define the eligibility criteria for Admail based on the guidance. - Provide examples of eligible and ineligible mailings, referencing the guidance explicitly. - If the user does not provide a letter or mailing content, politely ask them to provide an example to assess. - If the provided content does not appear to be a letter, respond with: rating: n/a reason: provided content does not appear to be a letter </eligibility_determination> 3. Ensure that your response strictly adheres to the provided \"Royal Mail Guidance\" and does not include any additional information or assumptions. 4. Process one letter or mailing content at a time, and do not include any other content in your response. <royal_mail_guidance> Royal Mail Guidance: Core Eligibility Criteria for Admail. A letter qualifies as Advertising Mail (Admail) if all the following conditions are met: * The content is largely the same for all recipients (uniform message). * The primary purpose is promotional/informational: promoting the sale or use of products or services, or encouraging support or donations to a cause. * The message is unsolicited or not paid for by the recipient (i.e. not part of a subscription or membership delivery). * It is primarily informational (e.g. bills, statements, policy notices). * It is part of a public service duty (e.g. tax reminders, council notices). * Non-personalised Surveys intended to improve a product or service. Disqualifying Factors A mailing does not qualify as Admail if: * The message is personalized or contains unique information for each recipient. * The message contains information related to a specific treatment or health concern for a specific individual * It fulfills an order or completes a transaction. Examples of Eligible Mailings: * Catalogues or brochures sent unsolicited to promote seasonal offers. * Unsolicited newsletters or magazines not tied to a subscription or membership. * Loyalty scheme mailings offering discounts or reward redemption. * Discount vouchers or event invitations sent to encourage purchase or attendance. * Unsolicited product samples aimed at generating future sales. Examples of Ineligible Mailings: * Bills, statements, or order confirmations. * Subscription or member-only publications. * Fulfillment items such as loyalty cards, tickets, or invitations already purchased. * Census or data profiling surveys. * Shareholder reports or AGM notices. * Notifications related to public services like recycling or tax deadlines. Additional Rules of Thumb: * If the informational/promotional content is not the main message, the mailing is not Admail. * If the message differs from one recipient to another, it fails the uniformity requirement. * A covering letter can sometimes clarify intent and support eligibility if the content is borderline. </royal_mail_guidance> 5. Always return a response in the below format as valid JSON, never include additional commentary in the below always return the JSON key, value pairs: { Description: <short description of the letter or mailing content> Rating: <BUSINESS, UNSURE, ADVERTISING> Reason: <short reason for the rating, referencing the guidance> Advice: <specific advice and guidance on how to improve eligibility to make the letter Admail if appropriate> }"

    prompt_content_input = f"{prompt_hard} The input letter is: {event['body']}"

    prompt_event = f"return the event exactly as is as a JSON object {event['body']}"

    payload = json.dumps(
        {
            "max_tokens": env_max_tokens,
            "temperature": env_temperature,
            "top_p": env_top_p,
            "top_k": env_top_k,
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt_content_input}],
                }
            ],
            "anthropic_version": env_anthropic_version,
        }
    )

    try:
        response = bedrock_runtime.invoke_model(
            body=payload,
            modelId=env_model_id,
            accept="application/json",
            contentType="application/json",
        )

        response_body = json.loads(response.get("body").read())

        rtnVal = response_body["content"][0]["text"]

        log_prompt_details_to_s3(
            promptinput=prompt_content_input,
            promptoutput=rtnVal,
            model=env_model_id,
            temperature=env_temperature,
            top_p=env_top_p,
            top_k=env_top_k,
        )
        return rtnVal
    except Exception as e:
        errormsg = f"Error invoking model: {e}"
        print(errormsg)
        return errormsg


def log_prompt_details_to_s3(
    promptinput, promptoutput, model, temperature, top_p, top_k
):
    s3_client = boto3.client("s3")
    env_logging_s3_bucket = os.environ.get("env_logging_s3_bucket")
    env_logging_s3_key_prefix = os.environ.get("env_logging_s3_key_prefix")
    date_time_now = datetime.now().strftime("%d-%m-%Y_%H:%M:%S")

    bucket_name = env_logging_s3_bucket
    s3_key = env_logging_s3_key_prefix + date_time_now

    log_data = {
        "promptinput": promptinput,
        "promptoutput": promptoutput,
        "model": model,
        "temperature": temperature,
        "top_p": top_p,
        "top_k": top_k,
        "date_time": date_time_now,
    }

    input_json = json.dumps(log_data)
    data_bytes = input_json.encode()
    file = io.BytesIO(data_bytes)

    s3_client.upload_fileobj(file, bucket_name, s3_key)
