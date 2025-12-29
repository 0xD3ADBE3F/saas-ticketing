import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { getDashboardStatistics } from "@/server/services/statisticsService";
import { formatPrice } from "@/lib/currency";

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
  const stats = await getDashboardStatistics(currentOrg.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Totaal Evenementen"
          value={stats.totalEvents.toString()}
          description={`${stats.liveEvents} live, ${stats.draftEvents} concept`}
          href="/dashboard/events"
        />
        <DashboardCard
          title="Live Evenementen"
          value={stats.liveEvents.toString()}
          description="Actief beschikbaar"
          href="/dashboard/events?status=LIVE"
        />
        <DashboardCard
          title="Tickets Verkocht"
          value={stats.totalTicketsSold.toString()}
          description={`${formatPrice(stats.totalRevenue)} omzet`}
          href="/dashboard/orders"
        />
        <DashboardCard
          title="Gescand"
          value={stats.totalScanned.toString()}
          description={`${stats.totalTicketsSold > 0 ? Math.round((stats.totalScanned / stats.totalTicketsSold) * 100) : 0}% van verkochte tickets`}
          href="/dashboard/scanning"
        />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  description,
  href,
}: {
  title: string;
  value: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-500 transition-colors"
    >
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </h2>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {description}
      </p>
    </a>
  );
}
