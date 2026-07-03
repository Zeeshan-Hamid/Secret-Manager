"use client";

import { useEffect, useState } from "react";
import { decrypt, keyFragmentToBytes } from "@/lib/crypto";
import { ViewState, ViewSecretResponse } from "@/lib/types";
import { Shield, Lock, EyeOff, AlertTriangle, Loader2, Copy, Check } from "lucide-react";

export default function SecretViewer() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchAndDecrypt() {
      try {
        // Extract the ID from the URL path
        const pathParts = window.location.pathname.split("/");
        const id = pathParts[pathParts.length - 1];

        if (!id) {
          setViewState("error");
          setErrorMessage("Invalid URL — no secret ID found.");
          return;
        }

        // Fetch the encrypted blob from the server FIRST —
        // this determines whether the secret exists regardless of the key
        const response = await fetch(`/api/secrets/${id}`);

        if (response.status === 410) {
          // Secret was already viewed or expired. The fragment/key is irrelevant.
          setViewState("expired");
          return;
        }

        if (!response.ok) {
          setViewState("error");
          setErrorMessage("Failed to retrieve the encrypted secret.");
          return;
        }

        // Blob exists — now we need the key to decrypt it
        const fragment = window.location.hash.slice(1);
        if (!fragment) {
          setViewState("error");
          setErrorMessage(
            "The decryption key is missing from the URL. Ask the sender to share the complete link, including everything after the #."
          );
          return;
        }

        const { encryptedBlob }: ViewSecretResponse = await response.json();

        // Decode the key and decrypt
        const keyBytes = keyFragmentToBytes(fragment);
        const decrypted = await decrypt(encryptedBlob, keyBytes);

        setPlaintext(decrypted);
        setViewState("decrypted");

        // Clear the fragment from the URL so the key is no longer visible
        history.replaceState(null, "", window.location.pathname);
      } catch {
        setViewState("error");
        setErrorMessage(
          "Decryption failed. The secret may have been tampered with or the link is incomplete."
        );
      }
    }

    fetchAndDecrypt();
  }, []);

  async function handleCopy() {
    if (!plaintext) return;
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers or non-HTTPS contexts
      const textarea = document.createElement("textarea");
      textarea.value = plaintext;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Loading state */}
      {viewState === "loading" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="font-mono text-sm text-zinc-500">Decrypting…</p>
        </div>
      )}

      {/* Decrypted state */}
      {viewState === "decrypted" && plaintext !== null && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-emerald-500" />
            <h2 className="font-mono text-sm font-semibold text-emerald-400 uppercase tracking-wider">
              Secret Decrypted
            </h2>
          </div>

          <div className="bg-black border border-amber-500/30 rounded-md overflow-hidden">
            <pre className="font-mono text-sm text-amber-100 whitespace-pre-wrap break-words leading-relaxed p-6">
              {plaintext}
            </pre>
            <div className="border-t border-amber-500/20 px-4 py-3 flex items-center justify-end">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider
                           bg-zinc-900 text-zinc-400 px-3 py-1.5 rounded
                           hover:bg-zinc-800 hover:text-amber-400
                           active:bg-zinc-700
                           transition-colors border border-zinc-800"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Secret</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-red-900/20 border border-red-900/40 rounded-md px-4 py-3">
            <EyeOff className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-mono text-sm text-red-400 font-semibold">
                This secret has been permanently deleted from the server.
              </p>
              <p className="font-mono text-xs text-red-500/70">
                Once you navigate away from this page, it cannot be viewed
                again. Copy the secret now if you need to keep it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expired / already viewed state */}
      {viewState === "expired" && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Lock className="w-10 h-10 text-zinc-600" />
          <h2 className="font-mono text-lg font-semibold text-zinc-400 uppercase tracking-wider">
            Secret No Longer Available
          </h2>
          <p className="font-mono text-sm text-zinc-500 max-w-md">
            This secret has either already been viewed or has expired after 24
            hours. Secrets can only be viewed once.
          </p>
        </div>
      )}

      {/* Error state */}
      {viewState === "error" && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <h2 className="font-mono text-lg font-semibold text-red-400 uppercase tracking-wider">
            Unable to Access Secret
          </h2>
          <p className="font-mono text-sm text-zinc-500 max-w-md">
            {errorMessage ||
              "An unexpected error occurred while trying to decrypt the secret."}
          </p>
        </div>
      )}
    </div>
  );
}
