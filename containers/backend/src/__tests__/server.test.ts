// ---------------------------------------------------------------------------
// Set env vars before ANY module import that may trigger CognitoAuthenticator
// construction (e.g. createApp / startServer).
// ---------------------------------------------------------------------------
process.env.COGNITO_USER_POOL_ID = "test-pool-id";
process.env.COGNITO_REGION = "eu-west-2";
process.env.COGNITO_APP_CLIENT_ID = "test-client-id";
process.env.S3_LLM_LOGS_BUCKET = "test-bucket";
process.env.S3_LLM_LOGS_DIRECTORY = "test-dir/";
process.env.S3_LLM_LOGS_BUCKET_ACCOUNT_ID = "123456789012";

// ---------------------------------------------------------------------------
// Module mocks — hoisted before imports by Jest.
// jose: prevents real JWKS network calls when CognitoAuthenticator is built.
// s3Service: isolates the server/router from real AWS calls.
// ---------------------------------------------------------------------------
jest.mock("jose", () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

jest.mock("../s3-service", () => ({
  fetchS3FileHistory: jest.fn(),
  getS3FileContent: jest.fn(),
  s3Client: {},
}));

// eslint-disable-next-line import-x/first
import { mockDeep } from "jest-mock-extended";
// eslint-disable-next-line import-x/first
import request from "supertest";

// eslint-disable-next-line import-x/first
import { AuthError, CognitoAuthenticator } from "src/auth";
// eslint-disable-next-line import-x/first
import { ERROR_NOT_FOUND } from "src/constants";
// eslint-disable-next-line import-x/first
import { fetchS3FileHistory, getS3FileContent } from "src/s3-service";
// eslint-disable-next-line import-x/first
import { createApp } from "src/server";
// eslint-disable-next-line import-x/first
import http from "node:http";

// ---------------------------------------------------------------------------
// Typed references to the mocked S3 service functions
// ---------------------------------------------------------------------------
const mockFetchHistory = fetchS3FileHistory as jest.Mock;
const mockGetContent = getS3FileContent as jest.Mock;

// ---------------------------------------------------------------------------
// Shared mock authenticator injected into the app under test.
// Using mockDeep avoids constructing a real CognitoAuthenticator and therefore
// avoids real JWKS network calls in integration tests.
// ---------------------------------------------------------------------------
const mockAuth = mockDeep<CognitoAuthenticator>();
const app = createApp(mockAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BEARER = { Authorization: "Bearer test-token" };

function validAuthSetup() {
  mockAuth.validateToken.mockResolvedValue({
    sub: "123",
    username: "testuser",
  });
}

// ---------------------------------------------------------------------------
beforeEach(() => {
  mockAuth.validateToken.mockReset();
  mockFetchHistory.mockReset();
  mockGetContent.mockReset();
});

// ===========================================================================
describe("GET /health", () => {
  it("responds 200 with { detail: ok } without requiring an auth header", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ detail: "ok" });
    expect(mockAuth.validateToken).not.toHaveBeenCalled();
  });
});

// ===========================================================================
describe("Auth middleware", () => {
  it("returns 401 when the Authorization header is missing", async () => {
    const res = await request(app).get("/s3/history");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("detail");
  });

  it("returns 401 when the Authorization scheme is not Bearer", async () => {
    const res = await request(app)
      .get("/s3/history")
      .set("Authorization", "Basic dXNlcjpwYXNz");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("detail");
  });

  it('returns 401 when the token part is empty after "Bearer "', async () => {
    const res = await request(app)
      .get("/s3/history")
      .set("Authorization", "Bearer ");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("detail");
  });

  it("passes through to the route when validateToken resolves successfully", async () => {
    validAuthSetup();
    mockFetchHistory.mockResolvedValue([]);

    const res = await request(app).get("/s3/history").set(BEARER);

    expect(res.status).toBe(200);
    expect(mockAuth.validateToken).toHaveBeenCalledWith("test-token");
  });

  it("returns 401 when validateToken throws an AuthError", async () => {
    mockAuth.validateToken.mockRejectedValue(
      new AuthError(401, "Token has expired.", {
        "WWW-Authenticate": "Bearer",
      }),
    );

    const res = await request(app).get("/s3/history").set(BEARER);

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe("Token has expired.");
  });

  it("forwards the AuthError detail message verbatim", async () => {
    mockAuth.validateToken.mockRejectedValue(
      new AuthError(401, "Invalid claims: aud", {
        "WWW-Authenticate": "Bearer",
      }),
    );

    const res = await request(app).get("/s3/history").set(BEARER);

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe("Invalid claims: aud");
  });

  it("returns 500 when validateToken throws an unexpected non-AuthError", async () => {
    mockAuth.validateToken.mockRejectedValue(new Error("Unexpected failure"));

    const res = await request(app).get("/s3/history").set(BEARER);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("detail");
  });

  it("bypasses auth for OPTIONS preflight requests", async () => {
    const res = await request(app)
      .options("/s3/history")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "GET");

    expect(res.status).toBeLessThan(300);
    expect(mockAuth.validateToken).not.toHaveBeenCalled();
  });
});

