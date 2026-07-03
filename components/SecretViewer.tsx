"use client";

import { useEffect, useState, useRef } from "react";
import {
  decrypt,
  decryptToBytes,
  unpackPayload,
  keyFragmentToBytes,
} from "@/lib/crypto";
import { ViewState } from "@/lib/types";
import {
  Shield,
  Lock,
  EyeOff,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  Image as ImageIcon,
  Download,
  FileText,
} from "lucide-react";

export default function SecretViewer() {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [isCombined, setIsCombined] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    async function fetchAndDecrypt() {
      try {
        const pathParts = window.location.pathname.split("/");
        const id = pathParts[pathParts.length - 1];

        if (!id) {
          setViewState("error");
          setErrorMessage("Invalid URL — no secret ID found.");
          return;
        }

        const response = await fetch(`/api/secrets/${id}`);

        if (response.status === 410) {
          setViewState("expired");
          return;
        }

        if (!response.ok) {
          setViewState("error");
          setErrorMessage("Failed to retrieve the encrypted secret.");
          return;
        }

        const fragment = window.location.hash.slice(1);
        if (!fragment) {
          setViewState("error");
          setErrorMessage(
            "The decryption key is missing from the URL. Ask the sender to share the complete link, including everything after the #."
          );
          return;
        }

        const keyBytes = keyFragmentToBytes(fragment);
        const contentType = response.headers.get("content-type") ?? "";
        const isBinary = !contentType.includes("application/json");

        if (isBinary) {
          // --- Image or Combined (binary response) ---
          const secretType = response.headers.get("x-secret-type");
          console.log("[SecretViewer] Binary response, type:", secretType);
          setIsImage(true);

          const encryptedBytes = await response.arrayBuffer();
          console.log("[SecretViewer] Encrypted size:", encryptedBytes.byteLength, "bytes");

          if (secretType === "combined") {
            setIsCombined(true);
            console.log("[SecretViewer] Decrypting combined payload...");
            const decryptedBytes = await decryptToBytes(encryptedBytes, keyBytes);
            console.log("[SecretViewer] Decrypted size:", decryptedBytes.byteLength, "bytes");

            console.log("[SecretViewer] Unpacking...");
            const { text, imageBytes } = unpackPayload(decryptedBytes);
            console.log("[SecretViewer] Unpacked — text:", text.length, "img:", imageBytes.byteLength);
            setPlaintext(text);

            const imageContentType =
              response.headers.get("x-image-content-type") || "image/png";
            const imageBlob = new Blob([imageBytes], { type: imageContentType });
            const url = URL.createObjectURL(imageBlob);
            objectUrlRef.current = url;
            setImageUrl(url);
          } else {
            console.log("[SecretViewer] Decrypting image...");
            const decryptedBytes = await decryptToBytes(encryptedBytes, keyBytes);
            console.log("[SecretViewer] Decrypted size:", decryptedBytes.byteLength, "bytes");

            const imageType =
              response.headers.get("x-image-content-type") || "image/png";
            const blob = new Blob([decryptedBytes], { type: imageType });
            const url = URL.createObjectURL(blob);
            objectUrlRef.current = url;
            setImageUrl(url);
          }
        } else {
          // --- Text secret (JSON response) ---
          const data = await response.json();
          console.log("[SecretViewer] Text response");

          const decrypted = await decrypt(
            (data as { encryptedBlob: string }).encryptedBlob,
            keyBytes
          );
          console.log("[SecretViewer] Text length:", decrypted.length);
          setPlaintext(decrypted);
        }

        setViewState("decrypted");
        history.replaceState(null, "", window.location.pathname);
      } catch (err) {
        console.error("[SecretViewer] Decryption failed:", err);
        setViewState("error");
        setErrorMessage(
          "Decryption failed. The secret may have been tampered with or the link is incomplete."
        );
      }
    }

    fetchAndDecrypt();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  async function handleCopy() {
    if (!plaintext) return;
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
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

  function handleDownload() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "decrypted-secret.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
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
      {viewState === "decrypted" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            {isImage ? (
              <ImageIcon className="w-6 h-6 text-emerald-500" />
            ) : (
              <Shield className="w-6 h-6 text-emerald-500" />
            )}
            <h2 className="font-mono text-sm font-semibold text-emerald-400 uppercase tracking-wider">
              {isCombined
                ? "Secret Decrypted"
                : isImage
                  ? "Image Decrypted"
                  : "Secret Decrypted"}
            </h2>
          </div>

          {/* Combined: text first, then image */}
          {isCombined && plaintext !== null && (
            <div className="bg-black border border-amber-500/30 rounded-md overflow-hidden">
              <div className="flex items-center gap-2 px-4 pt-4 pb-0">
                <FileText className="w-4 h-4 text-amber-500" />
                <span className="font-mono text-xs text-amber-400 uppercase tracking-wider">
                  Text
                </span>
              </div>
              <pre className="font-mono text-sm text-amber-100 whitespace-pre-wrap break-words leading-relaxed p-4 pt-2">
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
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {isImage && imageUrl && (
            <div className="bg-black border border-amber-500/30 rounded-md overflow-hidden">
              {isCombined && (
                <div className="flex items-center gap-2 px-4 pt-4 pb-0">
                  <ImageIcon className="w-4 h-4 text-amber-500" />
                  <span className="font-mono text-xs text-amber-400 uppercase tracking-wider">
                    Image
                  </span>
                </div>
              )}
              <img
                src={imageUrl}
                alt="Decrypted secret image"
                className={`w-full h-auto object-contain ${isCombined ? "max-h-[50vh]" : "max-h-[70vh]"}`}
              />
              <div className="border-t border-amber-500/20 px-4 py-3 flex items-center justify-end">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider
                             bg-zinc-900 text-zinc-400 px-3 py-1.5 rounded
                             hover:bg-zinc-800 hover:text-amber-400
                             active:bg-zinc-700
                             transition-colors border border-zinc-800"
                >
                  {downloaded ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Downloaded</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Text-only (existing) */}
          {!isImage && plaintext !== null && (
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
          )}

          <div className="flex items-start gap-3 bg-red-900/20 border border-red-900/40 rounded-md px-4 py-3">
            <EyeOff className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-mono text-sm text-red-400 font-semibold">
                This secret has been permanently deleted from the server.
              </p>
              <p className="font-mono text-xs text-red-500/70">
                Once you navigate away from this page, it cannot be viewed
                again.
                {!isImage &&
                  " Copy the secret now if you need to keep it."}
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
