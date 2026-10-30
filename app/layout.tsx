import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { AppProvider } from "@/lib/store";
import AppShell from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TASH Milliy Gerbariysi · O‘simliklar monitoringi",
  description: "O‘zbekiston Fanlar akademiyasi Botanika instituti — raqamli gerbariy va flora o‘zgarishini kuzatish portali.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#14573a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={inter.variable}>
      <head>
        <link rel="preload" as="image" href="/bg-hero.webp" type="image/webp" fetchPriority="high" />
        <link rel="preconnect" href="https://api.gbif.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://server.arcgisonline.com" />
      </head>
      <body><LangProvider><AppProvider><AppShell>{children}</AppShell></AppProvider></LangProvider></body>
    </html>
  );
}
