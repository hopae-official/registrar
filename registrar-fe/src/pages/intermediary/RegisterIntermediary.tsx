import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { registerIntermediary } from '../../api/client';
import { intermediaryPreset } from '../../presets/data';
import type { FormData } from '../../utils/rpForm';
import { emptyForm, presetToForm, formToDto } from '../../utils/rpForm';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </button>

      <div className="mb-6 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="size-5" />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Register as Intermediary</h1>
          <p className="text-muted-foreground">
            Register your organization as an intermediary to act on behalf of other Relying Parties.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization details</CardTitle>
          <CardDescription>
            Provide the legal identity and contact information for the intermediary.
          </CardDescription>
          <CardAction>
            <Button type="button" variant="outline" size="sm" onClick={demoFill}>
              Demo Fill
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Name *</Label>
              <Input
                id="legalName"
                value={form.legalName}
                onChange={(e) => updateForm('legalName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradeName">Trade Name</Label>
              <Input
                id="tradeName"
                value={form.tradeName}
                onChange={(e) => updateForm('tradeName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identifierType">Identifier Type</Label>
              <Input
                id="identifierType"
                value={form.identifierType}
                onChange={(e) => updateForm('identifierType', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identifierValue">Identifier Value *</Label>
              <Input
                id="identifierValue"
                value={form.identifierValue}
                onChange={(e) => updateForm('identifierValue', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="infoURI">Info URIs (comma-separated)</Label>
              <Input
                id="infoURI"
                value={form.infoURI}
                onChange={(e) => updateForm('infoURI', e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="supportURI">Support URIs (comma-separated) *</Label>
              <Input
                id="supportURI"
                value={form.supportURI}
                onChange={(e) => updateForm('supportURI', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b border-border pb-2">
              <h3 className="text-sm font-semibold">Service Description</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="srvDescriptionLang">Language</Label>
                <Input
                  id="srvDescriptionLang"
                  value={form.srvDescriptionLang}
                  onChange={(e) => updateForm('srvDescriptionLang', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="srvDescriptionContent">Description *</Label>
                <Input
                  id="srvDescriptionContent"
                  value={form.srvDescriptionContent}
                  onChange={(e) => updateForm('srvDescriptionContent', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex w-full items-center justify-between rounded-md border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <span>Advanced Options</span>
              <ChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform',
                  advancedOpen && 'rotate-180',
                )}
              />
            </button>
            {advancedOpen && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="entitlement">Entitlements (one per line)</Label>
                  <Textarea
                    id="entitlement"
                    value={form.entitlement}
                    onChange={(e) => updateForm('entitlement', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="border-b border-border pb-2">
                  <h3 className="text-sm font-semibold">Supervisory Authority</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="supervisoryAuthorityName">Name *</Label>
                    <Input
                      id="supervisoryAuthorityName"
                      value={form.supervisoryAuthorityName}
                      onChange={(e) => updateForm('supervisoryAuthorityName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisoryAuthorityEmail">Email</Label>
                    <Input
                      id="supervisoryAuthorityEmail"
                      value={form.supervisoryAuthorityEmail}
                      onChange={(e) => updateForm('supervisoryAuthorityEmail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisoryAuthorityPhone">Phone</Label>
                    <Input
                      id="supervisoryAuthorityPhone"
                      value={form.supervisoryAuthorityPhone}
                      onChange={(e) => updateForm('supervisoryAuthorityPhone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisoryAuthorityURI">Info URIs (comma-separated)</Label>
                    <Input
                      id="supervisoryAuthorityURI"
                      value={form.supervisoryAuthorityURI}
                      onChange={(e) => updateForm('supervisoryAuthorityURI', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col-reverse gap-3 border-t sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate('/dashboard')}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleRegister} disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Registering...
              </>
            ) : (
              'Register Intermediary'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
