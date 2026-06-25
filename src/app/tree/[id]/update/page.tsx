'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getTrees, addLog, getSession, signIn } from '@/lib/mockData';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Camera, 
  Droplet, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  LogIn,
  User,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEMO_EMAIL = "demo@ptr.org";
const DEMO_PASSWORD = "demo1234";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UpdateTreePage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const treeId = resolvedParams.id ? parseInt(resolvedParams.id, 10) : NaN;

  const [tree, setTree] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // 'visit' | 'photo' | 'login'
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Login form pre-filled
  const [loginEmail, setLoginEmail] = useState(DEMO_EMAIL);
  const [loginPassword, setLoginPassword] = useState(DEMO_PASSWORD);

  // Form states
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (isNaN(treeId)) {
      setError('Invalid Tree ID');
      setLoading(false);
      return;
    }

    const allTrees = getTrees();
    const targetTree = allTrees.find(t => t.id === treeId);
    
    if (targetTree) {
      setTree(targetTree);
      setUser(getSession());
    } else {
      setError('Tree not found');
    }
    
    setLoading(false);
  }, [treeId]);

  // Handle Inline Demo Login
  const handleInlineLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('login');
    setError(null);

    setTimeout(() => {
      signIn();
      setUser({ email: DEMO_EMAIL, name: 'Demo Staff' });
      setSuccess('Logged in successfully!');
      window.dispatchEvent(new Event('ptr_auth_change'));
      setActionLoading(null);
      setTimeout(() => setSuccess(null), 1200);
    }, 500); // Small delay to feel premium
  };

  // Log a simple watering/tending visit
  const handleLogVisit = () => {
    if (!user || !tree) return;
    setActionLoading('visit');
    setError(null);
    setSuccess(null);

    setTimeout(() => {
      addLog({
        tree_id: tree.id,
        type: 'visit',
        note: note.trim() || undefined,
        staff_name: user.email,
      });

      setSuccess('Watering & tending visit logged successfully!');
      setNote('');
      setShowNote(false);
      
      // Redirect after 1.5s
      setTimeout(() => {
        router.push(`/tree/${tree.id}`);
        router.refresh();
      }, 1500);
    }, 600);
  };

  // Upload a growth photo using client-side image compression
  const handleUploadPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tree || !selectedFile) return;
    setActionLoading('photo');
    setError(null);
    setSuccess(null);

    try {
      const img = new window.Image();
      img.src = URL.createObjectURL(selectedFile);
      
      img.onload = () => {
        // Compress image using canvas
        const canvas = document.createElement('canvas');
        const max_width = 800; // Good resolution for timeline
        const max_height = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > max_width) {
            height *= max_width / width;
            width = max_width;
          }
        } else {
          if (height > max_height) {
            width *= max_height / height;
            height = max_height;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Failed to compress image.');
          setActionLoading(null);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Export compressed JPEG base64 data URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

        addLog({
          tree_id: tree.id,
          type: 'photo',
          photo_url: compressedDataUrl,
          note: note.trim() || undefined,
          staff_name: user.email,
        });

        setSuccess('Growth photo and log saved successfully!');
        setNote('');
        setSelectedFile(null);
        setShowNote(false);

        // Redirect after 1.5s
        setTimeout(() => {
          router.push(`/tree/${tree.id}`);
          router.refresh();
        }, 1500);
      };

      img.onerror = () => {
        setError('Failed to load selected image file.');
        setActionLoading(null);
      };

    } catch (err: any) {
      setError('An error occurred during file processing.');
      setActionLoading(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Checking authorization & loading tree details...</p>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto bg-destructive/10 text-destructive p-3 rounded-full w-fit mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold mb-2">Error Occurred</h1>
        <p className="text-sm text-muted-foreground mb-6">{error || 'Unable to load tree details.'}</p>
        <Link href="/" className={cn(buttonVariants({ variant: 'outline' }), "")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Safety
        </Link>
      </div>
    );
  }

  // RENDER INLINE PRE-FILLED LOGIN FORM IF NOT LOGGED IN
  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-12 flex flex-col items-center px-4 pt-10">
        <div className="w-full max-w-sm mb-4">
          <Link href={`/tree/${tree.id}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Tree Details
          </Link>
        </div>

        <Card className="w-full max-w-sm border-border shadow-lg bg-card">
          <CardHeader className="text-center space-y-1 pb-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border border-primary/20 bg-white mx-auto shadow-sm mb-2">
              <Image
                src="/logo.png"
                alt="Palamu Tiger Reserve Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <CardTitle className="text-lg font-bold text-primary uppercase">Staff Login Required</CardTitle>
            <CardDescription className="text-xs">
              Authenticate to update Tree #{tree.id} ({tree.species})
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleInlineLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg flex gap-2 items-start">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-primary/5 border border-primary/10 text-muted-foreground text-[10px] p-2.5 rounded-lg flex gap-2 items-start">
                <Info className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                <p>
                  One-click demo credentials pre-filled. Just tap <strong>Log In</strong>.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="loginEmail" className="text-xs">Email Address</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={actionLoading === 'login'}
                  className="h-10 border-border"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="loginPassword" className="text-xs">Password</Label>
                <Input
                  id="loginPassword"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={actionLoading === 'login'}
                  className="h-10 border-border"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={actionLoading === 'login'}
                className="w-full h-10 bg-primary hover:bg-primary/95 text-white gap-2 font-medium"
              >
                {actionLoading === 'login' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Log In
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // RENDER FORM IF LOGGED IN
  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header Info Banner */}
      <div className="bg-primary/5 border-b border-border py-4 px-4">
        <div className="container mx-auto max-w-md flex items-center justify-between">
          <Link href={`/tree/${tree.id}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Tree Details
          </Link>
          <Badge className="bg-primary text-white border-none text-[10px]">Tree #{tree.id}</Badge>
        </div>
      </div>

      <div className="container mx-auto max-w-md px-4 mt-6">
        <div className="mb-6">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Logged in as: {user.email}
          </span>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{tree.species}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-medium">
            Planted by {tree.planter_name}
          </p>
        </div>

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm p-4 rounded-xl flex gap-2 items-start mb-6">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
            <div>
              <p className="font-semibold">Success!</p>
              <p className="text-xs opacity-90">{success}</p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && !success && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl flex gap-2 items-start mb-6">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Optional Remarks Expander */}
        <div className="mb-6">
          {!showNote ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNote(true)}
              className="text-xs border-border gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add a remark (optional)
            </Button>
          ) : (
            <Card className="shadow-sm border-border bg-card">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="note" className="text-xs font-semibold text-muted-foreground uppercase">
                    Remarks / Log Notes
                  </Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setShowNote(false); setNote(''); }} 
                    className="h-6 text-xs text-destructive hover:bg-destructive/10 px-2"
                  >
                    Cancel
                  </Button>
                </div>
                <Input
                  id="note"
                  placeholder="e.g. Tree looks healthy, soil is aerated."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={!!actionLoading}
                  className="border-border"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action 1: Log Tending / Water Visit */}
        <Card className="shadow-sm border-border bg-card mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
              <Droplet className="h-4 w-4 fill-current text-amber-600" /> Watering & Tending
            </CardTitle>
            <CardDescription className="text-xs">
              Quickly record that you have watered or tended to the tree.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Button
              onClick={handleLogVisit}
              disabled={!!actionLoading}
              className="w-full h-14 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-sm border-none"
            >
              {actionLoading === 'visit' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Logging Visit...
                </>
              ) : (
                <>
                  <Droplet className="h-5 w-5 fill-current" />
                  Log Tend / Water Visit
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Action 2: Upload Growth Photo */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-accent" /> Growth Documentation
            </CardTitle>
            <CardDescription className="text-xs">
              Upload a growth photo. Opens phone camera directly.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUploadPhoto}>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex justify-center items-center w-full">
                  <label
                    htmlFor="dropzone-file"
                    className={cn(
                      "flex flex-col justify-center items-center w-full h-32 bg-secondary/50 rounded-xl border-2 border-dashed border-border cursor-pointer hover:bg-secondary transition-colors",
                      selectedFile && "border-accent bg-accent/5"
                    )}
                  >
                    <div className="flex flex-col justify-center items-center pt-5 pb-6 px-4 text-center">
                      <Camera className={cn("h-8 w-8 mb-2", selectedFile ? 'text-accent' : 'text-muted-foreground')} />
                      {selectedFile ? (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-accent truncate max-w-[280px]">
                            {selectedFile.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            Click to take/select photo
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Camera will open on mobile
                          </p>
                        </div>
                      )}
                    </div>
                    <input
                      id="dropzone-file"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      required
                      disabled={!!actionLoading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={!selectedFile || !!actionLoading}
                className="w-full h-14 text-sm font-semibold rounded-xl bg-accent hover:bg-accent/95 text-white gap-2 shadow-sm"
              >
                {actionLoading === 'photo' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading & Saving...
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    Upload Photo
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
