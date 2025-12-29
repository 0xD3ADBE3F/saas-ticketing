export default function ScanningPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Scannen</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Snel Scannen</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Voer een ticketcode handmatig in of gebruik de scanner app.
          </p>
          <input
            type="text"
            placeholder="Voer ticketcode in..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
          />
          <button className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Scan Ticket
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Scan Statistieken</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">
                Totaal Tickets
              </span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Gescand</span>
              <span className="font-medium text-green-600">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">
                Resterend
              </span>
              <span className="font-medium">0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
