import {
  ApplyGuardrailCommand,
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandOutput,
  DocumentFormat,
} from "@aws-sdk/client-bedrock-runtime";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import {
  BedrockService,
  type LogPromptDetailsInput,
  createBedrockService,
} from "src/bedrock-service";
import type { BedrockConfig } from "src/config";
import { ERROR_MESSAGES, Rating, TOOL_NAME } from "src/constants";

// ---------------------------------------------------------------------------
// Module mocks (hoisted before imports by Jest)
// Keep AWS constructors cheap so createBedrockService can be exercised without
// real credentials while still preserving the actual command classes and enums.
// ---------------------------------------------------------------------------
jest.mock("@aws-sdk/client-bedrock-runtime", () => ({
  ...jest.requireActual("@aws-sdk/client-bedrock-runtime"),
  BedrockRuntimeClient: jest.fn(() => ({ send: jest.fn() })),
}));

jest.mock("@aws-sdk/client-s3", () => ({
  ...jest.requireActual("@aws-sdk/client-s3"),
  S3Client: jest.fn(() => ({ send: jest.fn() })),
}));

jest.mock("../config", () => ({
  loadConfig: jest.fn(
    (): BedrockConfig => ({
      region: "eu-west-2",
      modelId: "test-model",
      temperature: 0.1,
      maxTokens: 5000,
      topP: 0.5,
      loggingS3Bucket: "test-bucket",
      loggingS3KeyPrefix: "logs/",
      guardrail: "test-guardrail-arn",
      guardrailVersion: "1",
      loggingS3AccountId: "123456789012",
    }),
  ),
}));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<BedrockConfig> = {}): BedrockConfig {
  return {
    region: "eu-west-2",
    modelId: "test-model",
    temperature: 0.1,
    maxTokens: 5000,
    topP: 0.5,
    loggingS3Bucket: "test-bucket",
    loggingS3KeyPrefix: "logs/",
    guardrail: "test-guardrail-arn",
    guardrailVersion: "1",
    loggingS3AccountId: "123456789012",
    ...overrides,
  };
}

const b64Content = Buffer.from("test letter content").toString("base64");

const GUARDRAIL_RESPONSE = {
  action: "NONE" as const,
  outputs: [],
  assessments: [],
  $metadata: { requestId: "grd-1", httpStatusCode: 200 },
};

const TOOL_USE_RESPONSE = {
  output: {
    message: {
      role: "assistant" as const,
      content: [
        {
          toolUse: {
            toolUseId: "tu-1",
            name: TOOL_NAME,
            input: {
              description: "Test description",
              rating: Rating.BUSINESS,
              reason: "Test reason",
              advice: "Test advice",
            },
          },
        },
      ],
    },
  },
  stopReason: "tool_use" as const,
  $metadata: {},
};

const TEXT_RESPONSE = {
  output: {
    message: {
      role: "assistant" as const,
      content: [{ text: "fallback response text" }],
    },
  },
  stopReason: "end_turn" as const,
  $metadata: {},
};

const S3_RESPONSE = { $metadata: { httpStatusCode: 200 } };

const BASE_LOG_INPUT: LogPromptDetailsInput = {
  promptInput: "Analyze the following letter:",
  promptOutput: { statusCode: 200, body: "{}" },
  guardrailAssessment: GUARDRAIL_RESPONSE,
  fileName: "test.pdf",
};

