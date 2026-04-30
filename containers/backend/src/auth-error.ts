/* eslint-disable import-x/prefer-default-export */
// ---------------------------------------------------------------------------
// AuthError – carries an HTTP status code so middleware can respond correctly
// ---------------------------------------------------------------------------
export class AuthError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
