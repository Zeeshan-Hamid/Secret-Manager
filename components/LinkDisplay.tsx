"use client";

import { useState } from "react";
import { Copy, Check, Link2, Clock } from "lucide-react";

interface LinkDisplayProps {
  link: string;
}

export default function LinkDisplay({ link }: LinkDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select the text manually
      const input = document.getElementById("secret-link") as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link2 className="w-5 h-5 text-amber-500" />
        <h2 className="font-mono text-sm font-semibold text-amber-400 uppercase tracking-wider">
          Your Encrypted Link
        </h2>
      </div>

      <p className="font-mono text-sm text-zinc-400">
        This link contains everything needed to decrypt the secret. Share it
        securely — anyone with this link can view it <strong>once</strong>.
      </p>

      <div className="flex gap-2">
        <input
          id="secret-link"
          type="text"
          value={link}
          readOnly
          className="flex-1 bg-black border border-zinc-700 rounded-md px-4 py-3
                     font-mono text-xs text-zinc-300
                     focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none
                     truncate"
        />
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider
                     bg-zinc-800 text-zinc-200 px-4 py-3 rounded-md
                     hover:bg-zinc-700 active:bg-zinc-600
                     transition-colors border border-zinc-700"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-start gap-2 bg-zinc-900 border border-zinc-800 rounded-md px-4 py-3">
        <Clock className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
        <p className="font-mono text-xs text-zinc-500">
          This link expires in 24 hours. It can only be viewed once — after the
          recipient opens it, the secret is permanently deleted from the server.
        </p>
      </div>
    </div>
  );
}
