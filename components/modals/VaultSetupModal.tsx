"use client";

import React, { useState } from "react";
import { initVaultConfig } from "@/app/actions/vault";
import { initializeVaultWithPassword2 } from "@/lib/crypto/vault";
import {
  Key,
  AlertTriangle,
  Loader2,
  Lock,
} from "lucide-react";

interface VaultSetupModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export function VaultSetupModal({ isOpen, onSuccess }: VaultSetupModalProps) {
  const [password2, setPassword2] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password2.length < 8) {
      setErrorMessage("Vault password should be at least 8 characters long.");
      return;
    }

    if (password2 !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsInitializing(true);
    try {
      const vaultPayload = await initializeVaultWithPassword2(password2);
      const result = await initVaultConfig(vaultPayload);

      if (!result.success) {
        throw new Error(result.error || "Failed to initialize vault in database");
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Failed to initialize cryptographic vault");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-surface border border-accent/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border bg-surface-subtle/50 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-main">Set Vault Password</h2>
            <p className="text-xs text-muted">Used for coaching export decryption</p>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleInitialize} className="p-4 space-y-3.5">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase font-bold text-muted mb-1">
              Vault Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter vault password..."
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2 text-xs text-main placeholder-muted/50 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase font-bold text-muted mb-1">
              Confirm Vault Password
            </label>
            <input
              type="password"
              required
              placeholder="Confirm vault password..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2 text-xs text-main placeholder-muted/50 focus:outline-none focus:border-accent"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isInitializing || !password2 || !confirmPassword}
              className="w-full py-2.5 rounded-xl bg-accent text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Initializing...</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5" />
                  <span>Set Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
