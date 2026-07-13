import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { listWRPs } from '../api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async (legalname?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (legalname) params.legalname = legalname;
      const data = await listWRPs(params);
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search || undefined);
  };

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Badge variant="secondary">EU Digital Identity Wallet</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Wallet Relying Party Registry
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Official registry of Wallet-Relying Parties authorized under the
              EUDI framework.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {total} registered {total === 1 ? 'party' : 'parties'}
          </p>

          <form
            onSubmit={handleSearch}
            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
          >
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by legal or trade name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              Search
            </Button>
          </form>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="mt-2 h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <Search className="size-8 text-muted-foreground" />
              <p className="mt-4 font-medium">No relying parties found.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search terms.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((rp: any) => (
                <Link
                  to={`/rp/${rp.id}`}
                  key={rp.id}
                  className="group block h-full focus-visible:outline-none"
                >
                  <Card className="h-full gap-4 transition-colors group-hover:border-primary group-hover:shadow-md group-focus-visible:border-primary">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {rp.tradeName || rp.legalName || 'Unnamed'}
                      </CardTitle>
                      {rp.legalName && rp.tradeName && (
                        <CardDescription className="break-words">
                          {rp.legalName}
                        </CardDescription>
                      )}
                      {(rp.isIntermediary ||
                        rp.isPSB ||
                        rp.usesIntermediary?.length > 0) && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {rp.isIntermediary && <Badge>Intermediary</Badge>}
                          {rp.isPSB && <Badge variant="success">PSB</Badge>}
                          {rp.usesIntermediary?.length > 0 && (
                            <Badge variant="secondary">Uses Intermediary</Badge>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <p className="text-sm text-muted-foreground">
                        {rp.srvDescription?.[0]?.content?.slice(0, 120)}
                        {rp.srvDescription?.[0]?.content?.length > 120 ? '...' : ''}
                      </p>
                      {rp.identifier?.length > 0 && (
                        <div className="flex flex-col gap-1 border-t border-border pt-3">
                          {rp.identifier?.map((id: any, i: number) => (
                            <span
                              key={i}
                              className="break-all text-xs text-muted-foreground"
                            >
                              <span className="font-medium text-foreground">
                                {id.type}:
                              </span>{' '}
                              {id.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
