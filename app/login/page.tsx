"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Invalid password");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-xs flex flex-col items-center">
        {/* Brand header - larger icon, title, subtitle */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-border mb-4 text-accent shadow-lg">
            <span className="w-4 h-4 rounded-full bg-accent animate-pulse shadow-[0_0_14px_#10b981]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-main">PulseFlow</h1>
          <p className="text-sm text-muted mt-1">Protocol Discipline Engine</p>
        </div>

        {/* Minimal Form with immediate grey-out on submit */}
        <form onSubmit={handleSubmit} className="w-full space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <input
              type="password"
              required
              autoFocus
              disabled={loading}
              placeholder={loading ? "Verifying..." : "Enter password..."}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-xl px-4 py-3 text-sm text-main placeholder-muted/60 transition-all ${
                loading
                  ? "bg-surface-subtle/50 border border-border/50 opacity-50 cursor-not-allowed text-muted"
                  : "bg-surface border border-border focus:outline-none focus:border-accent"
              }`}
            />

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-xl bg-accent text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Enter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