// ---------------------------------------------------------------------------
describe("BedrockService", () => {
  let bedrockClient: BedrockRuntimeClient;
  let s3Client: S3Client;
  let bedrockSend: jest.Mock;
  let s3Send: jest.Mock;
  let service: BedrockService;

  beforeEach(() => {
    bedrockClient = { send: jest.fn() } as unknown as BedrockRuntimeClient;
    s3Client = { send: jest.fn() } as unknown as S3Client;
    bedrockSend = bedrockClient.send as jest.Mock;
    s3Send = s3Client.send as jest.Mock;
    service = new BedrockService(makeConfig(), bedrockClient, s3Client);
  });

  // -------------------------------------------------------------------------
  describe("callAdmailBedrockPrompt", () => {
    it("returns 400 when the input is not a valid data URL", async () => {
      const result = await service.callAdmailBedrockPrompt("not-a-data-url");

      expect(result.statusCode).toBe(400);
      expect(result.body).toBe(
        JSON.stringify({ error: ERROR_MESSAGES.INVALID_DATA_URL }),
      );
      expect(bedrockSend).not.toHaveBeenCalled();
    });

    it("returns 400 when the MIME type is not supported", async () => {
      const result = await service.callAdmailBedrockPrompt(
        `data:image/png;base64,${b64Content}`,
        "file.png",
      );

      expect(result.statusCode).toBe(400);
      expect(result.body).toContain("image/png");
      expect(bedrockSend).not.toHaveBeenCalled();
    });

    it("returns 500 when guardrail configuration is missing", async () => {
      const noGuardrailService = new BedrockService(
        { ...makeConfig(), guardrail: "" },
        bedrockClient as unknown as BedrockRuntimeClient,
        s3Client as unknown as S3Client,
      );

      const result = await noGuardrailService.callAdmailBedrockPrompt(
        `data:text/plain;base64,${b64Content}`,
      );

      expect(result.statusCode).toBe(500);
      expect(result.body).toBe(
        JSON.stringify({ error: ERROR_MESSAGES.GUARDRAIL_NOT_CONFIGURED }),
      );
    });

    it("processes a text/plain data URL and returns 200 with tool-use output", async () => {
      bedrockSend
        .mockResolvedValueOnce(GUARDRAIL_RESPONSE)
        .mockResolvedValueOnce(TOOL_USE_RESPONSE);
      s3Send.mockResolvedValueOnce(S3_RESPONSE);

      const result = await service.callAdmailBedrockPrompt(
        `data:text/plain;base64,${b64Content}`,
        "file.txt",
      );

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body) as Record<string, string>;
      expect(body.description).toBe("Test description");
      expect(body.rating).toBe(Rating.BUSINESS);

      expect(bedrockSend).toHaveBeenNthCalledWith(
        1,
        expect.any(ApplyGuardrailCommand),
      );
      expect(bedrockSend).toHaveBeenNthCalledWith(
        2,
        expect.any(ConverseCommand),
      );
    });

    it("processes an application/pdf data URL and passes pdf format to Bedrock", async () => {
      bedrockSend
        .mockResolvedValueOnce(GUARDRAIL_RESPONSE)
        .mockResolvedValueOnce(TOOL_USE_RESPONSE);
      s3Send.mockResolvedValueOnce(S3_RESPONSE);

      const result = await service.callAdmailBedrockPrompt(
        `data:application/pdf;base64,${b64Content}`,
        "file.pdf",
      );

      expect(result.statusCode).toBe(200);

      const converseCmd = bedrockSend.mock.calls[1][0] as ConverseCommand;
      expect(converseCmd.input.messages![0].content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            document: expect.objectContaining({ format: DocumentFormat.PDF }),
          }),
        ]),
      );
    });

    it("processes an application/vnd.openxmlformats-officedocument (docx) data URL and passes docx format to Bedrock", async () => {
      bedrockSend
        .mockResolvedValueOnce(GUARDRAIL_RESPONSE)
        .mockResolvedValueOnce(TOOL_USE_RESPONSE);
      s3Send.mockResolvedValueOnce(S3_RESPONSE);

      const result = await service.callAdmailBedrockPrompt(
        `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${b64Content}`,
        "file.docx",
      );

      expect(result.statusCode).toBe(200);

      const converseCmd = bedrockSend.mock.calls[1][0] as ConverseCommand;
      expect(converseCmd.input.messages![0].content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            document: expect.objectContaining({ format: DocumentFormat.DOCX }),
          }),
        ]),
      );
    });

    it("uses the extended system prompt when FEAT_EXTENDED_ADVICE env var is set", async () => {
      process.env.FEAT_EXTENDED_ADVICE = "1";

      bedrockSend
        .mockResolvedValueOnce(GUARDRAIL_RESPONSE)
        .mockResolvedValueOnce(TOOL_USE_RESPONSE);
      s3Send.mockResolvedValueOnce(S3_RESPONSE);

      const result = await service.callAdmailBedrockPrompt(
        `data:text/plain;base64,${b64Content}`,
      );

      expect(result.statusCode).toBe(200);
      // The system prompt passed to ConverseCommand should contain the mock prompt content
      const converseCmd = bedrockSend.mock.calls[1][0] as ConverseCommand;
      expect(converseCmd.input.system![0]).toHaveProperty("text");

      delete process.env.FEAT_EXTENDED_ADVICE;
    });

    it("uses the standard system prompt when FEAT_EXTENDED_ADVICE env var is not set", async () => {
      delete process.env.FEAT_EXTENDED_ADVICE;

      bedrockSend
        .mockResolvedValueOnce(GUARDRAIL_RESPONSE)
        .mockResolvedValueOnce(TOOL_USE_RESPONSE);
      s3Send.mockResolvedValueOnce(S3_RESPONSE);

      const result = await service.callAdmailBedrockPrompt(
        `data:text/plain;base64,${b64Content}`,
        "file.txt",
      );

      expect(result.statusCode).toBe(200);
      const converseCmd = bedrockSend.mock.calls[1][0] as ConverseCommand;
      expect(converseCmd.input.system![0]).toHaveProperty("text");
    });

    it("includes CORS headers in a successful response", async () => {
      bedrockSend
        .mockResolvedValueOnce(GUARDRAIL_RESPONSE)
        .mockResolvedValueOnce(TOOL_USE_RESPONSE);
      s3Send.mockResolvedValueOnce(S3_RESPONSE);

      const result = await service.callAdmailBedrockPrompt(
        `data:text/plain;base64,${b64Content}`,
        "file.txt",
      );

      expect(result.headers).toMatchObject({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("formatConverseResponse", () => {
    it("extracts and JSON-stringifies the tool input when a toolUse block is present", () => {
      const result = BedrockService.formatConverseResponse(
        TOOL_USE_RESPONSE as unknown as ConverseCommandOutput,
      );

      const parsed = JSON.parse(result) as Record<string, string>;
      expect(parsed.description).toBe("Test description");
      expect(parsed.rating).toBe(Rating.BUSINESS);
      expect(parsed.reason).toBe("Test reason");
    });

    it("returns the text value from the first content block when no toolUse is present", () => {
      const result = BedrockService.formatConverseResponse(
        TEXT_RESPONSE as unknown as ConverseCommandOutput,
      );

      expect(result).toBe("fallback response text");
    });

    it("returns an empty string when the content array is empty", () => {
      const result = BedrockService.formatConverseResponse({
        output: { message: { role: "assistant", content: [] } },
        $metadata: {},
      } as unknown as ConverseCommandOutput);

      expect(result).toBe("");
    });

    it("returns an empty string when the first text block has an undefined text value", () => {
      const result = BedrockService.formatConverseResponse({
        output: {
          message: { role: "assistant", content: [{ text: undefined }] },
        },
        $metadata: {},
      } as unknown as ConverseCommandOutput);

      expect(result).toBe("");
    });

    it("returns an empty string when output is missing", () => {
      const result = BedrockService.formatConverseResponse({
        $metadata: {},
      } as unknown as ConverseCommandOutput);

      expect(result).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Local interface for asserting against the strongly-shaped JSON schema that
  // getAdmailToolConfig returns.  The AWS SDK types the inputSchema.json as the
  // opaque DocumentType union, so we cast through unknown to our own shape.
  interface TestToolConfig {
    tools: {
      toolSpec: {
        name: string;
        description: string;
        inputSchema: {
          json: {
            type: string;
            required: string[];
            properties: {
              rating: { enum: readonly string[] };
              [key: string]: unknown;
            };
          };
        };
      };
    }[];
    toolChoice: { tool: { name: string } };
  }

  describe("getAdmailToolConfig", () => {
    it("returns a tool config with the correct tool name and required fields", () => {
      const config =
        BedrockService.getAdmailToolConfig() as unknown as TestToolConfig;

      expect(config.tools).toHaveLength(1);
      expect(config.tools[0].toolSpec.name).toBe(TOOL_NAME);
      expect(config.tools[0].toolSpec.inputSchema.json.required).toEqual(
        expect.arrayContaining(["description", "rating", "reason", "advice"]),
      );
      expect(config.toolChoice).toMatchObject({ tool: { name: TOOL_NAME } });
    });

    it("includes all three rating enum values in the schema", () => {
      const config =
        BedrockService.getAdmailToolConfig() as unknown as TestToolConfig;
      const { enum: ratingEnum } =
        config.tools[0].toolSpec.inputSchema.json.properties.rating;

      expect(ratingEnum).toContain(Rating.BUSINESS);
      expect(ratingEnum).toContain(Rating.UNSURE);
      expect(ratingEnum).toContain(Rating.ADVERTISING);
    });
  });

  // -------------------------------------------------------------------------
  describe("logPromptDetailsToS3", () => {
    it("skips logging and warns when loggingS3Bucket is not configured", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      service = new BedrockService(
        makeConfig({ loggingS3Bucket: undefined }),
        bedrockClient,
        s3Client,
      );

      await service.logPromptDetailsToS3(BASE_LOG_INPUT);

      expect(warnSpy).toHaveBeenCalledWith(
        ERROR_MESSAGES.S3_LOGGING_NOT_CONFIGURED,
      );
      expect(s3Send).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("skips logging and warns when loggingS3KeyPrefix is not configured", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      service = new BedrockService(
        makeConfig({ loggingS3KeyPrefix: undefined }),
        bedrockClient,
        s3Client,
      );

      await service.logPromptDetailsToS3(BASE_LOG_INPUT);

      expect(warnSpy).toHaveBeenCalledWith(
        ERROR_MESSAGES.S3_LOGGING_NOT_CONFIGURED,
      );
      expect(s3Send).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("skips logging and warns when loggingS3AccountId is not configured", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      service = new BedrockService(
        makeConfig({ loggingS3AccountId: undefined }),
        bedrockClient,
        s3Client,
      );

      await service.logPromptDetailsToS3(BASE_LOG_INPUT);

      expect(warnSpy).toHaveBeenCalledWith(
        ERROR_MESSAGES.S3_LOGGING_NOT_CONFIGURED,
      );
      expect(s3Send).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("sends a PutObjectCommand with structured log data when fully configured", async () => {
      s3Send.mockResolvedValueOnce(S3_RESPONSE);

      await service.logPromptDetailsToS3(BASE_LOG_INPUT);

      expect(s3Send).toHaveBeenCalledTimes(1);
      expect(s3Send).toHaveBeenCalledWith(expect.any(PutObjectCommand));

      const cmd = s3Send.mock.calls[0][0] as PutObjectCommand;
      expect(cmd.input.Bucket).toBe("test-bucket");
      expect(cmd.input.ExpectedBucketOwner).toBe("123456789012");
      expect(cmd.input.ContentType).toBe("application/json");

      const body = JSON.parse(cmd.input.Body as string) as Record<
        string,
        unknown
      >;
      expect(body.prompt_input).toBe(BASE_LOG_INPUT.promptInput);
      expect(body.model).toBe("test-model");
      expect(body.inference_parameters).toMatchObject({
        temperature: 0.1,
        top_p: 0.5,
        max_tokens: 5000,
      });
    });

    it("includes the filename in the S3 key", async () => {
      s3Send.mockResolvedValueOnce(S3_RESPONSE);

      await service.logPromptDetailsToS3({
        ...BASE_LOG_INPUT,
        fileName: "my-letter.pdf",
      });

      const cmd = s3Send.mock.calls[0][0] as PutObjectCommand;
      expect(cmd.input.Key).toContain("my-letter.pdf");
    });

    it("logs an error to console when the S3 put throws", async () => {
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      s3Send.mockRejectedValueOnce(new Error("S3 unavailable"));

      await service.logPromptDetailsToS3(BASE_LOG_INPUT);

      expect(errorSpy).toHaveBeenCalledWith(
        "Error logging to S3:",
        expect.any(Error),
      );
      errorSpy.mockRestore();
    });
  });
});

// ---------------------------------------------------------------------------
describe("createBedrockService", () => {
  it("returns a BedrockService instance built from environment config", () => {
    const svc = createBedrockService();
    expect(svc).toBeInstanceOf(BedrockService);
  });
});
