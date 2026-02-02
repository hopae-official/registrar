import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signUp } from '../api/client';

type Step = 'signup' | 'id-validation' | 'file-upload' | 'contact';

export default function SignUp() {
  const [step, setStep] = useState<Step>('signup');

  // Sign-up form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  // ID validation state
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const approveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await signUp(email, password, name, company);
      setToken(data.access_token);
      setStep('id-validation');
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const startValidation = () => {
    setValidating(true);
    setCountdown(60);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    approveRef.current = setTimeout(() => {
      setValidating(false);
      setValidated(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }, 7000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (approveRef.current) clearTimeout(approveRef.current);
      if (uploadTimerRef.current) clearTimeout(uploadTimerRef.current);
    };
  }, []);

  const simulateUpload = (fileName: string) => {
    setUploading(true);
    uploadTimerRef.current = setTimeout(() => {
      setUploading(false);
      setUploadedFile(fileName);
    }, 1000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateUpload(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) simulateUpload(file.name);
  };

  if (step === 'id-validation') {
    return (
      <div className="page auth-page">
        <div className="auth-card">
          <div className="step-indicator">
            <div className="step-dot step-done" />
            <div className="step-line step-line-done" />
            <div className="step-dot step-active" />
            <div className="step-line" />
            <div className="step-dot" />
            <div className="step-line" />
            <div className="step-dot" />
          </div>
          <h1>ID Validation</h1>
          <p className="step-desc">
            Verify your identity to proceed with business registration.
          </p>

          {!validating && !validated && (
            <button
              className="btn btn-primary btn-full"
              onClick={startValidation}
            >
              Validate ID
            </button>
          )}

          {validating && (
            <div className="validation-box">
              <div className="spinner" />
              <p className="validation-status">Validating your identity...</p>
              <div className="countdown-bar">
                <div
                  className="countdown-fill"
                  style={{ width: `${(countdown / 60) * 100}%` }}
                />
              </div>
              <p className="countdown-text">
                Expires in{' '}
                <span className="countdown-num">
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </span>
              </p>
            </div>
          )}

          {validated && (
            <div className="validation-box validation-approved">
              <div className="approved-icon">&#10003;</div>
              <p className="validation-status">Identity Verified</p>
              <p className="validation-sub">
                Your ID has been successfully validated.
              </p>
              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 16 }}
                onClick={() => setStep('file-upload')}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'file-upload') {
    return (
      <div className="page auth-page">
        <div className="auth-card">
          <div className="step-indicator">
            <div className="step-dot step-done" />
            <div className="step-line step-line-done" />
            <div className="step-dot step-done" />
            <div className="step-line step-line-done" />
            <div className="step-dot step-active" />
            <div className="step-line" />
            <div className="step-dot" />
          </div>
          <h1>Business Registration</h1>
          <p className="step-desc">
            Upload your business registration document for verification.
          </p>

          {uploading ? (
            <div className="file-uploading">
              <p className="file-uploading-name">Uploading...</p>
              <div className="file-progress-bar">
                <div className="file-progress-fill" />
              </div>
              <p className="file-uploading-text">Please wait</p>
            </div>
          ) : !uploadedFile ? (
            <div
              className="file-drop-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="file-drop-icon">&#128196;</div>
              <p className="file-drop-text">
                Drag & drop your file here, or click to browse
              </p>
              <p className="file-drop-hint">
                PDF, JPG, or PNG up to 10MB
              </p>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="file-uploaded">
              <div className="file-uploaded-icon">&#10003;</div>
              <p className="file-uploaded-name">{uploadedFile}</p>
              <p className="file-uploaded-status">File uploaded successfully</p>
              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 16 }}
                onClick={() => setStep('contact')}
              >
                Submit
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'contact') {
    return (
      <div className="page auth-page">
        <div className="auth-card">
          <div className="step-indicator">
            <div className="step-dot step-done" />
            <div className="step-line step-line-done" />
            <div className="step-dot step-done" />
            <div className="step-line step-line-done" />
            <div className="step-dot step-done" />
            <div className="step-line step-line-done" />
            <div className="step-dot step-active" />
          </div>
          <h1>Under Review</h1>
          <div className="contact-box">
            <div className="contact-icon">&#128231;</div>
            <p className="contact-text">
              Your business registration has been submitted. We will contact you
              after the validation is complete.
            </p>
            <p className="contact-sub">
              You will receive a confirmation email at <strong>{email}</strong> once
              your registration has been reviewed.
            </p>
          </div>
          <div className="demo-notice">
            <p>This is a demo &mdash; skip the review process.</p>
            <button
              className="btn btn-primary btn-full"
              onClick={() => navigate('/dashboard')}
            >
              Proceed to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <div className="step-indicator">
          <div className="step-dot step-active" />
          <div className="step-line" />
          <div className="step-dot" />
          <div className="step-line" />
          <div className="step-dot" />
          <div className="step-line" />
          <div className="step-dot" />
        </div>
        <h1>Sign Up</h1>

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
