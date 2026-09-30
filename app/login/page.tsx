"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2, AlertCircle, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setError(err?.message || "Invalid access password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface border border-border shadow-lg mb-4 text-accent">
            <span className="w-3 h-3 rounded-full bg-accent animate-pulse shadow-[0_0_12px_#10b981]" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-main">PulseFlow</h1>
          <p className="text-xs text-muted mt-1 font-mono">
            Objective Telemetry &amp; Protocol Discipline Engine
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted font-bold mb-1.5">
                Password 1 (App Access)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter access password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2.5 text-xs text-main placeholder-muted/50 focus:outline-none focus:border-accent"
                />
              </div>
              <p className="text-[11px] text-muted mt-1.5">
                Sets an HTTP-only 30-day session cookie for frictionless dashboard access.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 rounded-xl bg-accent text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-[11px] text-muted font-mono flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-accent" />
          <span>Asymmetric Envelope Cryptography Enabled</span>
        </div>
      </div>
    </div>
  );
}
