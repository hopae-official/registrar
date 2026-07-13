import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Link2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Onboarding() {
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) navigate('/sign-in');
  }, [token, navigate]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Get Started</h1>
      <p className="mt-1 text-muted-foreground">
        Choose how you want to participate in the EU Digital Identity Wallet
        ecosystem.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Card className="flex flex-col gap-4 p-6">
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-6" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Relying Party
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Register your organization as a Wallet-Relying Party to directly
              interact with EUDI Wallets and request user attributes.
            </p>
          </div>
          <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Register your service and intended use</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Obtain Access Certificates (WRPAC)</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Obtain Registration Certificates (WRPRC)</span>
            </li>
          </ul>
          <Button asChild className="w-full">
            <Link to="/dashboard/register">Register as Relying Party</Link>
          </Button>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Link2 className="size-6" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Intermediary
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Register as an intermediary to act on behalf of other Relying
              Parties, connecting them to EUDI Wallets.
            </p>
          </div>
          <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Register mediated Relying Parties</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Obtain your own Access Certificate (WRPAC)</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Issue Registration Certificates for mediated RPs</span>
            </li>
          </ul>
          <Button asChild className="w-full">
            <Link to="/dashboard/register-intermediary">
              Register as Intermediary
            </Link>
          </Button>
        </Card>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        You can always register additional entities later from the dashboard.
      </p>
    </div>
  );
}
