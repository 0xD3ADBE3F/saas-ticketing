export default function EventsListPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-8">Aankomende Evenementen</h1>

      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <p>Momenteel geen evenementen beschikbaar.</p>
        <p className="text-sm mt-2">
          Kom binnenkort terug voor nieuwe evenementen!
        </p>
      </div>
    </div>
  );
}
