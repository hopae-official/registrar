import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyWRPs, getMyIntermediaries, listMediatedRPs } from '../api/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Link2, Plus, ArrowRight, FileText } from 'lucide-react';

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [wrps, setWrps] = useState<any[]>([]);
  const [intermediaries, setIntermediaries] = useState<any[]>([]);
  const [mediatedRPsByIntermediary, setMediatedRPsByIntermediary] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [wrpData, intData] = await Promise.all([
        getMyWRPs(token),
        getMyIntermediaries(token),
      ]);
      setWrps(wrpData);
      setIntermediaries(intData);

      // Load mediated RPs for each intermediary
      if (intData.length > 0) {
        const mediatedMap: Record<string, any[]> = {};
        await Promise.all(
          intData.map(async (int: any) => {
            try {
              mediatedMap[int.id] = await listMediatedRPs(token, int.id);
            } catch {
              mediatedMap[int.id] = [];
            }
          }),
        );
        setMediatedRPsByIntermediary(mediatedMap);
      }
    } catch {
      setWrps([]);
      setIntermediaries([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/sign-in');
      return;
    }
    load();
  }, [token, navigate, load]);

  const isEmpty = !loading && wrps.length === 0 && intermediaries.length === 0;
  const hasIntermediaries = intermediaries.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage your Relying Parties and intermediary services.
        </p>
      </div>

      <div className="space-y-8">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state — onboarding */}
        {isEmpty && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader>
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </span>
                <CardTitle className="pt-3">Relying Party</CardTitle>
                <CardDescription>
                  Register your organization as a Wallet-Relying Party to directly interact with EUDI
                  Wallets and request user attributes.
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto">
                <Button asChild className="w-full">
                  <Link to="/dashboard/register">Register as Relying Party</Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className="flex flex-col">
              <CardHeader>
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Link2 className="size-5" />
                </span>
                <CardTitle className="pt-3">Intermediary</CardTitle>
                <CardDescription>
                  Register as an intermediary to act on behalf of other Relying Parties, connecting
                  them to EUDI Wallets.
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto">
                <Button asChild className="w-full">
                  <Link to="/dashboard/register-intermediary">Register as Intermediary</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* My Relying Parties — only shown when NOT an intermediary user */}
        {!loading && !hasIntermediaries && wrps.length > 0 && (
          <section>
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold tracking-tight">My Relying Parties</h2>
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link to="/dashboard/register">
                  <Plus className="size-4" />
                  Register RP
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wrps.map((rp: any) => (
                <Link to={`/dashboard/rp/${rp.id}`} key={rp.id} className="group block">
                  <Card className="h-full gap-4 transition-colors hover:border-primary/50">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2">
                        <span className="truncate">{rp.tradeName || rp.legalName || 'Unnamed'}</span>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </CardTitle>
                      {rp.legalName && rp.tradeName && (
                        <CardDescription className="truncate">{rp.legalName}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {rp.isPSB && <Badge variant="secondary">PSB</Badge>}
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {rp.srvDescription?.[0]?.content?.slice(0, 100)}...
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Access Certs: {rp.accessCertificates?.length ?? 0}</span>
                        <span>Reg Certs: {rp.registrationCertificates?.length ?? 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Intermediary view */}
        {!loading &&
          intermediaries.map((int: any) => {
            const mediated = mediatedRPsByIntermediary[int.id] ?? [];
            return (
              <div key={int.id} className="space-y-6">
                {/* Intermediary info + Manage */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-xl">{int.tradeName || int.legalName}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>Intermediary</Badge>
                          <span className="text-sm text-muted-foreground break-all">
                            {int.identifier?.[0]?.identifier}
                          </span>
                        </div>
                      </div>
                      <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                        <Link to={`/dashboard/intermediary/${int.id}`}>Manage</Link>
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Mediated RP list */}
                <section>
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold tracking-tight">Mediated Relying Parties</h2>
                    <Button asChild size="sm" className="w-full sm:w-auto">
                      <Link to={`/dashboard/intermediary/${int.id}/register-rp`}>
                        <Plus className="size-4" />
                        Register Mediated RP
                      </Link>
                    </Button>
                  </div>

                  {mediated.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <FileText className="size-6" />
                        </span>
                        <div className="space-y-1">
                          <p className="font-medium">No Mediated RPs Yet</p>
                          <p className="text-sm text-muted-foreground">
                            Register Relying Parties that will use your intermediary services.
                          </p>
                        </div>
                        <Button asChild className="mt-2">
                          <Link to={`/dashboard/intermediary/${int.id}/register-rp`}>
                            Register Mediated RP
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {mediated.map((rp: any) => (
                        <Link
                          to={`/dashboard/intermediary/${int.id}/rp/${rp.id}`}
                          key={rp.id}
                          className="group block"
                        >
                          <Card className="h-full gap-4 transition-colors hover:border-primary/50">
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                  {rp.tradeName || rp.legalName || 'Unnamed'}
                                </span>
                                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                              </CardTitle>
                              {rp.legalName && rp.tradeName && (
                                <CardDescription className="truncate">{rp.legalName}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <Badge variant="outline">Mediated RP</Badge>
                              <p className="line-clamp-2 text-sm text-muted-foreground">
                                {rp.srvDescription?.[0]?.content?.slice(0, 100)}...
                              </p>
                              <div className="text-xs text-muted-foreground">
                                Reg Certs: {rp.registrationCertificates?.length ?? 0}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            );
          })}
      </div>
    </div>
  );
}
