import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWRP, updateWRP } from '../api/client';

type Step = 'upload' | 'review';

export default function BecomeIntermediary() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('upload');
  const [rp, setRp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/sign-in');
      return;
    }
    if (!id) return;
    (async () => {
      try {
        const data = await getWRP(id);
        setRp(data);
      } catch (err: any) {
        setError(`Error loading RP: ${err.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, id, navigate]);

  useEffect(() => {
    return () => {
      if (uploadTimer.current) clearTimeout(uploadTimer.current);
    };
  }, []);

  const simulateUpload = (fileName: string) => {
    setUploading(true);
    uploadTimer.current = setTimeout(() => {
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

  const handleDemoApprove = async () => {
    if (!token || !id) return;
    setSubmitting(true);
    setError('');
    try {
      await updateWRP(token, id, { isIntermediary: true });
      navigate('/dashboard');
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page"><p className="loading">Loading...</p></div>;
  if (!rp) return <div className="page"><p className="empty">Relying party not found.</p></div>;

  if (step === 'review') {
    return (
      <div className="page register-page">
        <div className="step-indicator">
          <div className="step-dot step-done" />
          <div className="step-line step-line-done" />
          <div className="step-dot step-active" />
        </div>
        <h1>Under Review</h1>
        <div className="contact-box">
          <div className="contact-icon">&#128231;</div>
          <p className="contact-text">
            Your intermediary application for <strong>{rp.tradeName || rp.legalName}</strong> has
            been submitted. We will review your authorization document and notify you once approved.
          </p>
          <p className="contact-sub">
            This process typically completes within 1-2 business days.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="demo-notice">
          <p>This is a demo &mdash; skip the review process.</p>
          <button
            className="btn btn-primary btn-full"
            onClick={handleDemoApprove}
            disabled={submitting}
          >
            {submitting ? 'Approving...' : 'Approve & Continue'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page register-page">
      <div className="step-indicator">
        <div className="step-dot step-active" />
        <div className="step-line" />
        <div className="step-dot" />
      </div>
      <h1>Become Intermediary</h1>
      <p className="subtitle">
        Upload your intermediary authorization document to upgrade
        <strong> {rp.tradeName || rp.legalName}</strong> to an intermediary.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

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
          onClick={() => document.getElementById('intermediary-file-input')?.click()}
        >
          <div className="file-drop-icon">&#128196;</div>
          <p className="file-drop-text">
            Drag & drop your document here, or click to browse
          </p>
          <p className="file-drop-hint">
            PDF up to 10MB
          </p>
          <input
            id="intermediary-file-input"
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="file-uploaded">
          <div className="file-uploaded-icon">&#10003;</div>
          <p className="file-uploaded-name">{uploadedFile}</p>
          <p className="file-uploaded-status">File uploaded successfully</p>
        </div>
      )}

      <div className="form-actions" style={{ marginTop: 24 }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/dashboard/rp/${id}`)}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setStep('review')}
          disabled={!uploadedFile}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
