# Constants for tool definition
TOOL_NAME = "admail_eligibility_analyzer"
TOOL_DESCRIPTION = "Analyse a letter, and provide a description and reasoning about AdMail eligibility."

# Enum values for rating property
RATING_BUSINESS = "BUSINESS"
RATING_UNSURE = "UNSURE"
RATING_ADVERTISING = "ADVERTISING"

# Error Messages
ERROR_SYSTEM_PROMPT_NOT_FOUND = "Error: System prompt file not found."
ERROR_S3_LOGGING_NOT_CONFIGURED = "S3 logging environment variables not set. Skipping log."
ERROR_NO_INPUT_TEXT = "Request body must be a valid JSON object with an 'input_text' key."
ERROR_INVALID_JSON = "Invalid JSON format in request body."
ERROR_INTERNAL_SERVER = "An internal server error occurred."
