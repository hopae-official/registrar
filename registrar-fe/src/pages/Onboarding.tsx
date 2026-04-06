import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Onboarding() {
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) navigate('/sign-in');
  }, [token, navigate]);

  return (
    <div className="page">
      <h1>Get Started</h1>
      <p className="subtitle">
        Choose how you want to participate in the EU Digital Identity Wallet ecosystem.
      </p>

      <div className="onboarding-grid">
        <div className="onboarding-card">
          <div className="onboarding-icon">&#127970;</div>
          <h2>Relying Party</h2>
          <p>
            Register your organization as a Wallet-Relying Party to directly
            interact with EUDI Wallets and request user attributes.
          </p>
          <ul className="onboarding-features">
            <li>Register your service and intended use</li>
            <li>Obtain Access Certificates (WRPAC)</li>
            <li>Obtain Registration Certificates (WRPRC)</li>
          </ul>
          <Link to="/dashboard/register" className="btn btn-primary btn-full">
            Register as Relying Party
          </Link>
        </div>

        <div className="onboarding-card">
          <div className="onboarding-icon">&#128279;</div>
          <h2>Intermediary</h2>
          <p>
            Register as an intermediary to act on behalf of other Relying Parties,
            connecting them to EUDI Wallets.
          </p>
          <ul className="onboarding-features">
            <li>Register mediated Relying Parties</li>
            <li>Obtain your own Access Certificate (WRPAC)</li>
            <li>Issue Registration Certificates for mediated RPs</li>
          </ul>
          <Link to="/dashboard/register-intermediary" className="btn btn-primary btn-full">
            Register as Intermediary
          </Link>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-muted)' }}>
        You can always register additional entities later from the dashboard.
      </p>
    </div>
  );
}
