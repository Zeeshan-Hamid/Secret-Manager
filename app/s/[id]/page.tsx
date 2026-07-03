import type { Metadata } from "next";
import SecretViewer from "@/components/SecretViewer";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "View Secret — Secret Manager",
  description: "Decrypt and view a shared secret",
};

export default async function ViewSecretPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-8 h-8 text-zinc-700" />
          <h1 className="font-mono text-lg font-bold text-zinc-500 uppercase tracking-widest">
            Invalid Link
          </h1>
          <p className="font-mono text-sm text-zinc-600">
            This link is missing a secret ID.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-2 mb-12">
        <Shield className="w-8 h-8 text-zinc-700" />
        <h1 className="font-mono text-lg font-bold text-zinc-500 uppercase tracking-widest">
          Secret Manager
        </h1>
      </div>
      <SecretViewer />
    </div>
  );
}
