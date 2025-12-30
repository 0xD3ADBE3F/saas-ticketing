import { Analytics } from "@vercel/analytics/next";
import { Header, Footer } from "@/components/website";

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <Analytics />
    </div>
  );
}
