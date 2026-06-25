'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { getTrees, getSession, signIn } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Printer, 
  Loader2, 
  LogIn, 
  ShieldAlert,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEMO_EMAIL = "demo@ptr.org";
const DEMO_PASSWORD = "demo1234";

interface Tree {
  id: number;
  species: string;
}

export default function QrCodesPage() {
  const [user, setUser] = useState<any>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Login form pre-filled
  const [loginEmail, setLoginEmail] = useState(DEMO_EMAIL);
  const [loginPassword, setLoginPassword] = useState(DEMO_PASSWORD);

  // Determine site URL for QRs
  const siteUrl = 
    process.env.NEXT_PUBLIC_SITE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  useEffect(() => {
    // Read session and trees DDL
    setUser(getSession());
    setTrees(getTrees());
    setLoading(false);

    const handleAuthChange = () => {
      setUser(getSession());
      setTrees(getTrees());
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
      window.dispatchEvent(new Event('ptr_auth_change'));
      setActionLoading(null);
    }, 500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Checking authorization & loading tags...</p>
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
                PTR QR Tag Grid Access
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
                  One-click demo credentials pre-filled. Just click <strong>Sign In</strong> to load the QR tags.
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
                    Sign In / Access QR Sheet
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // RENDER DYNAMIC GRID IF LOGGED IN
  return (
    <div className="min-h-screen bg-background p-6">
      {/* Control bar - hidden during print */}
      <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6 mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Print QR Codes</h1>
          <p className="text-sm text-muted-foreground">
            Printable sheet for all {trees.length} seeded trees. Sized for sticker or metal tag printing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href="/admin" 
            className={cn(
              buttonVariants({ variant: 'outline' }),
              "border-border gap-1.5 h-11 px-4"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary/95 text-white gap-2 h-11 px-5 shadow-md">
            <Printer className="h-4 w-4" />
            Download / Print All Tags
          </Button>
        </div>
      </div>

      {/* Grid of tags */}
      <div className="container mx-auto max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center">
          {trees.map((tree) => {
            const treeUrl = `${siteUrl}/tree/${tree.id}`;

            return (
              <div 
                key={tree.id} 
                className="w-[2.5in] h-[3.5in] border-2 border-primary/45 bg-white p-4 flex flex-col justify-between items-center text-black rounded-lg shadow-sm print:shadow-none print:border-black print:rounded-none relative break-inside-avoid page-break-inside-avoid"
              >
                {/* Tag Header */}
                <div className="w-full flex items-center gap-2 border-b border-gray-200 pb-1.5">
                  <div className="relative h-7 w-7 overflow-hidden rounded-full border border-gray-200 bg-white shrink-0">
                    <Image
                      src="/logo.png"
                      alt="PTR Logo"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[9px] font-extrabold tracking-wider text-green-800 uppercase">
                      Palamu Tiger Reserve
                    </span>
                    <span className="text-[7px] text-gray-500 font-medium tracking-widest uppercase">
                      Government of Jharkhand
                    </span>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="flex-1 flex flex-col justify-center items-center my-3">
                  <QRCodeSVG
                    value={treeUrl}
                    size={135}
                    level="H" // High error correction for outdoor scanning
                    includeMargin={false}
                  />
                  <span className="text-[7px] text-gray-400 mt-1 font-mono tracking-widest uppercase">
                    Scan to view timeline
                  </span>
                </div>

                {/* Tag Footer */}
                <div className="w-full text-center border-t border-gray-200 pt-1.5">
                  <div className="text-xs font-bold text-green-900 bg-green-50 rounded px-1.5 py-0.5 inline-block mb-1 border border-green-150">
                    Tree #{tree.id}
                  </div>
                  <div className="text-[9px] font-semibold text-gray-800 line-clamp-1 truncate px-1">
                    {tree.species}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Print-only CSS helpers */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
          }
          .min-h-screen {
            min-height: auto !important;
            padding: 0 !important;
          }
          .grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 15px !important;
            justify-items: center !important;
            width: 100% !important;
          }
          .w-\\[2\\.5in\\] {
            width: 2.3in !important;
            height: 3.2in !important;
            border: 1px solid #000 !important;
            margin-bottom: 10px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
