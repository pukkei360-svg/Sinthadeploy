import type { Metadata, Viewport } from "next";
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
  // App icons — Meitei Mayek ꯁ (Sa) on blue gradient
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  // Web App Manifest — makes the PWA installable with the Meitei Mayek icon
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SINTHA",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "SINTHA - Trusted Hands. Trusted Services.",
    description: "Manipur's trusted service marketplace with zero commission",
    siteName: "SINTHA",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "SINTHA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SINTHA - Trusted Hands. Trusted Services.",
    description: "Manipur's trusted service marketplace with zero commission",
    images: ["/icon-512.png"],
  },
};

// viewport export (Next.js 16 wants this separated from metadata)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F4C81",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        Anti-caching meta tags. APK WebViews often ignore HTTP
        Cache-Control on the HTML shell and serve a stale document
        from disk — which references OLD JS chunk filenames that
        have since been replaced by new builds. Forcing the HTML to
        always revalidate ensures the WebView always discovers the
        latest JS chunk URLs (and therefore the latest UI code,
        including the ₹199 PRO price fix).
      */}
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
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
