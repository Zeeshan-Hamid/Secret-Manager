"use client";

import { useState } from "react";
import SecretForm from "@/components/SecretForm";
import LinkDisplay from "@/components/LinkDisplay";
import { Shield } from "lucide-react";

export default function HomePage() {
  const [link, setLink] = useState<string | null>(null);

  if (link) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-2 mb-12">
          <Shield className="w-8 h-8 text-amber-500" />
          <h1 className="font-mono text-xl font-bold text-zinc-100 uppercase tracking-widest">
            Secret Manager
          </h1>
        </div>
        <LinkDisplay link={link} />
        <button
          onClick={() => setLink(null)}
          className="font-mono text-xs text-zinc-600 hover:text-zinc-400 mt-8 transition-colors uppercase tracking-wider"
        >
          Create Another Secret
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-2 mb-12">
        <Shield className="w-8 h-8 text-amber-500" />
        <h1 className="font-mono text-xl font-bold text-zinc-100 uppercase tracking-widest">
          Secret Manager
        </h1>
        <p className="font-mono text-xs text-zinc-500">
          End-to-end encrypted • One-time view • Zero trust
        </p>
      </div>

      <SecretForm onLinkGenerated={setLink} />
    </div>
  );
}
