import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';

import { ERROR_MESSAGES } from './constants';
import { createBedrockService } from './bedrockService';

// Initialise once per container, not per invocation.
const bedrockService = createBedrockService();

export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (event) => {
  let body: Record<string, unknown>;

  try {
    body = JSON.parse(event.body ?? '{}') as Record<string, unknown>;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: ERROR_MESSAGES.INVALID_JSON }),
    };
  }

  const inputText = body.input_text;
  if (typeof inputText !== 'string' || !inputText) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: ERROR_MESSAGES.NO_INPUT_TEXT }),
    };
  }

  const fileName =
    typeof body.file_name === 'string' ? body.file_name : undefined;

  try {
    return await bedrockService.callAdmailBedrockPrompt(inputText, fileName);
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: ERROR_MESSAGES.INTERNAL_SERVER }),
    };
  }
};
