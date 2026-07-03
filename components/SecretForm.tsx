"use client";

import { useState } from "react";
import {
  generateEncryptionKey,
  encrypt,
  exportKeyToBase64,
} from "@/lib/crypto";
import { CreateSecretResponse } from "@/lib/types";

interface SecretFormProps {
  onLinkGenerated: (link: string) => void;
}

export default function SecretForm({ onLinkGenerated }: SecretFormProps) {
  const [secretText, setSecretText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = secretText.trim();
    if (!trimmed) {
      setError("Please enter a secret to share.");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Generate a random AES-256 key in the browser
      const key = await generateEncryptionKey();

      // Step 2: Encrypt the secret client-side
      const encryptedBlob = await encrypt(trimmed, key);

      // Step 3: Send ONLY the encrypted blob to the server
      const response = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedBlob }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || "Failed to create secret");
      }

      const { id }: CreateSecretResponse = await response.json();

      // Step 4: Export the key for the URL fragment
      const keyBase64 = await exportKeyToBase64(key);

      // Step 5: Construct the full shareable link
      const link = `${window.location.origin}/s/${id}#${keyBase64}`;

      onLinkGenerated(link);
      setSecretText("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
      <div>
        <label
          htmlFor="secret"
          className="block font-mono text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2"
        >
          Secret
        </label>
        <textarea
          id="secret"
          rows={6}
          value={secretText}
          onChange={(e) => {
            setSecretText(e.target.value);
            setError(null);
          }}
          placeholder="Paste your password, API key, or confidential text here…"
          disabled={isLoading}
          className="w-full bg-black border border-zinc-700 rounded-md px-4 py-3
                     font-mono text-sm text-zinc-100 placeholder:text-zinc-600
                     focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed
                     resize-vertical transition-colors"
        />
        <p className="font-mono text-xs text-zinc-600 mt-2">
          This secret will be encrypted in your browser before it leaves your
          machine. The server never sees the plaintext.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-md px-4 py-3">
          <p className="font-mono text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full font-mono text-sm font-semibold uppercase tracking-wider
                   bg-amber-500 text-black px-6 py-3 rounded-md
                   hover:bg-amber-400 active:bg-amber-600
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
      >
        {isLoading ? "Encrypting…" : "Create Encrypted Link"}
      </button>
    </form>
  );
}
