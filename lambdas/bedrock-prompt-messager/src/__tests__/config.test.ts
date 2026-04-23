import { loadConfig } from "src/config";

describe("loadConfig", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("returns default values when env vars are not set", () => {
    delete process.env.env_region;
    delete process.env.env_model_id;
    delete process.env.env_temperature;
    delete process.env.env_max_tokens;
    delete process.env.env_top_p;
    delete process.env.env_logging_s3_bucket;
    delete process.env.env_logging_s3_key_prefix;
    delete process.env.env_guardrail_arn;
    delete process.env.env_guardrail_version;
    delete process.env.env_logging_s3_account_id;

    const config = loadConfig();

    expect(config.region).toBe("eu-west-2");
    expect(config.modelId).toBe("");
    expect(config.temperature).toBe(0.1);
    expect(config.maxTokens).toBe(5000);
    expect(config.topP).toBe(0.5);
    expect(config.loggingS3Bucket).toBeUndefined();
    expect(config.loggingS3KeyPrefix).toBeUndefined();
    expect(config.guardrail).toBeUndefined();
    expect(config.guardrailVersion).toBeUndefined();
    expect(config.loggingS3AccountId).toBeUndefined();
  });

  it("returns parsed values from env vars when set", () => {
    process.env.env_region = "us-east-1";
    process.env.env_model_id = "test-model";
    process.env.env_temperature = "0.7";
    process.env.env_max_tokens = "1000";
    process.env.env_top_p = "0.9";
    process.env.env_logging_s3_bucket = "my-bucket";
    process.env.env_logging_s3_key_prefix = "my-prefix";
    process.env.env_guardrail_arn = "my-guardrail";
    process.env.env_guardrail_version = "1.0";
    process.env.env_logging_s3_account_id = "123456789012";

    const config = loadConfig();

    expect(config.region).toBe("us-east-1");
    expect(config.modelId).toBe("test-model");
    expect(config.temperature).toBe(0.7);
    expect(config.maxTokens).toBe(1000);
    expect(config.topP).toBe(0.9);
    expect(config.loggingS3Bucket).toBe("my-bucket");
    expect(config.loggingS3KeyPrefix).toBe("my-prefix");
    expect(config.guardrail).toBe("my-guardrail");
    expect(config.guardrailVersion).toBe("1.0");
    expect(config.loggingS3AccountId).toBe("123456789012");
  });
});
