import cors from "cors";
import express from "express";

import {
  CognitoAuthenticator,
  createAuthMiddleware,
  createNotFoundHandler,
} from "src/auth";
import router from "src/s3-router";

// ---------------------------------------------------------------------------
// CORS – mirrors FastAPI allow_origin_regex in main.py
// App Runner service URLs, localhost (any port), and 127.0.0.1
// ---------------------------------------------------------------------------
const ALLOWED_ORIGIN =
  /^(https:\/\/[a-z0-9]+\.[a-z0-9-]+\.awsapprunner\.com|http:\/\/localhost:\d+|http:\/\/127\.0\.0\.1:\d+)$/;

// ---------------------------------------------------------------------------
// createApp – builds and returns the Express application.
// Accepts an optional CognitoAuthenticator for testing; creates one from the
// environment when called without arguments.
// ---------------------------------------------------------------------------
export function createApp(
  authenticator: CognitoAuthenticator = new CognitoAuthenticator(),
) {
  const app = express();

  app.use(express.json({ limit: "10mb" }));

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGIN.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowedHeaders: ["Authorization", "Content-Type", "Accept"],
    }),
  );

  // Auth middleware – validates Bearer tokens on every non-OPTIONS, non-/health request
  app.use(createAuthMiddleware(authenticator));

  // Health check – unauthenticated, consumed by load balancers and docker-compose
  app.get("/health", (_req, res) => {
    res.json({ detail: "ok" });
  });

  // S3 routes
  app.use("/s3", router);

  // 404 catch-all – re-validates auth to prevent API surface mapping
  app.use(createNotFoundHandler(authenticator));

  return app;
}

// ---------------------------------------------------------------------------
// startServer – creates the app and binds it to a port
// ---------------------------------------------------------------------------
export function startServer(port = Number(process.env.PORT ?? 8080)) {
  const app = createApp();
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend server listening on port ${port}`);
  });
  return server;
}

/* istanbul ignore next */
// Only start the server when this module is executed directly (not imported by tests)
if (require.main === module) {
  startServer();
}
