import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signUp } from '../api/client';
import { demoUsers } from '../presets/data';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await signUp(email, password, name, company);
      setToken(data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const fillPreset = (user: (typeof demoUsers)[number]) => {
    setEmail(user.email);
    setPassword(user.password);
    setName(user.name);
    setCompany(user.company);
  };

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <h1>Sign Up</h1>

        <div className="quick-login">
          <p>Fill with demo user</p>
          <div className="quick-login-grid">
            {demoUsers.map((user) => (
              <button
                key={user.email}
                className="quick-login-btn"
                onClick={() => fillPreset(user)}
                type="button"
              >
                <div>
                  <span className="ql-name">{user.label}</span>
                  <br />
                  <span className="ql-desc">{user.description}</span>
                </div>
                <span className="ql-email">{user.email}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="divider">or enter manually</div>

        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </label>
          <label>
            Company
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Min 6 characters"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/sign-in">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
