import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { getDashboardStatistics } from "@/server/services/statisticsService";
import { formatPrice } from "@/lib/currency";
import { StatCard } from "@/components/ui/stat-card";
import { Calendar, Ticket, ScanLine } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const currentOrg = organizations[0];

  // Check if user needs to see welcome screen
  if (!currentOrg.firstLoginCompleted) {
    redirect("/welcome");
  }

  const stats = await getDashboardStatistics(currentOrg.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/events">
          <StatCard
            title="Totaal Evenementen"
            value={stats.totalEvents.toString()}
            description={`${stats.liveEvents} live, ${stats.draftEvents} concept`}
            icon={Calendar}
          />
        </Link>
        <Link href="/dashboard/events?status=LIVE">
          <StatCard
            title="Live Evenementen"
            value={stats.liveEvents.toString()}
            description="Actief beschikbaar"
            icon={Calendar}
          />
        </Link>
        <Link href="/dashboard/orders">
          <StatCard
            title="Tickets Verkocht"
            value={stats.totalTicketsSold.toString()}
            description={`${formatPrice(stats.totalRevenue)} omzet`}
            icon={Ticket}
          />
        </Link>
        <Link href="/dashboard/scanning">
          <StatCard
            title="Gescand"
            value={stats.totalScanned.toString()}
            description={`${stats.totalTicketsSold > 0 ? Math.round((stats.totalScanned / stats.totalTicketsSold) * 100) : 0}% van verkochte tickets`}
            icon={ScanLine}
          />
        </Link>
      </div>
    </div>
  );
}
