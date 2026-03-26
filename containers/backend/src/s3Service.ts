import { GetObjectCommand, S3Client, paginateListObjectsV2 } from '@aws-sdk/client-s3';

import type { Readable } from 'node:stream';

export const s3Client = new S3Client({});

const BUCKET_NAME = process.env.S3_LLM_LOGS_BUCKET;
const BUCKET_DIRECTORY = process.env.S3_LLM_LOGS_DIRECTORY;
const BUCKET_ACCOUNT_ID = process.env.S3_LLM_LOGS_BUCKET_ACCOUNT_ID;

console.info(`S3 Bucket Name: ${BUCKET_NAME}`);
console.info(`S3 Bucket Directory: ${BUCKET_DIRECTORY}`);
console.info(`S3 Bucket Account ID: ${BUCKET_ACCOUNT_ID}`);

export interface FileEntry {
  name: string;
  last_modified: string;
}

/** Formats a Date as YYYY-MM-DD HH:MM:SS (UTC) to match Python's strftime format. */
function formatDatetime(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

export async function fetchS3FileHistory(): Promise<FileEntry[]> {
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: BUCKET_DIRECTORY,
    ExpectedBucketOwner: BUCKET_ACCOUNT_ID,
  };

  try {
    const files: Array<{ name: string; lastModified: Date }> = [];

    for await (const page of paginateListObjectsV2({ client: s3Client }, params)) {
      const contents = page.Contents ?? [];
      console.info(`Received page with ${contents.length} objects.`);

      for (const obj of contents) {
        if (obj.Key && !obj.Key.endsWith('/') && obj.LastModified) {
          files.push({ name: obj.Key, lastModified: obj.LastModified });
        }
      }
    }

    files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    console.info(`Successfully fetched and sorted ${files.length} files.`);

    return files.map((f) => ({
      name: f.name,
      last_modified: formatDatetime(f.lastModified),
    }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching S3 file history: ${msg}`);
    throw new Error(`Error fetching S3 file history: ${msg}`);
  }
}

export async function getS3FileContent(fileName: string): Promise<unknown> {
  console.info(`Attempting to fetch file content for key: ${fileName}`);

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        ExpectedBucketOwner: BUCKET_ACCOUNT_ID,
      }),
    );

    // AWS SDK v3 Node.js streams support transformToString() directly
    const text = await (response.Body as Readable & { transformToString(): Promise<string> }).transformToString();
    const parsed = JSON.parse(text) as unknown;

    console.info(`Successfully fetched and parsed content for file: ${fileName}`);
    return parsed;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching S3 file content: ${msg}`);
    throw new Error(`Error fetching S3 file content: ${msg}`);
  }
}
