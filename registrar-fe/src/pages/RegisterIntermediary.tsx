import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createWRP } from '../api/client';
import { intermediaryPreset } from '../presets/data';
import type { FormData } from '../utils/rpForm';
import { emptyForm, presetToForm, formToDto } from '../utils/rpForm';

type Step = 'form' | 'file-upload';

export default function RegisterIntermediary() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>(() => {
    const f = emptyForm();
    f.isIntermediary = true;
    return f;
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/sign-in');
    }
  }, [token, navigate]);

  const updateForm = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const demoFill = () => {
    const f = presetToForm(intermediaryPreset);
    f.isIntermediary = true;
    setForm(f);
  };

  const validateStep1 = (): boolean => {
    if (!form.legalName.trim()) return false;
    if (!form.identifierValue.trim()) return false;
    if (!form.supportURI.trim()) return false;
    if (!form.srvDescriptionContent.trim()) return false;
    if (!form.supervisoryAuthorityName.trim()) return false;
    return true;
  };

  const handleNext = () => {
    if (!validateStep1()) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setStep('file-upload');
  };

  const handleRegister = async () => {
    if (!token) return;
    setCreating(true);
    setError('');
    try {
      const dto = formToDto(form);
      await createWRP(token, dto);
      navigate('/dashboard');
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const simulateUpload = (fileName: string) => {
    setUploading(true);
    uploadTimerRef.current = setTimeout(() => {
      setUploading(false);
      setUploadedFile(fileName);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (uploadTimerRef.current) clearTimeout(uploadTimerRef.current);
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateUpload(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) simulateUpload(file.name);
  };

  if (step === 'file-upload') {
    return (
      <div className="page register-page">
        <div className="step-indicator">
          <div className="step-dot step-done" />
          <div className="step-line step-line-done" />
          <div className="step-dot step-active" />
        </div>
        <h1>Upload Documents</h1>
        <p className="subtitle">
          Upload your intermediary authorization document to complete registration.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-actions" style={{ marginBottom: 20 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setStep('form')}
            disabled={creating}
          >
            Back
          </button>
        </div>

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
              PDF, JPG, or PNG up to 10MB
            </p>
            <input
              id="intermediary-file-input"
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
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={handleRegister}
              disabled={creating}
            >
              {creating ? 'Registering...' : 'Register Intermediary'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Step 1: form
  return (
    <div className="page register-page">
      <div className="step-indicator">
        <div className="step-dot step-active" />
        <div className="step-line" />
        <div className="step-dot" />
      </div>
      <h1>Become an Intermediary</h1>
      <p className="subtitle">
        Register your organization as a technology intermediary.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-actions" style={{ marginBottom: 16 }}>
        <button className="btn demo-fill-btn" onClick={demoFill}>
          Demo Fill
        </button>
      </div>

      <div className="form-panel">
        <div className="form-grid">
          <div className="form-group">
            <label>Legal Name *</label>
            <input
              value={form.legalName}
              onChange={(e) => updateForm('legalName', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Trade Name</label>
            <input
              value={form.tradeName}
              onChange={(e) => updateForm('tradeName', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Identifier Type</label>
            <input
              value={form.identifierType}
              onChange={(e) => updateForm('identifierType', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Identifier Value *</label>
            <input
              value={form.identifierValue}
              onChange={(e) => updateForm('identifierValue', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateForm('email', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              value={form.phone}
              onChange={(e) => updateForm('phone', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Info URIs (comma-separated)</label>
            <input
              value={form.infoURI}
              onChange={(e) => updateForm('infoURI', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Support URIs (comma-separated) *</label>
            <input
              value={form.supportURI}
              onChange={(e) => updateForm('supportURI', e.target.value)}
              required
            />
          </div>

          <div className="form-section-title">Service Description</div>
          <div className="form-group">
            <label>Language</label>
            <input
              value={form.srvDescriptionLang}
              onChange={(e) => updateForm('srvDescriptionLang', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Description *</label>
            <input
              value={form.srvDescriptionContent}
              onChange={(e) => updateForm('srvDescriptionContent', e.target.value)}
              required
            />
          </div>

          <div className="form-accordion">
            <button
              type="button"
              className="form-accordion-toggle"
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <span className={`form-accordion-arrow ${advancedOpen ? 'open' : ''}`}>&#9654;</span>
              Advanced Options
            </button>
            {advancedOpen && (
              <div className="form-accordion-body">
                <div className="form-group">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      id="isPSB"
                      checked={form.isPSB}
                      onChange={(e) => updateForm('isPSB', e.target.checked)}
                    />
                    <label htmlFor="isPSB">Is PSB (Public Sector Body)</label>
                  </div>
                </div>
                <div className="form-group" />

                <div className="form-group form-full">
                  <label>Entitlements (one per line)</label>
                  <textarea
                    value={form.entitlement}
                    onChange={(e) => updateForm('entitlement', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="form-section-title">Supervisory Authority</div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    value={form.supervisoryAuthorityName}
                    onChange={(e) => updateForm('supervisoryAuthorityName', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    value={form.supervisoryAuthorityEmail}
                    onChange={(e) => updateForm('supervisoryAuthorityEmail', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    value={form.supervisoryAuthorityPhone}
                    onChange={(e) => updateForm('supervisoryAuthorityPhone', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Info URIs (comma-separated)</label>
                  <input
                    value={form.supervisoryAuthorityURI}
                    onChange={(e) => updateForm('supervisoryAuthorityURI', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleNext}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
