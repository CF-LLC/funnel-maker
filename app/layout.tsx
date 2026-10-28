import type { Metadata } from "next";
import { SITE_URL } from "@/lib/free-tools/site-url";
import localFont from "next/font/local";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { Toaster } from "@/components/ui/toast";

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
  title: { default: "SaaS Nation - Simple tools for solo businesses", template: "%s · SaaS Nation" },
  applicationName: "SaaS Nation",
  description: "SaaS Nation: simple tools for solo businesses. Funnel Maker, Invoices and Link-in-bio in one account.",
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: "#09090b",
};

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
      </body>
    </html>
  );
}
