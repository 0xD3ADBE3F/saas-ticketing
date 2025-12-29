export default function EventsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Evenementen</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          + Nieuw Evenement
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Nog geen evenementen. Maak je eerste evenement om te beginnen.
        </p>
      </div>
    </div>
  );
}