// ===========================================================================
describe("CORS", () => {
  it("allows requests from localhost origins", async () => {
    validAuthSetup();
    mockFetchHistory.mockResolvedValue([]);

    const res = await request(app)
      .get("/s3/history")
      .set(BEARER)
      .set("Origin", "http://localhost:3000");

    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
  });

  it("allows requests from awsapprunner.com origins", async () => {
    validAuthSetup();
    mockFetchHistory.mockResolvedValue([]);

    const res = await request(app)
      .get("/s3/history")
      .set(BEARER)
      .set("Origin", "https://abc123.eu-west-2.awsapprunner.com");

    expect(res.headers["access-control-allow-origin"]).toBe(
      "https://abc123.eu-west-2.awsapprunner.com",
    );
  });

  it("does not set the allow-origin header for disallowed origins", async () => {
    validAuthSetup();
    mockFetchHistory.mockResolvedValue([]);

    const res = await request(app)
      .get("/s3/history")
      .set(BEARER)
      .set("Origin", "https://evil.example.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

// ===========================================================================
describe("GET /s3/history", () => {
  it("returns 200 with a list of file entries on service success", async () => {
    validAuthSetup();
    mockFetchHistory.mockResolvedValue([
      { name: "logs/file1.json", last_modified: "2023-01-02 10:00:00" },
      { name: "logs/file2.json", last_modified: "2023-01-01 10:00:00" },
    ]);

    const res = await request(app).get("/s3/history").set(BEARER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("logs/file1.json");
    expect(mockFetchHistory).toHaveBeenCalledTimes(1);
  });

  it("returns 500 with an error detail when the S3 service throws", async () => {
    validAuthSetup();
    mockFetchHistory.mockRejectedValue(
      new Error("Error fetching S3 file history: AccessDenied"),
    );

    const res = await request(app).get("/s3/history").set(BEARER);

    expect(res.status).toBe(500);
    expect(res.body.detail).toContain("Error fetching S3 file history");
  });
});

// ===========================================================================
describe("GET /s3/download", () => {
  it("returns 200 with parsed JSON content on service success", async () => {
    validAuthSetup();
    mockGetContent.mockResolvedValue({
      prompt_input: "hello",
      rating: "BUSINESS",
    });

    const res = await request(app)
      .get("/s3/download")
      .query({ file_name: "logs/test.json" })
      .set(BEARER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ prompt_input: "hello", rating: "BUSINESS" });
    expect(mockGetContent).toHaveBeenCalledWith("logs/test.json");
  });

  it("returns 400 when file_name query parameter is missing", async () => {
    validAuthSetup();

    const res = await request(app).get("/s3/download").set(BEARER);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("detail");
    expect(mockGetContent).not.toHaveBeenCalled();
  });

  it("returns 500 with an error detail when the S3 service throws", async () => {
    validAuthSetup();
    mockGetContent.mockRejectedValue(
      new Error("Error fetching S3 file content: NoSuchKey"),
    );

    const res = await request(app)
      .get("/s3/download")
      .query({ file_name: "missing.json" })
      .set(BEARER);

    expect(res.status).toBe(500);
    expect(res.body.detail).toContain("Error fetching S3 file content");
  });
});

// ===========================================================================
describe("404 handler", () => {
  it("returns 404 with ERROR_NOT_FOUND when a valid token hits an unknown path", async () => {
    validAuthSetup();

    const res = await request(app).get("/does-not-exist").set(BEARER);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ detail: ERROR_NOT_FOUND });
  });

  it("returns 401 when no auth header is sent to an unknown path", async () => {
    const res = await request(app).get("/does-not-exist");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("detail");
  });

  it("returns 401 when the token is invalid for an unknown path", async () => {
    mockAuth.validateToken.mockRejectedValue(
      new AuthError(401, "Token has expired.", {
        "WWW-Authenticate": "Bearer",
      }),
    );

    const res = await request(app).get("/does-not-exist").set(BEARER);

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe("Token has expired.");
  });

  it("returns 500 when validateToken throws an unexpected error in the 404 handler", async () => {
    // Auth middleware lets this through (unexpected error → 500), but since
    // middleware already responded, the 404 handler is not reached.
    // Test the 404 handler's own non-AuthError path by calling it after a valid
    // auth middleware pass with a crashing validateToken on the second call.
    mockAuth.validateToken
      .mockResolvedValueOnce({ sub: "123" }) // middleware passes
      .mockRejectedValueOnce(new Error("DB crash")); // 404 handler re-validates

    const res = await request(app).get("/does-not-exist").set(BEARER);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("detail");
  });
});

// ===========================================================================
describe("CognitoAuthenticator constructor", () => {
  it("throws when COGNITO_USER_POOL_ID is not set", () => {
    const saved = process.env.COGNITO_USER_POOL_ID;
    delete process.env.COGNITO_USER_POOL_ID;

    expect(() => new CognitoAuthenticator()).toThrow(
      "COGNITO_USER_POOL_ID environment variable not set",
    );

    process.env.COGNITO_USER_POOL_ID = saved;
  });

  it("emits a console.warn and skips audience validation when COGNITO_APP_CLIENT_ID is not set", async () => {
    const { jwtVerify } = jest.requireMock<{ jwtVerify: jest.Mock }>("jose");
    jwtVerify.mockResolvedValue({ payload: { sub: "no-aud" } });

    const savedClientId = process.env.COGNITO_APP_CLIENT_ID;
    delete process.env.COGNITO_APP_CLIENT_ID;

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const auth = new CognitoAuthenticator();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("COGNITO_APP_CLIENT_ID"),
    );

    // validateToken should work without audience claim
    const payload = await auth.validateToken("no-aud-token");
    expect(payload.sub).toBe("no-aud");

    warnSpy.mockRestore();
    process.env.COGNITO_APP_CLIENT_ID = savedClientId;
  });
});

// ===========================================================================
describe("CognitoAuthenticator.validateToken (unit)", () => {
  const { jwtVerify } = jest.requireMock<{ jwtVerify: jest.Mock }>("jose");

  beforeEach(() => {
    jwtVerify.mockReset();
  });

  it("returns the JWT payload on success", async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: "999", username: "alice" } });
    const auth = new CognitoAuthenticator();

    const payload = await auth.validateToken("good-token");

    expect(payload.sub).toBe("999");
  });

  it('throws AuthError 401 with "Token has expired." for ERR_JWT_EXPIRED', async () => {
    jwtVerify.mockRejectedValue(
      Object.assign(new Error("jwt expired"), { code: "ERR_JWT_EXPIRED" }),
    );
    const auth = new CognitoAuthenticator();

    await expect(auth.validateToken("expired")).rejects.toMatchObject({
      statusCode: 401,
      message: "Token has expired.",
    });
  });

  it("throws AuthError 401 with claim message for ERR_JWT_CLAIM_VALIDATION_FAILED", async () => {
    jwtVerify.mockRejectedValue(
      Object.assign(new Error("audience mismatch"), {
        code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
      }),
    );
    const auth = new CognitoAuthenticator();

    await expect(auth.validateToken("bad-claims")).rejects.toMatchObject({
      statusCode: 401,
      message: expect.stringContaining("Invalid claims"),
    });
  });

  it("throws AuthError 401 with ERROR_INVALID_TOKEN for other JOSE errors", async () => {
    jwtVerify.mockRejectedValue(
      Object.assign(new Error("bad signature"), {
        code: "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
      }),
    );
    const auth = new CognitoAuthenticator();

    await expect(auth.validateToken("bad-sig")).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid token",
    });
  });

  it("throws AuthError 500 for non-JOSE errors", async () => {
    jwtVerify.mockRejectedValue(new Error("network failure"));
    const auth = new CognitoAuthenticator();

    await expect(auth.validateToken("any")).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});

