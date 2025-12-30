import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Scanner - Entro",
  description: "Mobiele ticket scanner",
  manifest: "/scanner-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Entro Scanner",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Standalone mobile scanner - no dashboard navigation */}
      <main className="min-h-screen">{children}</main>
    </div>
  );
}
