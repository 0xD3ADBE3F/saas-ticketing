import { prisma } from "@/server/lib/prisma";
import { formatPrice } from "@/lib/currency";

export default async function PlatformDashboardPage() {
  // Get platform-wide statistics
  const [
    totalOrgs,
    activeOrgs,
    totalEvents,
    liveEvents,
    totalTicketsSold,
    totalRevenue,
    recentOrgs,
  ] = await Promise.all([
    // Total organizations
    prisma.organization.count(),

    // Active organizations (have at least one event)
    prisma.organization.count({
      where: {
        events: {
          some: {},
        },
      },
    }),

    // Total events
    prisma.event.count(),

    // Live events
    prisma.event.count({
      where: { status: "LIVE" },
    }),

    // Total tickets sold (from paid orders)
    prisma.ticket.count({
      where: {
        order: {
          status: "PAID",
        },
      },
    }),

    // Total revenue (ticket sales)
    prisma.order.aggregate({
      where: {
        status: "PAID",
      },
      _sum: {
        ticketTotal: true,
      },
    }),

    // Recent organizations
    prisma.organization.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        createdAt: true,
        mollieOnboardingStatus: true,
        _count: {
          select: {
            events: true,
            orders: true,
          },
        },
      },
    }),
  ]);

  // Calculate platform fees (2% of ticket sales)
  const platformFeesCollected = Math.round(
    (totalRevenue._sum.ticketTotal ?? 0) * 0.02
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Platform Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Overview of all organizations and platform activity
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Organizations"
          value={totalOrgs.toString()}
          description={`${activeOrgs} active`}
          color="blue"
        />
        <StatCard
          title="Total Events"
          value={totalEvents.toString()}
          description={`${liveEvents} currently live`}
          color="green"
        />
        <StatCard
          title="Tickets Sold"
          value={totalTicketsSold.toString()}
          description={`${formatPrice(totalRevenue._sum.ticketTotal ?? 0)} GMV`}
          color="purple"
        />
        <StatCard
          title="Platform Fees"
          value={formatPrice(platformFeesCollected)}
          description="2% of ticket sales"
          color="orange"
        />
      </div>

      {/* Recent Organizations */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold">Recent Organizations</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {recentOrgs.map((org) => (
            <a
              key={org.id}
              href={`/platform/organizations/${org.id}`}
              className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{org.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {org.email || "No email"}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{org._count.events} events</span>
                    <span>•</span>
                    <span>{org._count.orders} orders</span>
                  </div>
                </div>
                <div className="text-right">
                  <OnboardingBadge status={org.mollieOnboardingStatus} />
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-800">
          <a
            href="/platform/organizations"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            View all organizations →
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  color,
}: {
  title: string;
  value: string;
  description: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    purple: "text-purple-600 dark:text-purple-400",
    orange: "text-orange-600 dark:text-orange-400",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {title}
      </h3>
      <p className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>
        {value}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {description}
      </p>
    </div>
  );
}

function OnboardingBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
        Not connected
      </span>
    );
  }

  const statusConfig = {
    PENDING: { color: "yellow", label: "Pending" },
    NEEDS_DATA: { color: "orange", label: "Needs Data" },
    IN_REVIEW: { color: "blue", label: "In Review" },
    COMPLETED: { color: "green", label: "Completed" },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

  const colorClasses = {
    yellow:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
    orange:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    green:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        colorClasses[config.color as keyof typeof colorClasses]
      }`}
    >
      {config.label}
    </span>
  );
}
