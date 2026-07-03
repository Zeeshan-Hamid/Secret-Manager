"use client";

import { useState, useRef } from "react";
import {
  generateEncryptionKey,
  encrypt,
  encryptBytes,
  packPayload,
  exportKeyToBase64,
} from "@/lib/crypto";
import { CreateSecretResponse } from "@/lib/types";
import { Upload, FileImage, Lock } from "lucide-react";

interface SecretFormProps {
  onLinkGenerated: (link: string) => void;
}

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];
const ACCEPT_STRING = ALLOWED_IMAGE_TYPES.join(",");
const MAX_IMAGE_SIZE_MB = 8;

export default function SecretForm({ onLinkGenerated }: SecretFormProps) {
  const [secretText, setSecretText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasImage = imageFile !== null;
  const hasText = secretText.trim().length > 0;
  const isCombined = hasImage && hasText;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setError(
        `Image size exceeds ${MAX_IMAGE_SIZE_MB} MB. Please select a smaller file.`
      );
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setImageFile(file);
    setError(null);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setSecretText(e.target.value);
    setError(null);
  }

  function clearImage() {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function getButtonLabel(): string {
    if (isLoading) return "Encrypting…";
    if (isCombined) return "Create Combined Link";
    if (hasImage) return "Encrypt & Create Image Link";
    return "Create Encrypted Link";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasImage && !hasText) {
      setError("Enter text or select an image to share.");
      return;
    }

    setIsLoading(true);

    try {
      const key = await generateEncryptionKey();
      let response: Response;

      if (isCombined && imageFile) {
        // --- Combined: text + image packed into one encrypted blob ---
        const imageBytes = await imageFile.arrayBuffer();
        console.log("[SecretForm] Image bytes:", imageBytes.byteLength);
        console.log("[SecretForm] Text length:", secretText.trim().length);
        
        const packed = packPayload(secretText.trim(), imageBytes);
        console.log("[SecretForm] Packed size:", packed.byteLength, "bytes");
        
        const encryptedBytes = await encryptBytes(packed, key);
        console.log("[SecretForm] Encrypted size:", encryptedBytes.byteLength, "bytes");

        const encryptedBlob = new Blob([encryptedBytes], {
          type: "application/octet-stream",
        });
        const uploadForm = new FormData();
        uploadForm.append("file", encryptedBlob, "combined.enc");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadForm,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => null);
          throw new Error(err?.error || "Upload failed");
        }

        const { url: blobUrl } = await uploadRes.json();
        console.log("[SecretForm] Combined Blob URL:", blobUrl.substring(0, 60) + "...");

        response = await fetch("/api/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "combined",
            blobUrl,
            imageContentType: imageFile.type,
          }),
        });
      } else if (hasImage && imageFile) {
        // --- Image only ---
        const fileBytes = await imageFile.arrayBuffer();
        const encryptedBytes = await encryptBytes(fileBytes, key);

        const encryptedBlob = new Blob([encryptedBytes], {
          type: "application/octet-stream",
        });
        const uploadForm = new FormData();
        uploadForm.append("file", encryptedBlob, imageFile.name + ".enc");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadForm,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => null);
          throw new Error(err?.error || "Upload failed");
        }

        const { url: blobUrl } = await uploadRes.json();

        response = await fetch("/api/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "image",
            blobUrl,
            contentType: imageFile.type,
          }),
        });
      } else {
        // --- Text only ---
        const encryptedBlob = await encrypt(secretText.trim(), key);

        response = await fetch("/api/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encryptedBlob }),
        });
      }

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || "Failed to create secret");
      }

      const { id }: CreateSecretResponse = await response.json();
      const keyBase64 = await exportKeyToBase64(key);
      const link = `${window.location.origin}/s/${id}#${keyBase64}`;

      onLinkGenerated(link);
      setSecretText("");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      {/* Text input */}
      <div>
        <label
          htmlFor="secret"
          className="block font-mono text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2"
        >
          Secret Text
        </label>
        <textarea
          id="secret"
          rows={4}
          value={secretText}
          onChange={handleTextChange}
          placeholder="Paste a password, API key, or confidential text…"
          disabled={isLoading}
          className="w-full bg-black border border-zinc-700 rounded-md px-4 py-3
                     font-mono text-sm text-zinc-100 placeholder:text-zinc-600
                     focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none
                     disabled:opacity-40 disabled:cursor-not-allowed
                     resize-vertical transition-colors"
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-zinc-800" />
        <span className="font-mono text-xs text-zinc-600 uppercase tracking-wider">
          and optionally
        </span>
        <div className="flex-1 border-t border-zinc-800" />
      </div>

      {/* Image input */}
      <div>
        <label
          htmlFor="image"
          className="block font-mono text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2"
        >
          Attach Image
        </label>
        <div className="relative">
          <input
            id="image"
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_STRING}
            onChange={handleFileSelect}
            disabled={isLoading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer
                       disabled:cursor-not-allowed z-10"
          />
          <div
            className={`w-full border border-dashed rounded-md px-4 py-6 text-center
                       transition-colors
                       ${
                         hasImage
                           ? "border-amber-500/50 bg-amber-500/5"
                           : "border-zinc-700 hover:border-zinc-500"
                       }
                       ${isLoading ? "opacity-40" : ""}`}
          >
            {hasImage && imageFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileImage className="w-5 h-5 text-amber-400" />
                <span className="font-mono text-sm text-amber-300 truncate max-w-[240px]">
                  {imageFile.name}
                </span>
                <span className="font-mono text-xs text-zinc-500">
                  ({(imageFile.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  onClick={clearImage}
                  className="font-mono text-xs text-zinc-500 hover:text-red-400 transition-colors ml-2"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Upload className="w-5 h-5 text-zinc-500" />
                <span className="font-mono text-sm text-zinc-500">
                  Click to select an image (PNG, JPEG, WebP, GIF)
                </span>
              </div>
            )}
          </div>
        </div>
        <p className="font-mono text-xs text-zinc-600 mt-2">
          Encrypted in your browser before upload. The server never sees the
          original.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-md px-4 py-3">
          <p className="font-mono text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || (!hasImage && !hasText)}
        className="w-full font-mono text-sm font-semibold uppercase tracking-wider
                   bg-amber-500 text-black px-6 py-3 rounded-md
                   hover:bg-amber-400 active:bg-amber-600
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>Encrypting…</>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            {getButtonLabel()}
          </>
        )}
      </button>
    </form>
  );
}
