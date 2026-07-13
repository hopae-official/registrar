import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, CheckCircle2, Loader2, Mail, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signUp } from '../api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Step = 'signup' | 'id-validation' | 'file-upload' | 'contact';

const STEPS = ['Account', 'ID Validation', 'Documents', 'Review'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-6 flex items-center justify-center">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div
            className={cn(
              'flex size-8 items-center justify-center rounded-full border text-xs font-medium transition-colors',
              i < current && 'border-primary bg-primary text-primary-foreground',
              i === current && 'border-primary text-primary',
              i > current && 'border-border text-muted-foreground',
            )}
          >
            {i < current ? <Check className="size-4" /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('h-px w-6 sm:w-10', i < current ? 'bg-primary' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  );
}

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
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-4 py-10">
        <StepIndicator current={1} />
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">ID Validation</CardTitle>
            <CardDescription>
              Verify your identity to proceed with business registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!validating && !validated && (
              <Button className="w-full" onClick={startValidation}>
                Validate ID
              </Button>
            )}

            {validating && (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/30 px-6 py-8 text-center">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Validating your identity...</p>
                <div className="w-full space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                      style={{ width: `${(countdown / 60) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expires in{' '}
                    <span className="font-medium tabular-nums text-foreground">
                      {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {validated && (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-success/40 bg-success/5 px-6 py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="size-6" />
                </span>
                <p className="text-sm font-medium">Identity Verified</p>
                <p className="text-xs text-muted-foreground">
                  Your ID has been successfully validated.
                </p>
                <Button className="mt-2 w-full" onClick={() => setStep('file-upload')}>
                  Continue
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'file-upload') {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-4 py-10">
        <StepIndicator current={2} />
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Business Registration</CardTitle>
            <CardDescription>
              Upload your business registration document for verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploading ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 px-6 py-8 text-center">
                <p className="text-sm font-medium">Uploading...</p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Please wait</p>
              </div>
            ) : !uploadedFile ? (
              <div
                className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Upload className="size-6" />
                </span>
                <p className="text-sm font-medium">
                  Drag &amp; drop your file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">PDF, JPG, or PNG up to 10MB</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-success/40 bg-success/5 px-6 py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="size-6" />
                </span>
                <p className="text-sm font-medium">{uploadedFile}</p>
                <p className="text-xs text-muted-foreground">File uploaded successfully</p>
                <Button className="mt-2 w-full" onClick={() => setStep('contact')}>
                  Submit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'contact') {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-4 py-10">
        <StepIndicator current={3} />
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Under Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 px-6 py-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="size-6" />
              </span>
              <p className="text-sm text-muted-foreground">
                Your business registration has been submitted. We will contact you after the
                validation is complete.
              </p>
              <p className="text-sm text-muted-foreground">
                You will receive a confirmation email at{' '}
                <strong className="font-medium text-foreground">{email}</strong> once your
                registration has been reviewed.
              </p>
            </div>
            <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                This is a demo &mdash; skip the review process.
              </p>
              <Button className="w-full" onClick={() => navigate('/onboarding')}>
                Proceed to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-4 py-10">
      <StepIndicator current={0} />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create an operator account to register Wallet-Relying Parties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min 6 characters"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/sign-in" className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
