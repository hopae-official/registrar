import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          EU Wallet Registrar
        </Link>
        <nav className="header-nav">
          <Link to="/">Registry</Link>
          {token && <Link to="/dashboard">Dashboard</Link>}
        </nav>
        <div className="header-auth">
          {token ? (
            <button
              className="btn btn-secondary"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              Sign Out
            </button>
          ) : (
            <>
              <Link to="/sign-in" className="btn btn-secondary">
                Sign In
              </Link>
              <Link to="/sign-up" className="btn btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
