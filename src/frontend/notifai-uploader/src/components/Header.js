import './Header.css';
import './Shared.css';
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="nhsuk-header" style={{ backgroundColor: '#005eb8', padding: '10px 20px' }}>
        <div className="nhsuk-header__logo-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <img src={window.env?.PUBLIC_URL || process.env.PUBLIC_URL + '/nhs-england-white.svg'} alt="NHS logo" className="nhsuk-header-logo" style={{ height: '80px', marginRight: '10px' }} />
          <h1 style={{ margin: 0, color: '#ffffff', fontSize: '24px' }}>Notif-AI</h1>
        </div>
        <div style={{ height: '100%', width: '2px', backgroundColor: '#ffffff', margin: '0 20px' }}></div>
        <div className="nhsuk-width-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', width: '100%' }}>
        <nav className="nhsuk-header__navigation" aria-label="Primary navigation">
          <ul className="nhsuk-header__navigation-list" style={{ display: 'flex', margin: 0, padding: 0, listStyle: 'none' }}>
            <li className="nhsuk-header__navigation-item" style={{ marginLeft: '20px' }}>
              <Link to="/" className="nhsuk-header__navigation-link" style={{ color: '#ffffff', textDecoration: 'none' }}>File Upload</Link>
            </li>
            <li className="nhsuk-header__navigation-item" style={{ marginLeft: '20px' }}>
              <Link to="/history" className="nhsuk-header__navigation-link" style={{ color: '#ffffff', textDecoration: 'none' }}>History</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
