import {
  ApplyGuardrailCommand,
  BedrockRuntimeClient,
  ContentBlock,
  ConverseCommand,
  type ConverseCommandOutput,
  DocumentFormat,
  type ToolConfiguration,
} from "@aws-sdk/client-bedrock-runtime";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { APIGatewayProxyResult } from "aws-lambda";

import type { BedrockConfig } from "src/config";
import {
  CORS_HEADERS,
  ERROR_MESSAGES,
  Rating,
  TOOL_DESCRIPTION,
  TOOL_NAME,
} from "src/constants";
import systemPromptExtended from "src/system_prompt_extended.txt";
import systemPrompt from "src/system_prompt.txt";

const DATA_URL_PATTERN = /^data:([^;]+);base64,([\S\s]+)$/;

const MIME_TO_FORMAT: Partial<Record<string, DocumentFormat>> = {
  "application/pdf": DocumentFormat.PDF,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    DocumentFormat.DOCX,
  "text/plain": DocumentFormat.TXT,
};

export interface LogPromptDetailsInput {
  promptInput: string;
  promptOutput: APIGatewayProxyResult;
  guardrailAssessment: unknown;
  fileName: string | undefined;
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** Formats a Date as DD-MM-YYYY_HH:MM:SS to match the Python logging key format. */
function formatDateTimeForKey(date: Date): string {
  return (
    `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}` +
    `_${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export class BedrockService {
  constructor(
    private readonly config: BedrockConfig,
    private readonly bedrockClient: BedrockRuntimeClient,
    private readonly s3Client: S3Client,
  ) {}

  async callAdmailBedrockPrompt(
    inputLetter: string,
    fileName?: string,
  ): Promise<APIGatewayProxyResult> {
    const prompt = process.env.FEAT_EXTENDED_ADVICE
      ? systemPromptExtended
      : systemPrompt;

    const match = DATA_URL_PATTERN.exec(inputLetter.trim());
    if (!match) {
      return { statusCode: 400, body: ERROR_MESSAGES.INVALID_DATA_URL };
    }

    const [, mime, b64] = match;
    // eslint-disable-next-line security/detect-object-injection
    const format = MIME_TO_FORMAT[mime];
    if (!format) {
      return {
        statusCode: 400,
        body: ERROR_MESSAGES.UNKNOWN_MIME_TYPE(mime),
      };
    }

    const userPrompt = "Analyze the following letter:";

    const guardrailResponse = await this.bedrockClient.send(
      new ApplyGuardrailCommand({
        guardrailIdentifier: this.config.guardrail,
        guardrailVersion: this.config.guardrailVersion,
        source: "INPUT",
        content: [{ text: { text: userPrompt } }],
      }),
    );

    const converseResponse = await this.bedrockClient.send(
      new ConverseCommand({
        modelId: this.config.modelId,
        system: [{ text: prompt }],
        messages: [
          {
            role: "user",
            content: [
              { text: userPrompt },
              {
                document: {
                  format,
                  name: "the_letter",
                  source: { bytes: Buffer.from(b64, "base64") },
                },
              },
            ],
          },
        ],
        inferenceConfig: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          maxTokens: this.config.maxTokens,
        },
        toolConfig: BedrockService.getAdmailToolConfig(),
      }),
    );

    const formattedBody =
      BedrockService.formatConverseResponse(converseResponse);
    const apiGatewayResponse: APIGatewayProxyResult = {
      statusCode: 200,
      body: formattedBody,
      headers: CORS_HEADERS,
    };

    await this.logPromptDetailsToS3({
      promptInput: userPrompt,
      promptOutput: apiGatewayResponse,
      guardrailAssessment: guardrailResponse,
      fileName,
    });

    return apiGatewayResponse;
  }

  static formatConverseResponse(response: ConverseCommandOutput): string {
    const content = response.output?.message?.content ?? [];

    const toolUseBlock = content.find(
      (block): block is ContentBlock.ToolUseMember =>
        "toolUse" in block && block.toolUse !== undefined,
    );

    if (toolUseBlock) {
      return JSON.stringify(toolUseBlock.toolUse.input, null, 4);
    }

    const textBlock = content[0];
    if (textBlock && "text" in textBlock) {
      return textBlock.text ?? "";
    }

    return "";
  }

  static getAdmailToolConfig(): ToolConfiguration {
    return {
      tools: [
        {
          toolSpec: {
            name: TOOL_NAME,
            description: TOOL_DESCRIPTION,
            inputSchema: {
              json: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                    description:
                      "Brief description of the letter or mailing content.",
                  },
                  rating: {
                    type: "string",
                    description:
                      "The eligibility rating for AdMail, as defined by ourselves, use with our prompt",
                    enum: [Rating.BUSINESS, Rating.UNSURE, Rating.ADVERTISING],
                  },
                  reason: {
                    type: "string",
                    description:
                      "Bullet pointed explaination of letter eligibility for Admail",
                  },
                  advice: {
                    type: "string",
                    description:
                      "Actionable bullet points to convert the letter to Admail, if applicable.",
                  },
                },
                required: ["description", "rating", "reason", "advice"],
              },
            },
          },
        },
      ],
      toolChoice: { tool: { name: TOOL_NAME } },
    };
  }

  async logPromptDetailsToS3({
    fileName,
    guardrailAssessment,
    promptInput,
    promptOutput,
  }: LogPromptDetailsInput): Promise<void> {
    const { loggingS3AccountId, loggingS3Bucket, loggingS3KeyPrefix } =
      this.config;

    if (!loggingS3Bucket || !loggingS3KeyPrefix || !loggingS3AccountId) {
      // eslint-disable-next-line no-console
      console.warn(ERROR_MESSAGES.S3_LOGGING_NOT_CONFIGURED);
      return;
    }

    const dateTimeNow = formatDateTimeForKey(new Date());
    const s3Key = `${loggingS3KeyPrefix}${dateTimeNow}|~${fileName}|~.json`;

    const logData = {
      prompt_input: promptInput,
      prompt_output: promptOutput,
      guardrail_assessment: guardrailAssessment,
      model: this.config.modelId,
      inference_parameters: {
        temperature: this.config.temperature,
        top_p: this.config.topP,
        max_tokens: this.config.maxTokens,
      },
      date_time: dateTimeNow,
    };

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: loggingS3Bucket,
          Key: s3Key,
          Body: JSON.stringify(logData, null, 4),
          ContentType: "application/json",
          ExpectedBucketOwner: loggingS3AccountId,
        }),
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error logging to S3:", error);
    }
  }
}

export function createBedrockService(): BedrockService {
  // Imported lazily so the module can be imported in tests without
  // triggering real AWS client construction at module load time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { loadConfig } = require("./config") as typeof import("./config");
  const config = loadConfig();
  return new BedrockService(
    config,
    new BedrockRuntimeClient({ region: config.region }),
    new S3Client({}),
  );
}
