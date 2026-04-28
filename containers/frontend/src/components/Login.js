import { useState } from "react";
import { useAuth } from "./AuthContext.js";
import "./Login.css";
import "./Shared.css";

function NhsLogo() {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}
    >
      <img
        src={
          window.env?.PUBLIC_URL ||
          `${process.env.PUBLIC_URL}/nhs-england-white.svg`
        }
        alt="NHS logo"
        className="nhsuk-login-logo"
      />
    </div>
  );
}

function MfaSetupForm({ secretCode, error, submitting, onSubmit }) {
  const [totpCode, setTotpCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (totpCode) onSubmit(totpCode);
  };

  return (
    <div className="nhsuk-login-bg">
      <div className="nhsuk-width-container">
        <form onSubmit={handleSubmit} className="nhsuk-form-group">
          <NhsLogo />
          <fieldset className="nhsuk-fieldset">
            <legend className="nhsuk-fieldset__legend nhsuk-fieldset__legend--l">
              <h1 className="nhsuk-heading-l">
                Set up two-factor authentication
              </h1>
            </legend>
            <p className="nhsuk-body">
              Open your authenticator app (such as Google Authenticator or
              Microsoft Authenticator) and add a new account by entering the
              setup key below.
            </p>
            <div className="nhsuk-form-group">
              <label
                className="nhsuk-label nhsuk-label--s"
                htmlFor="secret-code"
              >
                Your setup key
              </label>
              <p className="nhsuk-body" id="secret-code">
                <code>{secretCode}</code>
              </p>
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
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {error && <span className="nhsuk-error-message">{error}</span>}
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
  );
}

function MfaChallengeForm({ error, submitting, onSubmit }) {
  const [totpCode, setTotpCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (totpCode) onSubmit(totpCode);
  };

  return (
    <div className="nhsuk-login-bg">
      <div className="nhsuk-width-container">
        <form onSubmit={handleSubmit} className="nhsuk-form-group">
          <NhsLogo />
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
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {error && <span className="nhsuk-error-message">{error}</span>}
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
  );
}

export default function Login() {
  const { error, login, mfaPending, respondToMfaChallenge } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      return;
    }
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
      <div className="nhsuk-width-container">
        <form onSubmit={handleSubmit} className="nhsuk-form-group">
          <NhsLogo />
          <fieldset className="nhsuk-fieldset">
            <legend className="nhsuk-fieldset__legend nhsuk-fieldset__legend--l">
              <h1 className="nhsuk-heading-l">Notify AI Login</h1>
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
            {error && <span className="nhsuk-error-message">{error}</span>}
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
  );
}
