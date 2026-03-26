import { useState } from 'react';
import { useAuth } from './AuthContext.js';
import './Login.css';
import './Shared.css';

export default function Login() {
  const { login, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      // Do Nothing, as a field is empty
      return;
    }
    setSubmitting(true);
    await login(username, password);
    setSubmitting(false);
  };

  return (
    <div className="nhsuk-login-bg">
      <div className="nhsuk-width-container">
        <form onSubmit={handleSubmit} className="nhsuk-form-group">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <img src={window.env?.PUBLIC_URL || process.env.PUBLIC_URL + '/nhs-england-white.svg'} alt="NHS logo" className="nhsuk-login-logo" />
          </div>
          <fieldset className="nhsuk-fieldset">
            <legend className="nhsuk-fieldset__legend nhsuk-fieldset__legend--l">
              <h1 className="nhsuk-heading-l">Notify AI Login</h1>
            </legend>
            <div className="nhsuk-form-group">
              <label className="nhsuk-label" htmlFor="username">Username</label>
              <input
                className="nhsuk-input"
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div className="nhsuk-form-group">
              <label className="nhsuk-label" htmlFor="password">Password</label>
              <input
                className="nhsuk-input"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {error && <span className="nhsuk-error-message">{error}</span>}
            <button type="submit" className="nhsuk-button" disabled={submitting}>Sign in</button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
