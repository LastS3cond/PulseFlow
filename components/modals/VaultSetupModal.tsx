"use client";

import React, { useState } from "react";
import { initVaultConfig } from "@/app/actions/vault";
import { initializeVaultWithPassword2 } from "@/lib/crypto/vault";
import {
  ShieldAlert,
  Key,
  CheckCircle2,
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
      // 1. Generate RSA keypair and wrap private key with PBKDF2 + AES-GCM
      const vaultPayload = await initializeVaultWithPassword2(password2);

      // 2. Transmit to server to store in vault_config
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-surface border border-accent/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-surface-subtle/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-main">Initialize Cryptographic Vault</h2>
            <p className="text-xs text-muted">First-boot setup: Establish your asymmetric RSA keypair</p>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleInitialize} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-surface-subtle border border-border text-xs text-muted space-y-2">
            <div className="flex items-center gap-2 font-semibold text-main">
              <ShieldAlert className="w-4 h-4 text-accent" />
              <span>Dual-Password Architecture</span>
            </div>
            <p>
              PulseFlow uses an asymmetric envelope system. All future incident intake is frictionless (zero-password). Your qualitative notes will be encrypted using an RSA public key.
            </p>
            <p className="font-medium text-main/90">
              Set <strong>Password 2 (Vault Password)</strong> now. It will encrypt your RSA private key with PBKDF2 (100k iterations). Only you will be able to unwrap it during coaching exports.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted font-bold mb-1.5">
              Password 2 (Vault Master Password)
            </label>
            <input
              type="password"
              required
              placeholder="Enter strong vault password..."
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2.5 text-xs text-main placeholder-muted/50 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted font-bold mb-1.5">
              Confirm Password 2
            </label>
            <input
              type="password"
              required
              placeholder="Confirm vault password..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-surface-subtle border border-border rounded-xl px-3.5 py-2.5 text-xs text-main placeholder-muted/50 focus:outline-none focus:border-accent"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isInitializing || !password2 || !confirmPassword}
              className="w-full py-3 rounded-xl bg-accent text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating RSA-OAEP Keypair &amp; Deriving Salt...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Initialize Vault &amp; Unlock Intake</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
