'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getTrees, getLogs, getSession, signIn } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  QrCode, 
  Droplet, 
  Camera, 
  Trees, 
  ArrowUpDown, 
  ExternalLink,
  Loader2, 
  LogIn, 
  ShieldAlert,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const DEMO_EMAIL = "demo@ptr.org";
const DEMO_PASSWORD = "demo1234";

interface Tree {
  id: number;
  planter_name: string;
  species: string;
  planted_date: string;
  main_photo_url: string;
  latitude: number;
  longitude: number;
}

interface TreeLog {
  id: string;
  tree_id: number;
  type: 'photo' | 'visit';
  photo_url?: string;
  note?: string;
  staff_name: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [logs, setLogs] = useState<TreeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login form pre-filled
  const [loginEmail, setLoginEmail] = useState(DEMO_EMAIL);
  const [loginPassword, setLoginPassword] = useState(DEMO_PASSWORD);

  // Table filtering and sorting states
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'id' | 'species' | 'planter_name' | 'planted_date' | 'total_visits' | 'last_activity'>('id');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    // Read session and load mock database
    setUser(getSession());
    setTrees(getTrees());
    setLogs(getLogs());
    setLoading(false);

    // Listen to simulated auth state changes
    const handleAuthChange = () => {
      setUser(getSession());
      setTrees(getTrees());
      setLogs(getLogs());
    };
    window.addEventListener('ptr_auth_change', handleAuthChange);
    return () => window.removeEventListener('ptr_auth_change', handleAuthChange);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('login');
    setError(null);

    setTimeout(() => {
      signIn();
      setUser({ email: DEMO_EMAIL, name: 'Demo Staff' });
      setTrees(getTrees());
      setLogs(getLogs());
      setSuccessMessage('Logged in successfully!');
      window.dispatchEvent(new Event('ptr_auth_change'));
      setActionLoading(null);
      setTimeout(() => setSuccessMessage(null), 1200);
    }, 500);
  };

  // Aggregate stats
  const totalVisits = useMemo(() => logs.filter(l => l.type === 'visit').length, [logs]);
  const totalPhotos = useMemo(() => logs.filter(l => l.type === 'photo').length, [logs]);

  // Enriched tree rows with activity counts
  const enrichedTrees = useMemo(() => {
    return trees.map((tree) => {
      const treeLogs = logs.filter((l) => l.tree_id === tree.id);
      const visits = treeLogs.filter((l) => l.type === 'visit');
      const latestLog = treeLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      return {
        ...tree,
        total_visits: visits.length,
        last_activity: latestLog ? latestLog.created_at : null,
      };
    });
  }, [trees, logs]);

  // Sorting / Filtering logic
  const filteredTrees = useMemo(() => {
    return enrichedTrees
      .filter((tree) => {
        return (
          tree.id.toString().includes(search) ||
          tree.species.toLowerCase().includes(search.toLowerCase()) ||
          tree.planter_name.toLowerCase().includes(search.toLowerCase())
        );
      })
      .sort((a, b) => {
        let valA: string | number = a[sortField] ?? '';
        let valB: string | number = b[sortField] ?? '';

        if (sortField === 'last_activity') {
          valA = a.last_activity ? new Date(a.last_activity).getTime() : 0;
          valB = b.last_activity ? new Date(b.last_activity).getTime() : 0;
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [enrichedTrees, search, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Checking authorization & loading dashboard...</p>
      </div>
    );
  }

  // RENDER DEMO LOGIN IF NOT SIGNED IN
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-16">
        <Card className="w-full max-w-sm border-border shadow-lg bg-card">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-primary/20 bg-white mx-auto shadow-sm">
              <Image
                src="/logo.png"
                alt="Palamu Tiger Reserve Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-primary uppercase">
                Admin Portal
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                PTR Reserve Dashboard Access
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg flex gap-2 items-start">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-primary/5 border border-primary/10 text-muted-foreground text-xs p-3 rounded-lg flex gap-2 items-start">
                <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  One-click demo credentials pre-filled. Just click <strong>Sign In</strong> to load the dashboard.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={actionLoading === 'login'}
                  className="h-11 border-border font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={actionLoading === 'login'}
                  className="h-11 border-border font-medium"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={actionLoading === 'login'}
                className="w-full h-11 bg-primary hover:bg-primary/95 text-white gap-2 font-medium"
              >
                {actionLoading === 'login' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In / Access Dashboard
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // RENDER DASHBOARD IF LOGGED IN
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Success banner */}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm p-4 rounded-xl flex gap-2 items-center">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Forest Administration Panel
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reserve Dashboard</h1>
        </div>
        <Link 
          href="/admin/qr-codes" 
          className={cn(
            buttonVariants({ variant: 'default' }),
            "bg-primary hover:bg-primary/95 text-white gap-2 h-11 px-5 shadow-md"
          )}
        >
          <QrCode className="h-4 w-4" />
          View & Print QR Tags
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Trees className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">{trees.length}</span>
              <span className="text-xs text-muted-foreground">Total Active Trees</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <Droplet className="h-6 w-6 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">{totalVisits}</span>
              <span className="text-xs text-muted-foreground">Total Watering Visits</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-accent/10 text-accent rounded-xl">
              <Camera className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">{totalPhotos}</span>
              <span className="text-xs text-muted-foreground">Total Growth Photos</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Control */}
      <Card className="shadow-sm border-border bg-card">
        <CardContent className="p-4 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Tree ID, species, planter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 border-border focus-visible:ring-primary"
            />
          </div>

          {/* Table Container */}
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-secondary/40">
                <TableRow>
                  <TableHead className="w-16 font-semibold">
                    <button 
                      onClick={() => handleSort('id')} 
                      className="flex items-center gap-1 hover:text-primary transition-colors font-semibold"
                    >
                      ID
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <button 
                      onClick={() => handleSort('species')} 
                      className="flex items-center gap-1 hover:text-primary transition-colors font-semibold"
                    >
                      Species
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <button 
                      onClick={() => handleSort('planter_name')} 
                      className="flex items-center gap-1 hover:text-primary transition-colors font-semibold"
                    >
                      Planter
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <button 
                      onClick={() => handleSort('planted_date')} 
                      className="flex items-center gap-1 hover:text-primary transition-colors font-semibold"
                    >
                      Planted Date
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="w-28 text-center font-semibold">
                    <button 
                      onClick={() => handleSort('total_visits')} 
                      className="mx-auto flex items-center gap-1 hover:text-primary transition-colors font-semibold"
                    >
                      Visits
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <button 
                      onClick={() => handleSort('last_activity')} 
                      className="flex items-center gap-1 hover:text-primary transition-colors font-semibold"
                    >
                      Last Activity
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="w-20 text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No trees match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrees.map((tree) => (
                    <TableRow key={tree.id} className="hover:bg-secondary/20">
                      <TableCell className="font-semibold text-primary">#{tree.id}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {tree.species}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{tree.planter_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(tree.planted_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        <Badge variant="secondary" className="px-2 py-0.5 border border-border bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          {tree.total_visits}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tree.last_activity ? (
                          format(new Date(tree.last_activity), 'dd MMM yyyy')
                        ) : (
                          <span className="text-[10px] italic opacity-60">No activity yet</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/tree/${tree.id}`}
                          target="_blank"
                          className={cn(
                            buttonVariants({ variant: 'ghost', size: 'icon' }),
                            "h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                          title="View Tree Profile"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
