export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Evenementen"
          value="0"
          description="Actieve evenementen"
          href="/dashboard/events"
        />
        <DashboardCard
          title="Tickets Verkocht"
          value="0"
          description="Totaal verkochte tickets"
          href="/dashboard/orders"
        />
        <DashboardCard
          title="Gescand"
          value="0"
          description="Gescande tickets"
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
