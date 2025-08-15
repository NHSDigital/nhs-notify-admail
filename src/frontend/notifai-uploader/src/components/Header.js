import './Header.css';
import './Shared.css';
import { useAuth } from './AuthContext';
import { Link } from "react-router-dom";

export default function Header() {
  const { logout } = useAuth();
  return (
    <header>
      <img src={window.env?.PUBLIC_URL || process.env.PUBLIC_URL + '/nhs-england-white.svg'} alt="NHS logo" className="nhsuk-header-logo" />
      <h1>Notify AI</h1>
      <nav>
        <ul className="nhsuk-header__navigation" style={{ display: 'flex', justifyContent: 'center', marginLeft: '50px' }}>
          <li className="nhsuk-header__navigation-item" style={{ paddingLeft: '15px' }}>
            <Link to="/" className="nhsuk-header__navigation-link">File Upload</Link>
          </li>
          <li className="nhsuk-header__navigation-item" style={{ paddingLeft: '15px' }}>
            <Link to="/history" className="nhsuk-header__navigation-link">History</Link>
          </li>
        </ul>
      </nav>
      <button
        onClick={logout}
        className="nhsuk-button nhsuk-button--secondary"
        style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}
      >
        Logout
      </button>
    </header>
  );
}
