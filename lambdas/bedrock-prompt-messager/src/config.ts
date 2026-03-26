export interface BedrockConfig {
  region: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  loggingS3Bucket: string | undefined;
  loggingS3KeyPrefix: string | undefined;
  guardrail: string | undefined;
  guardrailVersion: string | undefined;
  loggingS3AccountId: string | undefined;
}

export function loadConfig(): BedrockConfig {
  return {
    region: process.env.env_region ?? 'eu-west-2',
    modelId: process.env.env_model_id ?? '',
    temperature: parseFloat(process.env.env_temperature ?? '0.1'),
    maxTokens: parseInt(process.env.env_max_tokens ?? '5000', 10),
    topP: parseFloat(process.env.env_top_p ?? '0.5'),
    loggingS3Bucket: process.env.env_logging_s3_bucket,
    loggingS3KeyPrefix: process.env.env_logging_s3_key_prefix,
    guardrail: process.env.env_guardrail_arn,
    guardrailVersion: process.env.env_guardrail_version,
    loggingS3AccountId: process.env.env_logging_s3_account_id,
  };
}
