import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "./AuthContext.js";
import "./Login.css";
import "./Shared.css";

const ISSUER = "NHS Notify Admail";

/* NHS England logo – rendered above the card, on the blue background */
function NhsLogo() {
  return (
    <img
      src={
        window.env?.PUBLIC_URL ||
        `${process.env.PUBLIC_URL}/nhs-england-white.svg`
      }
      alt="NHS England"
      className="nhsuk-login-logo"
    />
  );
}

/* -------------------------------------------------------------------------
 * MFA first-time setup screen
 * Shows the TOTP secret key so the user can enrol their authenticator app,
 * then asks for the first 6-digit code to confirm enrolment.
 * ---------------------------------------------------------------------- */
function MfaSetupForm({ error, onSubmit, secretCode, submitting, username }) {
  const otpUri = `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(username)}?secret=${secretCode}&issuer=${encodeURIComponent(ISSUER)}`;
  const [totpCode, setTotpCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (totpCode) onSubmit(totpCode);
  };

  return (
    <div className="nhsuk-login-bg">
      <div className="nhsuk-login-container">
        <NhsLogo />
        <div className="nhsuk-login-card">
          <form onSubmit={handleSubmit} noValidate>
            <fieldset className="nhsuk-fieldset">
              <legend className="nhsuk-fieldset__legend nhsuk-fieldset__legend--l">
                <h1 className="nhsuk-heading-l">
                  Set up two-factor authentication
                </h1>
              </legend>

              <p className="nhsuk-body">
                Open your authenticator app (such as Google Authenticator or
                Microsoft Authenticator) and scan the QR code, or add a new
                account manually using the setup key below.
              </p>

              <div
                className="nhsuk-login-qr"
                role="img"
                aria-label="QR code for authenticator app setup"
              >
                <QRCodeSVG value={otpUri} size={200} level="M" marginSize={1} />
                <p className="nhsuk-login-qr__caption">
                  Scan with your authenticator app
                </p>
              </div>

              <div className="nhsuk-login-divider" aria-hidden="true">
                or enter the key manually
              </div>

              <div className="nhsuk-form-group">
                <label className="nhsuk-label nhsuk-label--s">
                  Your setup key
                </label>
                <code className="nhsuk-login-secret-code">{secretCode}</code>
              </div>

              <div className="nhsuk-form-group">
                <label className="nhsuk-label" htmlFor="totp-code">
                  Enter the 6-digit code from your authenticator app
                </label>
                <input
                  className="nhsuk-input nhsuk-input--width-5"
                  id="totp-code"
                  name="totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replaceAll(/\D/gu, ""))
                  }
                />
              </div>

              {error && (
                <span className="nhsuk-error-message" role="alert">
                  <span className="nhsuk-u-visually-hidden">Error: </span>
                  {error}
                </span>
              )}

              <button
                type="submit"
                className="nhsuk-button"
                disabled={submitting}
              >
                Verify and sign in
              </button>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * MFA challenge screen
 * Shown on every subsequent login once MFA is enrolled.
 * ---------------------------------------------------------------------- */
function MfaChallengeForm({ error, onSubmit, submitting }) {
  const [totpCode, setTotpCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (totpCode) onSubmit(totpCode);
  };

  return (
    <div className="nhsuk-login-bg">
      <div className="nhsuk-login-container">
        <NhsLogo />
        <div className="nhsuk-login-card">
          <form onSubmit={handleSubmit} noValidate>
            <fieldset className="nhsuk-fieldset">
              <legend className="nhsuk-fieldset__legend nhsuk-fieldset__legend--l">
                <h1 className="nhsuk-heading-l">Two-factor authentication</h1>
              </legend>

              <p className="nhsuk-body">
                Open your authenticator app and enter the 6-digit code for this
                account.
              </p>

              <div className="nhsuk-form-group">
                <label className="nhsuk-label" htmlFor="totp-code">
                  Authentication code
                </label>
                <input
                  className="nhsuk-input nhsuk-input--width-5"
                  id="totp-code"
                  name="totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replaceAll(/\D/gu, ""))
                  }
                />
              </div>

              {error && (
                <span className="nhsuk-error-message" role="alert">
                  <span className="nhsuk-u-visually-hidden">Error: </span>
                  {error}
                </span>
              )}

              <button
                type="submit"
                className="nhsuk-button"
                disabled={submitting}
              >
                Verify
              </button>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Standard username / password login screen
 * ---------------------------------------------------------------------- */
export default function Login() {
  const { error, login, mfaPending, respondToMfaChallenge } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    await login(username, password);
    setSubmitting(false);
  };

  const handleMfaSubmit = async (totpCode) => {
    setSubmitting(true);
    await respondToMfaChallenge(totpCode);
    setSubmitting(false);
  };

  if (mfaPending?.type === "MFA_SETUP") {
    return (
      <MfaSetupForm
        secretCode={mfaPending.secretCode}
        username={mfaPending.username}
        error={error}
        submitting={submitting}
        onSubmit={handleMfaSubmit}
      />
    );
  }

  if (mfaPending?.type === "SOFTWARE_TOKEN_MFA") {
    return (
      <MfaChallengeForm
        error={error}
        submitting={submitting}
        onSubmit={handleMfaSubmit}
      />
    );
  }

  return (
    <div className="nhsuk-login-bg">
      <div className="nhsuk-login-container">
        <NhsLogo />
        <div className="nhsuk-login-card">
          <form onSubmit={handleSubmit} noValidate>
            <fieldset className="nhsuk-fieldset">
              <legend className="nhsuk-fieldset__legend nhsuk-fieldset__legend--l">
                <h1 className="nhsuk-heading-l">Notify Admail Login</h1>
              </legend>

              <div className="nhsuk-form-group">
                <label className="nhsuk-label" htmlFor="username">
                  Username
                </label>
                <input
                  className="nhsuk-input"
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="nhsuk-form-group">
                <label className="nhsuk-label" htmlFor="password">
                  Password
                </label>
                <input
                  className="nhsuk-input"
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <span className="nhsuk-error-message" role="alert">
                  <span className="nhsuk-u-visually-hidden">Error: </span>
                  {error}
                </span>
              )}

              <button
                type="submit"
                className="nhsuk-button"
                disabled={submitting}
              >
                Sign in
              </button>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}