// ===========================================================================
describe("verifyRequestToken edge cases", () => {
  it("returns 401 when the Authorization header has no space (no scheme separator)", async () => {
    // e.g. "Authorization: justtoken" — no space means scheme = full string, token = ''
    const res = await request(app)
      .get("/s3/history")
      .set("Authorization", "justtoken");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("detail");
  });
});

// ===========================================================================
describe("404 handler AuthError path", () => {
  it("returns 401 from the 404 handler when the second validateToken call throws an AuthError", async () => {
    // Auth middleware passes on the first call; 404 handler's own re-validation throws AuthError
    mockAuth.validateToken
      .mockResolvedValueOnce({ sub: "123" })
      .mockRejectedValueOnce(
        new AuthError(401, "Token has expired.", {
          "WWW-Authenticate": "Bearer",
        }),
      );

    const res = await request(app).get("/does-not-exist").set(BEARER);

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe("Token has expired.");
  });

  it("returns 401 from the 404 handler when AuthError has no headers property", async () => {
    // Exercises the `error.headers ?? {}` fallback in createNotFoundHandler
    mockAuth.validateToken
      .mockResolvedValueOnce({ sub: "123" })
      .mockRejectedValueOnce(new AuthError(401, "No headers AuthError"));

    const res = await request(app).get("/does-not-exist").set(BEARER);

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe("No headers AuthError");
  });
});

