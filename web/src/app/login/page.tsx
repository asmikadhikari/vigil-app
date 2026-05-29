"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Eye, 
  ChevronLeft, 
  Mail, 
  Lock, 
  ArrowRight, 
  Zap, 
  Loader2, 
  ShieldAlert,
  User
} from "lucide-react";
import { createClient, hasSupabaseBrowserEnv } from "src/lib/supabase/browser";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signupQuery = searchParams.get("signup");
  
  const [isSignUp, setIsSignUp] = useState(signupQuery === "true");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [authSuccess, setAuthSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    if (!email || !password || (isSignUp && !companyName)) {
      setErrorMessage("Please fill out all required fields.");
      setLoading(false);
      return;
    }

    if (!hasSupabaseBrowserEnv()) {
      setTimeout(() => {
        setLoading(false);
        setAuthSuccess(true);
        router.push("/dashboard");
      }, 900);
      return;
    }

    const supabase = createClient();

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: companyName,
          },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=/onboarding`
              : undefined,
        },
      });

      setLoading(false);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.user) {
        await supabase.from("users").upsert({ id: data.user.id, company_name: companyName }, { onConflict: "id" });
      }

      setAuthSuccess(true);
      router.push("/onboarding");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAuthSuccess(true);
    router.push("/dashboard");
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-8">
      
      <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--surface-100)] text-[var(--brand)] border border-[var(--border)] lg:hidden mb-4">
          <Eye className="h-6 w-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight">
          {isSignUp ? "Create your intelligence hub" : "Welcome back to Vigil"}
        </h1>
        <p className="mt-2 text-sm text-[var(--foreground-light)]">
          {isSignUp 
            ? "Start your free competitor monitoring sandbox today." 
            : "Enter your details below to access your briefings."}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-500/20 bg-red-950/20 p-4 text-xs font-semibold text-red-400 flex items-center gap-2 animate-in fade-in duration-200">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {authSuccess ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-8 text-center flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
          <div className="h-12 w-12 rounded-full bg-[var(--surface-100)] border border-[var(--border)] flex items-center justify-center text-[var(--brand)]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">Sandbox Environment Initialized</h3>
          <p className="text-xs text-[var(--foreground-light)] leading-5">
            Authentication completed. Syncing your workspace and opening the intelligence hub...
          </p>
          <span className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">Redirecting shortly</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--foreground-light)]">Company Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
                <input 
                  type="text" 
                  placeholder="Acme Corp" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full h-[38px] rounded-md border border-[var(--border)] bg-[var(--surface-75)] px-3.5 pl-10 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--foreground-light)]">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
              <input 
                type="email" 
                placeholder="you@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[38px] rounded-md border border-[var(--border)] bg-[var(--surface-75)] px-3.5 pl-10 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-[var(--foreground-light)]">Password</label>
              {!isSignUp && (
                <a href="#" className="text-xs font-medium text-[var(--foreground-light)] hover:text-[var(--foreground)] transition-colors">
                  Forgot password?
                </a>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[38px] rounded-md border border-[var(--border)] bg-[var(--surface-75)] px-3.5 pl-10 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] transition-colors focus:border-[var(--brand)] focus:outline-none"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mt-2 h-[38px] flex items-center justify-center gap-2 rounded-md bg-[var(--brand)] text-sm font-semibold text-black transition-colors hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:hover:bg-[var(--brand)]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing auth keys...
              </>
            ) : (
              <>
                {isSignUp ? "Deploy Monitoring Sandbox" : "Enter Dashboard"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <p className="mt-2 text-center text-xs text-[var(--foreground-muted)]">
            {isSignUp ? "Already tracking competitors?" : "Want to try Vigil free?"}{" "}
            <button 
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage("");
              }}
              className="font-semibold text-[var(--brand)] hover:text-[var(--brand-hover)] transition-colors"
            >
              {isSignUp ? "Sign In" : "Create Free Account"}
            </button>
          </p>
        </form>
      )}

    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] antialiased overflow-hidden flex">
      
      <Link 
        href="/" 
        className="absolute top-6 left-6 z-50 flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-75)] p-2 px-4 text-xs font-semibold text-[var(--foreground-light)] transition-colors hover:bg-[var(--surface-100)] hover:text-[var(--foreground)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <div className="hidden lg:flex lg:w-1/2 bg-[var(--surface-75)] border-r border-[var(--border)] p-16 flex-col justify-between relative overflow-hidden">
        
        <div className="flex items-center gap-2 relative z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-100)] text-[var(--brand)] border border-[var(--border)]">
            <Eye className="h-4.5 w-4.5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">Vigil</span>
        </div>

        <div className="relative z-10 my-auto max-w-md flex flex-col gap-8">
          <div className="inline-flex self-start items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-100)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
            <Zap className="h-3 w-3" />
            Zero-Config Competitive Intelligence
          </div>
          
          <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)] leading-tight">
            "Get the 3-bullet competitive briefing every Monday morning, while you sleep."
          </h2>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-6 flex gap-4">
            <div className="h-10 w-10 rounded-full bg-[var(--surface-200)] flex items-center justify-center shrink-0 text-[var(--brand)] font-bold border border-[var(--border)]">
              S
            </div>
            <div>
              <p className="text-sm text-[var(--foreground-light)] font-medium">"Before Vigil, we manually monitored pricing updates. Now, we catch our competitors' changes within hours of launching."</p>
              <span className="mt-2 block text-xs text-[var(--foreground-muted)] font-semibold">— Sarah Jenkins, Head of Product at SyncFlow</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-[var(--foreground-muted)] relative z-10">
          © {new Date().getFullYear()} Vigil, Inc. Fully encrypted, multi-tenant Postgres security.
        </p>
      </div>

      <div className="w-full lg:w-1/2 p-6 md:p-12 lg:p-24 flex flex-col justify-center items-center">
        <Suspense fallback={
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
            <p className="text-xs text-[var(--foreground-muted)] font-medium">Initializing secure auth link...</p>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>

    </div>
  );
}
