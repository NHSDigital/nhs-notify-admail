import './Header.css';
import './Shared.css';
import { useAuth } from './AuthContext';

export default function Header() {
  const { logout } = useAuth();
  return (
    <header>
      <img src={process.env.PUBLIC_URL + '/nhs-england-white.svg'} alt="NHS logo" className="nhsuk-header-logo" />
      <h1>Notify AI</h1>
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