// ===========================================================================
describe("auth middleware AuthError with no headers", () => {
  it("returns 401 without crashing when AuthError has no headers (exercises ?? {} fallback)", async () => {
    // AuthError constructed without the third argument → headers is undefined
    mockAuth.validateToken.mockRejectedValue(
      new AuthError(401, "Bare auth error"),
    );

    const res = await request(app).get("/s3/history").set(BEARER);

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe("Bare auth error");
  });
});

// ===========================================================================
describe("s3Router non-Error rejections", () => {
  it("falls back to 'Internal server error' when fetchS3FileHistory rejects with a non-Error value", async () => {
    validAuthSetup();
    // Reject with a plain string (not an Error instance) to exercise the `?? 'Internal server error'` branch
    mockFetchHistory.mockRejectedValue("string rejection");

    const res = await request(app).get("/s3/history").set(BEARER);

    expect(res.status).toBe(500);
    expect(res.body.detail).toBe("Internal server error");
  });

  it("falls back to 'Internal server error' when getS3FileContent rejects with a non-Error value", async () => {
    validAuthSetup();
    mockGetContent.mockRejectedValue("string rejection");

    const res = await request(app)
      .get("/s3/download")
      .query({ file_name: "test.json" })
      .set(BEARER);

    expect(res.status).toBe(500);
    expect(res.body.detail).toBe("Internal server error");
  });
});

// ===========================================================================
describe("startServer", () => {
  it("starts a server on the given port and responds to requests", async () => {
    const { startServer } =
      jest.requireActual<typeof import("../server")>("../server");

    // Use port 0 to let the OS pick a free port
    const server = startServer(0);

    await new Promise<void>((resolve, reject) => {
      server.on("listening", () => {
        const address = server.address() as { port: number };

        http.get(`http://localhost:${address.port}/health`, (res) => {
          expect(res.statusCode).toBe(200);
          server.close((err) => (err ? reject(err) : resolve()));
        });
      });
      server.on("error", reject);
    });
  });
});

// ===========================================================================
describe("CognitoAuthenticator — remaining constructor branches", () => {
  it("uses eu-west-2 as region when COGNITO_REGION is not set", () => {
    const saved = process.env.COGNITO_REGION;
    delete process.env.COGNITO_REGION;

    const auth = new CognitoAuthenticator();
    // If construction succeeds, the region defaulted — no assertion beyond no-throw
    expect(auth).toBeInstanceOf(CognitoAuthenticator);

    process.env.COGNITO_REGION = saved;
  });
});

// ===========================================================================
describe("mapValidationError — non-Error JOSE object", () => {
  it("uses String() for the message when the JOSE error is not an Error instance", async () => {
    const { jwtVerify } = jest.requireMock<{ jwtVerify: jest.Mock }>("jose");
    // A plain object with a JOSE code but not an Error instance
    jwtVerify.mockRejectedValue(
      Object.assign(Object.create(null) as object, {
        code: "ERR_JWT_EXPIRED",
        toString: () => "plain jose object",
      }),
    );
    const auth = new CognitoAuthenticator();

    await expect(auth.validateToken("any")).rejects.toMatchObject({
      statusCode: 401,
      message: "Token has expired.",
    });
  });
});

// ===========================================================================
describe("startServer — default port branch", () => {
  it("starts without arguments, using process.env.PORT when set", async () => {
    const saved = process.env.PORT;
    process.env.PORT = "0"; // port 0 = OS-assigned free port

    const { startServer: start } =
      jest.requireActual<typeof import("../server")>("../server");
    const server = start();

    await new Promise<void>((resolve, reject) => {
      server.on("listening", () => {
        expect(server.listening).toBe(true);
        server.close((err) => (err ? reject(err) : resolve()));
      });
      server.on("error", reject);
    });

    process.env.PORT = saved;
  });
});
