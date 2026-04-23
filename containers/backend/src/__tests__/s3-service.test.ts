// ---------------------------------------------------------------------------
// Set env vars before module imports so the s3-service module-level constants
// are populated when the module is first loaded by Jest.
// ---------------------------------------------------------------------------
process.env.S3_LLM_LOGS_BUCKET = "test-bucket";
process.env.S3_LLM_LOGS_DIRECTORY = "test-dir/";
process.env.S3_LLM_LOGS_BUCKET_ACCOUNT_ID = "123456789012";

jest.spyOn(console, "info").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock("@aws-sdk/client-s3", () => ({
  ...jest.requireActual("@aws-sdk/client-s3"),
  S3Client: jest.fn(() => ({ send: jest.fn() })),
  paginateListObjectsV2: jest.fn(),
}));

// eslint-disable-next-line import-x/first
import {
  GetObjectCommand,
  S3Client,
  paginateListObjectsV2,
} from "@aws-sdk/client-s3";
// eslint-disable-next-line import-x/first
import { fetchS3FileHistory, getS3FileContent, s3Client } from "src/s3-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockPaginate = paginateListObjectsV2 as jest.Mock;

/** Creates a mock S3 body with a transformToString helper. */
function mockS3Body(text: string) {
  return {
    transformToString: jest.fn().mockResolvedValue(text),
  };
}

// ---------------------------------------------------------------------------
describe("fetchS3FileHistory", () => {
  beforeEach(() => {
    mockPaginate.mockReset();
  });

  it("returns files sorted newest-first, skipping directory-marker keys", async () => {
    mockPaginate.mockImplementation(async function* mockMultiPagePaginator() {
      yield {
        Contents: [
          { Key: "test-dir/", LastModified: new Date("2023-01-01T10:00:00Z") },
          {
            Key: "test-dir/file2.json",
            LastModified: new Date("2023-01-02T10:00:00Z"),
          },
        ],
      };
      yield {
        Contents: [
          {
            Key: "test-dir/file1.json",
            LastModified: new Date("2023-01-03T10:00:00Z"),
          },
        ],
      };
    });

    const result = await fetchS3FileHistory();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("test-dir/file1.json");
    expect(result[0].last_modified).toBe("2023-01-03 10:00:00");
    expect(result[1].name).toBe("test-dir/file2.json");
    expect(result[1].last_modified).toBe("2023-01-02 10:00:00");
  });

  it("returns an empty array when there are no objects", async () => {
    mockPaginate.mockImplementation(async function* mockEmptyPaginator() {
      yield { Contents: [] };
    });

    const result = await fetchS3FileHistory();

    expect(result).toEqual([]);
  });

  it("handles pages with no Contents key", async () => {
    mockPaginate.mockImplementation(async function* mockNoContentsPaginator() {
      yield {};
    });

    const result = await fetchS3FileHistory();

    expect(result).toEqual([]);
  });

  it("wraps paginator errors in a descriptive Error and re-throws", async () => {
    mockPaginate.mockImplementation(
      // eslint-disable-next-line require-yield, sonarjs/generator-without-yield
      async function* mockAccessDeniedPaginator() {
        throw Object.assign(new Error("AccessDenied"), {
          Code: "AccessDenied",
        });
      },
    );

    await expect(fetchS3FileHistory()).rejects.toThrow(
      "Error fetching S3 file history",
    );
  });

  it("wraps non-Error paginator rejections using String() and re-throws", async () => {
    // Exercises the `String(error)` branch when the thrown value is not an Error instance
    mockPaginate.mockImplementation(
      // eslint-disable-next-line require-yield, sonarjs/generator-without-yield
      async function* mockStringRejectionPaginator() {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "S3 string rejection";
      },
    );

    await expect(fetchS3FileHistory()).rejects.toThrow(
      "Error fetching S3 file history: S3 string rejection",
    );
  });

  it("passes the correct bucket params to the paginator", async () => {
    mockPaginate.mockImplementation(async function* mockParamCheckPaginator() {
      yield { Contents: [] };
    });

    await fetchS3FileHistory();

    expect(mockPaginate).toHaveBeenCalledWith(
      { client: s3Client },
      expect.objectContaining({
        Bucket: "test-bucket",
        Prefix: "test-dir/",
        ExpectedBucketOwner: "123456789012",
      }),
    );
  });
});

// ---------------------------------------------------------------------------
describe("getS3FileContent", () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();
    (S3Client as jest.Mock).mockReturnValue({ send: mockSend });
    // Re-assign s3Client's send to our mock for each test
    (s3Client as unknown as { send: jest.Mock }).send = mockSend;
  });

  it("fetches the object and returns parsed JSON content", async () => {
    mockSend.mockResolvedValueOnce({
      Body: mockS3Body(JSON.stringify({ test: "content", rating: "BUSINESS" })),
    });

    const result = await getS3FileContent("test-dir/test.json");

    expect(result).toEqual({ test: "content", rating: "BUSINESS" });
    expect(mockSend).toHaveBeenCalledWith(expect.any(GetObjectCommand));
  });

  it("passes the correct bucket params to GetObjectCommand", async () => {
    mockSend.mockResolvedValueOnce({
      Body: mockS3Body('{"ok":true}'),
    });

    await getS3FileContent("test-dir/file.json");

    const cmd = mockSend.mock.calls[0][0] as GetObjectCommand;
    expect(cmd.input.Bucket).toBe("test-bucket");
    expect(cmd.input.Key).toBe("test-dir/file.json");
    expect(cmd.input.ExpectedBucketOwner).toBe("123456789012");
  });

  it("wraps S3 client errors in a descriptive Error and re-throws", async () => {
    mockSend.mockRejectedValueOnce(
      Object.assign(new Error("NoSuchKey"), { Code: "NoSuchKey" }),
    );

    await expect(getS3FileContent("missing.json")).rejects.toThrow(
      "Error fetching S3 file content",
    );
  });

  it("wraps JSON parse errors in a descriptive Error and re-throws", async () => {
    mockSend.mockResolvedValueOnce({
      Body: mockS3Body("not valid json {{"),
    });

    await expect(getS3FileContent("bad.json")).rejects.toThrow(
      "Error fetching S3 file content",
    );
  });

  it("wraps non-Error rejections using String() and re-throws", async () => {
    mockSend.mockRejectedValueOnce("S3 string rejection");

    await expect(getS3FileContent("weird.json")).rejects.toThrow(
      "Error fetching S3 file content: S3 string rejection",
    );
  });
});
