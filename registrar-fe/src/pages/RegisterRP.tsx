import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createWRP, listWRPs } from '../api/client';
import { normalRPPreset, dummyIntermediaries } from '../presets/data';
import type { FormData } from '../utils/rpForm';
import { emptyForm, presetToForm, formToDto } from '../utils/rpForm';

type Step = 'rp-info' | 'advanced';

export default function RegisterRP() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('rp-info');
  const [form, setForm] = useState<FormData>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Intermediary state
  const [intermediaries, setIntermediaries] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIntermediary, setSelectedIntermediary] = useState<any | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [showingIntermediary, setShowingIntermediary] = useState(false);

  const loadIntermediaries = useCallback(async () => {
    try {
      const data = await listWRPs({ isintermediary: 'true' });
      const real = (data.items ?? []).map((item: any) => ({
        id: item.id,
        legalName: item.legalName,
        tradeName: item.tradeName,
        identifier: item.identifier,
        registryURI: item.registryURI,
      }));
      setIntermediaries([...real, ...dummyIntermediaries]);
    } catch {
      setIntermediaries([...dummyIntermediaries]);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/sign-in');
      return;
    }
    loadIntermediaries();
  }, [token, navigate, loadIntermediaries]);

  const updateForm = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const demoFill = () => {
    setForm(presetToForm(normalRPPreset));
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
    setStep('advanced');
  };

  const handleRegister = async (withIntermediary: boolean) => {
    if (!token) return;
    setCreating(true);
    setError('');
    try {
      if (withIntermediary && selectedIntermediary) {
        form.usesIntermediary = JSON.stringify([{
          identifier: selectedIntermediary.identifier,
          tradeName: selectedIntermediary.tradeName,
          registryURI: selectedIntermediary.registryURI,
        }], null, 2);
      }
      const dto = formToDto(form);
      await createWRP(token, dto);
      navigate('/dashboard');
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const filteredIntermediaries = intermediaries.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.tradeName ?? '').toLowerCase().includes(q) ||
      (item.legalName ?? '').toLowerCase().includes(q) ||
      (item.identifier?.[0]?.value ?? '').toLowerCase().includes(q)
    );
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) setUploadedFile(file.name);
  };

  const cancelIntermediary = () => {
    setShowingIntermediary(false);
    setSelectedIntermediary(null);
    setUploadedFile(null);
    setSearch('');
  };

  if (step === 'advanced') {
    const hasIntermediary = selectedIntermediary && uploadedFile;

    return (
      <div className="page register-page">
        <div className="step-indicator">
          <div className="step-dot step-done" />
          <div className="step-line step-line-done" />
          <div className="step-dot step-active" />
        </div>
        <h1>Intermediary Selection</h1>
        <p className="subtitle">
          Select an intermediary or skip to register directly.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        {!showingIntermediary ? (
          <div style={{ textAlign: 'left', padding: '32px 0' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowingIntermediary(true)}
              disabled={creating}
            >
              Select Intermediary
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12, textAlign: 'right' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={cancelIntermediary}
                disabled={creating}
              >
                Cancel Selection
              </button>
            </div>

            <div className="intermediary-selector">
              <input
                type="text"
                placeholder="Search intermediaries by name or identifier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="intermediary-search"
              />
              <div className="intermediary-list">
                {filteredIntermediaries.length === 0 ? (
                  <p className="empty" style={{ padding: 16 }}>No intermediaries found.</p>
                ) : (
                  filteredIntermediaries.map((item) => (
                    <div
                      key={item.id}
                      className={`intermediary-option ${selectedIntermediary?.id === item.id ? 'intermediary-selected' : ''}`}
                      onClick={() => setSelectedIntermediary(
                        selectedIntermediary?.id === item.id ? null : item,
                      )}
                    >
                      <div className="intermediary-option-name">
                        {item.tradeName || item.legalName}
                      </div>
                      <div className="intermediary-option-detail">
                        {item.legalName}
                        {item.identifier?.[0]?.value && (
                          <> &middot; <span className="identifier">{item.identifier[0].value}</span></>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedIntermediary && (
              <div style={{ marginTop: 20 }}>
                <h3>Upload Contract</h3>
                <p className="subtitle">
                  Upload the intermediary contract document to proceed.
                </p>

                {!uploadedFile ? (
                  <div
                    className="file-drop-zone"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('contract-file-input')?.click()}
                  >
                    <div className="file-drop-icon">&#128196;</div>
                    <p className="file-drop-text">
                      Drag & drop your contract here, or click to browse
                    </p>
                    <p className="file-drop-hint">
                      PDF, JPG, or PNG up to 10MB
                    </p>
                    <input
                      id="contract-file-input"
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
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="form-actions" style={{ marginTop: 24 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setStep('rp-info')}
            disabled={creating}
          >
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleRegister(!!hasIntermediary)}
            disabled={creating || (showingIntermediary && !hasIntermediary)}
          >
            {creating ? 'Registering...' : hasIntermediary ? 'Register' : 'Skip'}
          </button>
        </div>
      </div>
    );
  }

  // Step 1: rp-info
  return (
    <div className="page register-page">
      <div className="step-indicator">
        <div className="step-dot step-active" />
        <div className="step-line" />
        <div className="step-dot" />
      </div>
      <h1>Register Relying Party</h1>
      <p className="subtitle">
        Fill in your organization details to register as a Relying Party.
        {' '}<br /><Link to="/dashboard/register-intermediary" className="text-link-sm text-blue-500 hover:text-blue-600">&gt; Registeri as an intermediary</Link>
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
