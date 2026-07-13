import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWRP } from '../api/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border py-2 last:border-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-all">{children}</dd>
    </div>
  );
}

export default function RPPublicDetail() {
  const { id } = useParams<{ id: string }>();
  const [rp, setRp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getWRP(id)
      .then(setRp)
      .catch(() => setRp(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-5 w-32" />
        <Skeleton className="mb-2 h-8 w-1/2" />
        <Skeleton className="mb-8 h-4 w-1/3" />
        <Card>
          <CardContent className="space-y-3 py-6">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );

  if (!rp)
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Relying party not found.
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground">
        <Link to="/">
          <ArrowLeft className="size-4" />
          Back to Registry
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{rp.tradeName || rp.legalName}</h1>
        {rp.legalName && rp.tradeName && (
          <p className="text-sm text-muted-foreground">{rp.legalName}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {rp.isIntermediary && <Badge>Intermediary</Badge>}
          {rp.isPSB && <Badge variant="secondary">PSB</Badge>}
          {rp.usesIntermediary?.length > 0 && <Badge variant="outline">Uses Intermediary</Badge>}
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <InfoRow label="Registry URI">{rp.registryURI}</InfoRow>
              <InfoRow label="Identifiers">
                <div className="flex flex-col gap-0.5">
                  {rp.identifier?.map((id: any, i: number) => (
                    <span key={i}>
                      {id.type}: {id.value}
                    </span>
                  ))}
                </div>
              </InfoRow>
              <InfoRow label="Email">{rp.email || '-'}</InfoRow>
              <InfoRow label="Phone">{rp.phone || '-'}</InfoRow>
              <InfoRow label="Support">{rp.supportURI?.join(', ') || '-'}</InfoRow>
              <InfoRow label="Description">{rp.srvDescription?.[0]?.content || '-'}</InfoRow>
              <InfoRow label="Entitlements">
                {rp.entitlement?.map((e: string) => e.split('/').pop()).join(', ') || '-'}
              </InfoRow>
              <InfoRow label="Supervisory Authority">
                {rp.supervisoryAuthority?.legalName || '-'}
              </InfoRow>
              {rp.usesIntermediary?.length > 0 && (
                <InfoRow label="Intermediary">
                  <div className="flex flex-col gap-0.5">
                    {rp.usesIntermediary.map((inter: any, i: number) => (
                      <span key={i}>
                        {inter.tradeName} ({inter.identifier?.[0]?.value})
                      </span>
                    ))}
                  </div>
                </InfoRow>
              )}
            </dl>
          </CardContent>
        </Card>

        {rp.intendedUse?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Intended Uses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rp.intendedUse.map((iu: any, i: number) => (
                <div
                  key={i}
                  className="space-y-1 rounded-md border border-border bg-muted/30 p-4 text-sm"
                >
                  <p>
                    <span className="font-medium">Purpose:</span> {iu.purpose?.[0]?.content}
                  </p>
                  <p className="break-all">
                    <span className="font-medium">Privacy Policy:</span> {iu.privacyPolicy?.[0]?.uri}
                  </p>
                  <p>
                    <span className="font-medium">Credentials:</span>{' '}
                    {iu.credential?.map((c: any) => c.format).join(', ')}
                  </p>
                  {iu.intendedUseIdentifier && (
                    <p className="break-all text-xs text-muted-foreground">
                      ID: {iu.intendedUseIdentifier}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
