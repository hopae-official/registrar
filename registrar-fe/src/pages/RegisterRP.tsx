import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createWRP } from '../api/client';
import { normalRPPreset } from '../presets/data';
import type { FormData } from '../utils/rpForm';
import { emptyForm, presetToForm, formToDto } from '../utils/rpForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ChevronDown, Sparkles } from 'lucide-react';

export default function RegisterRP() {
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
    setForm(presetToForm(normalRPPreset));
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
      dto.isIntermediary = false;
      await createWRP(token, dto);
      navigate('/dashboard');
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Register Relying Party</h1>
          <p className="text-sm text-muted-foreground">
            Fill in your organization details to register as a Relying Party.
          </p>
        </div>
        <Button variant="outline" onClick={demoFill} className="w-full sm:w-auto">
          <Sparkles className="size-4" />
          Demo Fill
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="legalName">
                  Legal Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="legalName"
                  value={form.legalName}
                  onChange={(e) => updateForm('legalName', e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tradeName">Trade Name</Label>
                <Input
                  id="tradeName"
                  value={form.tradeName}
                  onChange={(e) => updateForm('tradeName', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="identifierType">Identifier Type</Label>
                <Input
                  id="identifierType"
                  value={form.identifierType}
                  onChange={(e) => updateForm('identifierType', e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="identifierValue">
                  Identifier Value <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="identifierValue"
                  value={form.identifierValue}
                  onChange={(e) => updateForm('identifierValue', e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="infoURI">Info URIs (comma-separated)</Label>
                <Input
                  id="infoURI"
                  value={form.infoURI}
                  onChange={(e) => updateForm('infoURI', e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="supportURI">
                  Support URIs (comma-separated) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="supportURI"
                  value={form.supportURI}
                  onChange={(e) => updateForm('supportURI', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="srvDescriptionLang">Language</Label>
                <Input
                  id="srvDescriptionLang"
                  value={form.srvDescriptionLang}
                  onChange={(e) => updateForm('srvDescriptionLang', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="srvDescriptionContent">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="srvDescriptionContent"
                  value={form.srvDescriptionContent}
                  onChange={(e) => updateForm('srvDescriptionContent', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <CardTitle>Advanced Options</CardTitle>
              <ChevronDown
                className={`size-5 text-muted-foreground transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </CardHeader>
          {advancedOpen && (
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="isPSB"
                    checked={form.isPSB}
                    onChange={(e) => updateForm('isPSB', e.target.checked)}
                    className="size-4 rounded border-border accent-primary"
                  />
                  <Label htmlFor="isPSB">Is PSB (Public Sector Body)</Label>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="entitlement">Entitlements (one per line)</Label>
                  <Textarea
                    id="entitlement"
                    value={form.entitlement}
                    onChange={(e) => updateForm('entitlement', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="sm:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Supervisory Authority</h3>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supervisoryAuthorityName">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="supervisoryAuthorityName"
                    value={form.supervisoryAuthorityName}
                    onChange={(e) => updateForm('supervisoryAuthorityName', e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supervisoryAuthorityEmail">Email</Label>
                  <Input
                    id="supervisoryAuthorityEmail"
                    value={form.supervisoryAuthorityEmail}
                    onChange={(e) => updateForm('supervisoryAuthorityEmail', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supervisoryAuthorityPhone">Phone</Label>
                  <Input
                    id="supervisoryAuthorityPhone"
                    value={form.supervisoryAuthorityPhone}
                    onChange={(e) => updateForm('supervisoryAuthorityPhone', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supervisoryAuthorityURI">Info URIs (comma-separated)</Label>
                  <Input
                    id="supervisoryAuthorityURI"
                    value={form.supervisoryAuthorityURI}
                    onChange={(e) => updateForm('supervisoryAuthorityURI', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            disabled={creating}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button onClick={handleRegister} disabled={creating} className="w-full sm:w-auto">
            {creating ? 'Registering...' : 'Register Relying Party'}
          </Button>
        </div>
      </div>
    </div>
  );
}
