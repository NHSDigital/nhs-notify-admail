export const TOOL_NAME = 'admail_eligibility_analyzer';
export const TOOL_DESCRIPTION =
  'Analyse a letter, and provide a description and reasoning about AdMail eligibility.';

export const Rating = {
  BUSINESS: 'BUSINESS',
  UNSURE: 'UNSURE',
  ADVERTISING: 'ADVERTISING',
} as const;

export type Rating = (typeof Rating)[keyof typeof Rating];

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Content-Type': 'application/json',
};

export const ERROR_MESSAGES = {
  SYSTEM_PROMPT_NOT_FOUND: 'Error: System prompt file not found.',
  S3_LOGGING_NOT_CONFIGURED:
    'S3 logging environment variables not set. Skipping log.',
  NO_INPUT_TEXT:
    "Request body must be a valid JSON object with an 'input_text' key.",
  INVALID_JSON: 'Invalid JSON format in request body.',
  INTERNAL_SERVER: 'An internal server error occurred.',
  INVALID_DATA_URL: 'Invalid data url passed to bedrock service',
  UNKNOWN_MIME_TYPE: (mime: string) =>
    `Unknown document format for mime type: ${mime}`,
} as const;
