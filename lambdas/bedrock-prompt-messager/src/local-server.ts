import * as http from "node:http";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { handler } from ".";

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function buildEvent(
  req: http.IncomingMessage,
  url: URL,
  body: string,
): APIGatewayProxyEvent {
  const queryStringParameters: Record<string, string> | null =
    url.searchParams.size > 0
      ? Object.fromEntries(url.searchParams.entries())
      : null;

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    // eslint-disable-next-line security/detect-object-injection
    headers[key] = Array.isArray(value) ? value[0] : (value ?? "");
  }

  return {
    httpMethod: req.method ?? "GET",
    path: url.pathname,
    resource: url.pathname,
    queryStringParameters,
    multiValueQueryStringParameters: null,
    headers,
    multiValueHeaders: {},
    pathParameters: null,
    stageVariables: null,
    body: body || null,
    isBase64Encoded: false,
    requestContext: {
      accountId: "local",
      apiId: "local",
      protocol: "HTTP/1.1",
      httpMethod: req.method ?? "GET",
      path: url.pathname,
      resourcePath: url.pathname,
      resourceId: "local",
      stage: "local",
      // eslint-disable-next-line sonarjs/pseudo-random
      requestId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requestTimeEpoch: Date.now(),
      authorizer: null,
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: req.socket.remoteAddress ?? "127.0.0.1",
        user: null,
        userAgent: req.headers["user-agent"] ?? null,
        userArn: null,
      },
    },
  };
}

function buildContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "local-dev",
    functionVersion: "$LATEST",
    invokedFunctionArn: "arn:aws:lambda:local:000000000000:function:local-dev",
    memoryLimitInMB: "128",
    // eslint-disable-next-line sonarjs/pseudo-random
    awsRequestId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    logGroupName: "/aws/lambda/local-dev",
    logStreamName: "local",
    getRemainingTimeInMillis: () => 30_000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // CORS preflight — browsers send this before the real request
  if (req.method === "OPTIONS") {
    // eslint-disable-next-line sonarjs/cors
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Health check — consumed by the Docker Compose healthcheck
  if (url.pathname === "/health") {
    // eslint-disable-next-line sonarjs/cors
    res.writeHead(200, { "Content-Type": "application/json", ...CORS_HEADERS });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  try {
    const body = await readBody(req);
    const event = buildEvent(req, url, body);
    const context = buildContext();

    const result = (await handler(event, context, () => {})) as
      | APIGatewayProxyResult
      | undefined;

    if (result == null) {
      res.writeHead(204);
      res.end();
      return;
    }

    const { body: responseBody = "", headers = {}, statusCode = 200 } = result;
    // eslint-disable-next-line sonarjs/cors
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...headers,
    });
    res.end(responseBody);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Handler error:", error);
    // eslint-disable-next-line sonarjs/cors
    res.writeHead(500, { "Content-Type": "application/json", ...CORS_HEADERS });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `Local API Gateway emulator listening on http://localhost:${PORT}`,
  );
});

function shutdown(signal: string): void {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}. Shutting down gracefully…`);
  server.close((err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error("Error during shutdown:", err);
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
    // eslint-disable-next-line no-console
    console.log("Server closed. Exiting.");
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
