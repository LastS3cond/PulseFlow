import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseFlow — Protocol Discipline & Telemetry Engine",
  description: "Next.js 15 PWA with Supabase PostgreSQL & Asymmetric Envelope Cryptography",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#090a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-main antialiased selection:bg-accent/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
