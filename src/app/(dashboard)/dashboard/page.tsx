import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { getDashboardStatistics } from "@/server/services/statisticsService";
import { formatPrice } from "@/lib/currency";
import { StatCard } from "@/components/ui/stat-card";
import {
  Calendar,
  Ticket,
  ScanLine,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with greeting */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <Link href="/dashboard/events/new">
            <Button className="gap-2 h-11 shadow-lg shadow-blue-500/30 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              <span className="hidden sm:inline">Nieuw Evenement</span>
              <span className="sm:hidden">Nieuw</span>
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Welkom terug bij {currentOrg.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/events" className="group">
          <StatCard
            title="Totaal Evenementen"
            value={stats.totalEvents.toString()}
            description={`${stats.liveEvents} live, ${stats.draftEvents} concept`}
            icon={Calendar}
            className="h-full hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-900/50"
          />
        </Link>
        <Link href="/dashboard/events?status=LIVE" className="group">
          <StatCard
            title="Live Evenementen"
            value={stats.liveEvents.toString()}
            description="Actief beschikbaar"
            icon={Calendar}
            className="h-full hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-green-200 dark:hover:border-green-900/50"
          />
        </Link>
        <Link href="/dashboard/orders" className="group">
          <StatCard
            title="Tickets Verkocht"
            value={stats.totalTicketsSold.toString()}
            description={`${formatPrice(stats.totalRevenue)} omzet`}
            icon={Ticket}
            trend={{
              value: formatPrice(stats.totalRevenue),
              positive: true,
            }}
            className="h-full hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-900/50"
          />
        </Link>
        <Link href="/dashboard/scanning" className="group">
          <StatCard
            title="Gescand"
            value={stats.totalScanned.toString()}
            description={`${stats.totalTicketsSold > 0 ? Math.round((stats.totalScanned / stats.totalTicketsSold) * 100) : 0}% van verkocht`}
            icon={ScanLine}
            className="h-full hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-orange-200 dark:hover:border-orange-900/50"
          />
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/events/new">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Calendar className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Maak Evenement</h3>
            <p className="text-blue-100 text-sm">Start binnen 5 minuten</p>
          </div>
        </Link>

        <Link href="/dashboard/scanning">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-all hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-1 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <ScanLine className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Start Scanner</h3>
            <p className="text-purple-100 text-sm">Scan tickets live</p>
          </div>
        </Link>

        <Link href="/dashboard/orders">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-1 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <TrendingUp className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Bekijk Orders</h3>
            <p className="text-green-100 text-sm">Alle bestellingen</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
