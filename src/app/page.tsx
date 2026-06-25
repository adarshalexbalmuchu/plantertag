'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  QrCode, 
  ShieldAlert, 
  ArrowRight,
  Info
} from 'lucide-react';
import { getTrees } from '@/lib/mockData';

export default function HomePage() {
  const router = useRouter();
  const [treeId, setTreeId] = useState('');
  const [searchError, setSearchError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');

    const id = parseInt(treeId, 10);
    const maxTrees = getTrees().length;
    if (isNaN(id) || id < 1 || id > maxTrees) {
      setSearchError(`Please enter a valid tree ID between 1 and ${maxTrees}.`);
      return;
    }

    router.push(`/tree/${id}`);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-background px-4 py-12 md:py-20">
      <div className="w-full max-w-2xl text-center space-y-6">
        {/* Reserve Logo */}
        <div className="relative h-28 w-28 overflow-hidden rounded-full border border-primary bg-white mx-auto shadow-md">
          <Image
            src="/logo.png"
            alt="Palamu Tiger Reserve Logo"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">
            Department of Forests & Environment
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Palamu Tiger Reserve
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            Official QR-based tree growth tracking and tending registry portal.
          </p>
        </div>

        {/* Search Tree Form */}
        <Card className="shadow-md border-border bg-card max-w-md mx-auto">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center justify-center gap-1.5">
              <QrCode className="h-4 w-4 text-primary" /> Public Tree Lookup
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter Tree ID (1 - 5)"
                  value={treeId}
                  onChange={(e) => setTreeId(e.target.value)}
                  className="pl-9 h-11 border-border focus-visible:ring-primary font-medium"
                />
              </div>
              <Button type="submit" className="bg-primary hover:bg-primary/95 text-white h-11 px-5">
                Go
              </Button>
            </form>
            {searchError && (
              <p className="text-xs text-destructive text-left font-medium flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                {searchError}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Staff/Admin CTA Link */}
        <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-muted-foreground">
          <Link 
            href="/login" 
            className="flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            Forest Guard / Staff Login
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="hidden sm:inline opacity-40">|</span>
          <Link 
            href="/admin" 
            className="flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            Go to Admin Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Informational Blurb */}
        <div className="max-w-md mx-auto bg-primary/5 border border-primary/10 p-4 rounded-xl flex gap-3 text-left text-xs leading-relaxed text-muted-foreground mt-8">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-primary mb-0.5">Forest Monitoring Initiative (Demo Build)</p>
            <p>
              Each tree in the reserve is marked with a metallic tag containing a secure QR code. Scanning the tag instantly displays the tree's planting history, health status, and growth timeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
