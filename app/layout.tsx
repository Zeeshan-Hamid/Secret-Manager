import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Secret Manager — Secure One-Time Sharing",
  description:
    "Share passwords, credentials, and confidential text securely. End-to-end encrypted. One-time view. Zero trust in the server.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-200 antialiased">
        {children}
      </body>
    </html>
  );
}
