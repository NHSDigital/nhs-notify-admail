import type { JWTPayload, JWTVerifyOptions, KeyLike } from "jose";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { NextFunction, Request, Response } from "express";

import { ERROR_INVALID_TOKEN, ERROR_NOT_FOUND } from "src/constants";
import { AuthError } from "src/auth-error";

export { AuthError } from "src/auth-error";

// ---------------------------------------------------------------------------
// Augment Express Request so downstream handlers can access the validated user
// ---------------------------------------------------------------------------
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// ---------------------------------------------------------------------------
// Error-code helpers (jose uses `.code` rather than subclass-only checks)
// ---------------------------------------------------------------------------
function isJoseError(
  error: unknown,
): error is { code: string; message: string } {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as Record<string, unknown>).code === "string"
  );
}

function mapValidationError(error: unknown): AuthError {
  if (isJoseError(error)) {
    const msg = error instanceof Error ? error.message : String(error);

    if (error.code === "ERR_JWT_EXPIRED") {
      return new AuthError(401, "Token has expired.", {
        "WWW-Authenticate": "Bearer",
      });
    }

    if (error.code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
      return new AuthError(401, `Invalid claims: ${msg}`, {
        "WWW-Authenticate": "Bearer",
      });
    }

    // All other JOSE errors (bad signature, unknown key, invalid structure…)
    return new AuthError(401, ERROR_INVALID_TOKEN, {
      "WWW-Authenticate": "Bearer",
    });
  }

  // Non-JOSE errors are unexpected – surface as 500
  return new AuthError(
    500,
    "An unexpected error occurred during token validation.",
  );
}

// ---------------------------------------------------------------------------
// CognitoAuthenticator
// ---------------------------------------------------------------------------
export class CognitoAuthenticator {
  private readonly region: string;

  private readonly userPoolId: string;

  private readonly appClientId: string | undefined;

  private readonly issuer: string;

  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    this.region = process.env.COGNITO_REGION ?? "eu-west-2";

    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      throw new Error("COGNITO_USER_POOL_ID environment variable not set");
    }
    this.userPoolId = userPoolId;

    this.appClientId = process.env.COGNITO_APP_CLIENT_ID;
    if (!this.appClientId) {
      // eslint-disable-next-line no-console
      console.warn(
        "COGNITO_APP_CLIENT_ID environment variable not set. Audience validation will be skipped.",
      );
    }

    this.issuer = `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`;
    this.jwks = createRemoteJWKSet(
      new URL(`${this.issuer}/.well-known/jwks.json`),
    );
  }

  async validateToken(token: string): Promise<JWTPayload> {
    const options: JWTVerifyOptions = {
      algorithms: ["RS256"],
      issuer: this.issuer,
    };

    if (this.appClientId) {
      options.audience = this.appClientId;
    }

    try {
      const { payload } = await jwtVerify(
        token,
        this.jwks as unknown as KeyLike,
        options,
      );
      return payload;
    } catch (error) {
      throw mapValidationError(error);
    }
  }
}

// ---------------------------------------------------------------------------
// Shared helper: extract and validate Bearer token from a request
// ---------------------------------------------------------------------------
export async function verifyRequestToken(
  req: Request,
  authenticator: CognitoAuthenticator,
): Promise<JWTPayload> {
  const { authorization } = req.headers;

  if (!authorization) {
    throw new AuthError(401, "Authorization header missing", {
      "WWW-Authenticate": "Bearer",
    });
  }

  const spaceIndex = authorization.indexOf(" ");
  const scheme =
    spaceIndex === -1 ? authorization : authorization.slice(0, spaceIndex);
  const token =
    spaceIndex === -1 ? "" : authorization.slice(spaceIndex + 1).trim();

  if (!token || scheme.toLowerCase() !== "bearer") {
    throw new AuthError(401, "Invalid authentication scheme", {
      "WWW-Authenticate": "Bearer",
    });
  }

  return authenticator.validateToken(token);
}

// ---------------------------------------------------------------------------
// Auth middleware – skips OPTIONS (preflight) and /health
// ---------------------------------------------------------------------------
export function createAuthMiddleware(authenticator: CognitoAuthenticator) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (req.method === "OPTIONS" || req.path === "/health") {
      next();
      return;
    }

    try {
      req.user = await verifyRequestToken(req, authenticator);
      next();
    } catch (error) {
      if (error instanceof AuthError) {
        res
          .status(error.statusCode)
          .set(error.headers ?? {})
          .json({ detail: error.message });
        return;
      }

      res.status(500).json({ detail: "Internal server error" });
    }
  };
}

// ---------------------------------------------------------------------------
// 404 handler – mirrors Python NotFoundExceptionHandler: returns 401 for
// invalid/missing tokens and 404 for valid tokens hitting unknown paths.
// Re-validating here provides defence-in-depth independent of middleware order.
// ---------------------------------------------------------------------------
export function createNotFoundHandler(authenticator: CognitoAuthenticator) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await verifyRequestToken(req, authenticator);
      res.status(404).json({ detail: ERROR_NOT_FOUND });
    } catch (error) {
      if (error instanceof AuthError) {
        res
          .status(error.statusCode)
          .set(error.headers ?? {})
          .json({ detail: error.message });
        return;
      }

      res.status(500).json({ detail: "Internal server error" });
    }
  };
}
