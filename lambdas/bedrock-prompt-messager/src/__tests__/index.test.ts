import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { mockDeep } from 'jest-mock-extended';

import { ERROR_MESSAGES } from '../constants';

// ---------------------------------------------------------------------------
// Mock bedrockService before importing the handler so that the module-level
// `createBedrockService()` call in index.ts is intercepted.
// Variables prefixed with `mock` are accessible inside jest.mock factories.
// ---------------------------------------------------------------------------
const mockCallAdmailBedrockPrompt = jest.fn<
  Promise<APIGatewayProxyResult>,
  [string, string | undefined]
>();

jest.mock('../bedrockService', () => ({
  createBedrockService: () => ({
    callAdmailBedrockPrompt: mockCallAdmailBedrockPrompt,
  }),
}));

// Import after the mock is in place.
// eslint-disable-next-line import-x/first
import { handler } from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(
  body: string | null = null,
): APIGatewayProxyEvent {
  return {
    body,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: '/',
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
  };
}

const context = mockDeep<Context>();
const callback = jest.fn();

// ---------------------------------------------------------------------------
describe('Lambda handler', () => {
  beforeEach(() => {
    mockCallAdmailBedrockPrompt.mockReset();
  });

  // -------------------------------------------------------------------------
  describe('request validation', () => {
    it('returns 400 with INVALID_JSON when the body cannot be parsed as JSON', async () => {
      const result = await handler(makeEvent('not-json'), context, callback);

      expect(result).toMatchObject({
        statusCode: 400,
        body: JSON.stringify({ error: ERROR_MESSAGES.INVALID_JSON }),
      });
      expect(mockCallAdmailBedrockPrompt).not.toHaveBeenCalled();
    });

    it('returns 400 with NO_INPUT_TEXT when the event has no body', async () => {
      const result = await handler(makeEvent(null), context, callback);

      expect(result).toMatchObject({
        statusCode: 400,
        body: JSON.stringify({ error: ERROR_MESSAGES.NO_INPUT_TEXT }),
      });
      expect(mockCallAdmailBedrockPrompt).not.toHaveBeenCalled();
    });

    it('returns 400 with NO_INPUT_TEXT when body is an empty JSON object', async () => {
      const result = await handler(makeEvent('{}'), context, callback);

      expect(result).toMatchObject({
        statusCode: 400,
        body: JSON.stringify({ error: ERROR_MESSAGES.NO_INPUT_TEXT }),
      });
      expect(mockCallAdmailBedrockPrompt).not.toHaveBeenCalled();
    });

    it('returns 400 with NO_INPUT_TEXT when input_text is an empty string', async () => {
      const result = await handler(
        makeEvent(JSON.stringify({ input_text: '' })),
        context,
        callback,
      );

      expect(result).toMatchObject({
        statusCode: 400,
        body: JSON.stringify({ error: ERROR_MESSAGES.NO_INPUT_TEXT }),
      });
      expect(mockCallAdmailBedrockPrompt).not.toHaveBeenCalled();
    });

    it('returns 400 with NO_INPUT_TEXT when input_text is not a string', async () => {
      const result = await handler(
        makeEvent(JSON.stringify({ input_text: 42 })),
        context,
        callback,
      );

      expect(result).toMatchObject({
        statusCode: 400,
        body: JSON.stringify({ error: ERROR_MESSAGES.NO_INPUT_TEXT }),
      });
      expect(mockCallAdmailBedrockPrompt).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('successful invocation', () => {
    const serviceResponse: APIGatewayProxyResult = {
      statusCode: 200,
      body: JSON.stringify({ description: 'A test letter', rating: 'BUSINESS' }),
    };

    it('calls the service with input_text and returns its response', async () => {
      mockCallAdmailBedrockPrompt.mockResolvedValueOnce(serviceResponse);

      const result = await handler(
        makeEvent(JSON.stringify({ input_text: 'test letter content' })),
        context,
        callback,
      );

      expect(result).toEqual(serviceResponse);
      expect(mockCallAdmailBedrockPrompt).toHaveBeenCalledWith(
        'test letter content',
        undefined,
      );
    });

    it('passes file_name to the service when it is provided in the body', async () => {
      mockCallAdmailBedrockPrompt.mockResolvedValueOnce(serviceResponse);

      await handler(
        makeEvent(
          JSON.stringify({ input_text: 'test letter content', file_name: 'letter.pdf' }),
        ),
        context,
        callback,
      );

      expect(mockCallAdmailBedrockPrompt).toHaveBeenCalledWith(
        'test letter content',
        'letter.pdf',
      );
    });

    it('passes undefined for file_name when the field is absent from the body', async () => {
      mockCallAdmailBedrockPrompt.mockResolvedValueOnce(serviceResponse);

      await handler(
        makeEvent(JSON.stringify({ input_text: 'test letter content' })),
        context,
        callback,
      );

      expect(mockCallAdmailBedrockPrompt).toHaveBeenCalledWith(
        'test letter content',
        undefined,
      );
    });

    it('passes undefined for file_name when the field is not a string', async () => {
      mockCallAdmailBedrockPrompt.mockResolvedValueOnce(serviceResponse);

      await handler(
        makeEvent(JSON.stringify({ input_text: 'test letter content', file_name: 99 })),
        context,
        callback,
      );

      expect(mockCallAdmailBedrockPrompt).toHaveBeenCalledWith(
        'test letter content',
        undefined,
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('returns 500 with INTERNAL_SERVER when the service throws an unexpected error', async () => {
      mockCallAdmailBedrockPrompt.mockRejectedValueOnce(new Error('Bedrock unavailable'));

      const result = await handler(
        makeEvent(JSON.stringify({ input_text: 'test letter content' })),
        context,
        callback,
      );

      expect(result).toMatchObject({
        statusCode: 500,
        body: JSON.stringify({ error: ERROR_MESSAGES.INTERNAL_SERVER }),
      });
    });
  });
});
