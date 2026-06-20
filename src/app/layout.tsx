import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Meetei_Mayek } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import WebViewInterceptor from "@/components/WebViewInterceptor";
import OfflineBootstrap from "@/components/sintha/OfflineBootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Meitei Mayek font for Manipuri script (used on RoleSelectScreen)
// Loaded on all pages so users see it instantly without FOUT
const meeteiMayek = Noto_Sans_Meetei_Mayek({
  variable: "--font-meetei-mayek",
  subsets: ["meetei-mayek"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SINTHA - Trusted Hands. Trusted Services.",
  description: "Manipur's trusted service marketplace. Find verified providers for home services, education, transport, events, beauty, and repairs. Zero commission, AI-powered.",
  keywords: ["SINTHA", "Manipur", "services", "marketplace", "verified providers", "zero commission", "AI powered"],
  authors: [{ name: "SINTHA Team" }],
  openGraph: {
    title: "SINTHA - Trusted Hands. Trusted Services.",
    description: "Manipur's trusted service marketplace with zero commission",
    siteName: "SINTHA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SINTHA - Trusted Hands. Trusted Services.",
    description: "Manipur's trusted service marketplace with zero commission",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${meeteiMayek.variable} antialiased bg-background text-foreground`}
      >
        <WebViewInterceptor />
        <OfflineBootstrap />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
