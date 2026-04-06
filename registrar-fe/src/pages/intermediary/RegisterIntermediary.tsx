import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registerIntermediary } from '../../api/client';
import { intermediaryPreset } from '../../presets/data';
import type { FormData } from '../../utils/rpForm';
import { emptyForm, presetToForm, formToDto } from '../../utils/rpForm';

export default function RegisterIntermediary() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!token) navigate('/sign-in');
  }, [token, navigate]);

  const updateForm = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const demoFill = () => {
    setForm(presetToForm(intermediaryPreset));
  };

  const validate = (): boolean => {
    if (!form.legalName.trim()) return false;
    if (!form.identifierValue.trim()) return false;
    if (!form.supportURI.trim()) return false;
    if (!form.srvDescriptionContent.trim()) return false;
    if (!form.supervisoryAuthorityName.trim()) return false;
    return true;
  };

  const handleRegister = async () => {
    if (!token) return;
    if (!validate()) {
      setError('Please fill in all required fields.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const dto = formToDto(form);
      dto.isIntermediary = true;
      await registerIntermediary(token, dto);
      navigate('/dashboard');
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page register-page">
      <h1>Register as Intermediary</h1>
      <p className="subtitle">
        Register your organization as an intermediary to act on behalf of other Relying Parties.
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
            <input value={form.legalName} onChange={(e) => updateForm('legalName', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Trade Name</label>
            <input value={form.tradeName} onChange={(e) => updateForm('tradeName', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Identifier Type</label>
            <input value={form.identifierType} onChange={(e) => updateForm('identifierType', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Identifier Value *</label>
            <input value={form.identifierValue} onChange={(e) => updateForm('identifierValue', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Info URIs (comma-separated)</label>
            <input value={form.infoURI} onChange={(e) => updateForm('infoURI', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Support URIs (comma-separated) *</label>
            <input value={form.supportURI} onChange={(e) => updateForm('supportURI', e.target.value)} required />
          </div>
          <div className="form-section-title">Service Description</div>
          <div className="form-group">
            <label>Language</label>
            <input value={form.srvDescriptionLang} onChange={(e) => updateForm('srvDescriptionLang', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Description *</label>
            <input value={form.srvDescriptionContent} onChange={(e) => updateForm('srvDescriptionContent', e.target.value)} required />
          </div>

          <div className="form-accordion">
            <button type="button" className="form-accordion-toggle" onClick={() => setAdvancedOpen(!advancedOpen)}>
              <span className={`form-accordion-arrow ${advancedOpen ? 'open' : ''}`}>&#9654;</span>
              Advanced Options
            </button>
            {advancedOpen && (
              <div className="form-accordion-body">
                <div className="form-group form-full">
                  <label>Entitlements (one per line)</label>
                  <textarea value={form.entitlement} onChange={(e) => updateForm('entitlement', e.target.value)} rows={2} />
                </div>
                <div className="form-section-title">Supervisory Authority</div>
                <div className="form-group">
                  <label>Name *</label>
                  <input value={form.supervisoryAuthorityName} onChange={(e) => updateForm('supervisoryAuthorityName', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input value={form.supervisoryAuthorityEmail} onChange={(e) => updateForm('supervisoryAuthorityEmail', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.supervisoryAuthorityPhone} onChange={(e) => updateForm('supervisoryAuthorityPhone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Info URIs (comma-separated)</label>
                  <input value={form.supervisoryAuthorityURI} onChange={(e) => updateForm('supervisoryAuthorityURI', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} disabled={creating}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleRegister} disabled={creating}>
            {creating ? 'Registering...' : 'Register Intermediary'}
          </button>
        </div>
      </div>
    </div>
  );
}
