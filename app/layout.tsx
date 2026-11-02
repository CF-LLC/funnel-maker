import type { Metadata } from "next";
import { SITE_URL } from "@/lib/free-tools/site-url";
import { HOME_DESCRIPTION, SITE_NAME, ogImagePath } from "@/lib/og/pages";
import localFont from "next/font/local";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { Toaster } from "@/components/ui/toast";
import { Beacon } from "@/components/tracking/beacon";
import { ReferralCapture } from "@/components/referrals/referral-capture";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "SaaS Nation - Simple tools for coaches, creators and solo businesses", template: "%s · SaaS Nation" },
  applicationName: "SaaS Nation",
  description: HOME_DESCRIPTION,
  // Default share card for pages without their own; title/description fall back to each page's <title>/description.
  openGraph: { siteName: SITE_NAME, type: "website", images: [{ url: ogImagePath("/"), width: 1200, height: 630, alt: SITE_NAME }] },
  twitter: { card: "summary_large_image", images: [ogImagePath("/")] },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16 32x32' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: "#09090b",
};

import { AuthLinkErrorRedirect } from '@/components/auth-link-error-redirect'
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} noir antialiased`}
        suppressHydrationWarning
      >
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster />
        <Beacon />
        <ReferralCapture />
        <AuthLinkErrorRedirect />
      </body>
    </html>
  );
}
