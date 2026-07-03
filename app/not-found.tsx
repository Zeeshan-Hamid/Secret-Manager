import Link from "next/link";
import { Shield } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-16 text-center">
      <Shield className="w-10 h-10 text-zinc-600 mb-4" />
      <h1 className="font-mono text-lg font-bold text-zinc-400 uppercase tracking-widest mb-2">
        404 — Not Found
      </h1>
      <p className="font-mono text-sm text-zinc-600 mb-8">
        This page doesn&apos;t exist, or the secret link has expired.
      </p>
      <Link
        href="/"
        className="font-mono text-xs text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-wider"
      >
        Create a new secret
      </Link>
    </div>
  );
}
