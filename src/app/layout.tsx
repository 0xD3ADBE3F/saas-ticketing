import type { Metadata, Viewport } from "next";
import { Roboto_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Entro - Het eerlijke ticketplatform voor Nederland",
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
    title: "Entro - Het eerlijke ticketplatform voor Nederland",
    description:
      "Verkoop tickets zonder gedoe. Betaal alleen voor tickets die daadwerkelijk worden gebruikt.",
    type: "website",
    locale: "nl_NL",
    url: "https://getentro.app",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Entro",
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
    <html lang="nl" suppressHydrationWarning>
      <body className={`${robotoMono.variable} font-mono antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
