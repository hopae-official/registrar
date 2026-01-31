import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signIn, signUp } from '../api/client';
import { demoUsers } from '../presets/data';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await signIn(email, password);
      setToken(data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user: (typeof demoUsers)[number]) => {
    setError('');
    setLoading(true);
    try {
      // Try sign in first, fall back to sign up
      let data: { access_token: string };
      try {
        data = await signIn(user.email, user.password);
      } catch {
        data = await signUp(user.email, user.password, user.name, user.company);
      }
      setToken(data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <h1>Sign In</h1>

        <div className="quick-login">
          <p>Quick demo login</p>
          <div className="quick-login-grid">
            {demoUsers.map((user) => (
              <button
                key={user.email}
                className="quick-login-btn"
                onClick={() => handleQuickLogin(user)}
                disabled={loading}
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

        <div className="divider">or</div>

        <form onSubmit={handleSubmit}>
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
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/sign-up">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
