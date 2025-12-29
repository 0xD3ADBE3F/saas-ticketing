import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GetEntry - Het eerlijke ticketplatform voor Nederland",
  description:
    "Verkoop tickets zonder gedoe. Betaal alleen voor tickets die daadwerkelijk worden gebruikt. Simpel, transparant en volledig gericht op de Nederlandse markt.",
  keywords: [
    "tickets",
    "evenementen",
    "ticketverkoop",
    "nederland",
    "ideal",
    "qr-code",
  ],
  openGraph: {
    title: "GetEntry - Het eerlijke ticketplatform voor Nederland",
    description:
      "Verkoop tickets zonder gedoe. Betaal alleen voor tickets die daadwerkelijk worden gebruikt.",
    type: "website",
    locale: "nl_NL",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GetEntry",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
