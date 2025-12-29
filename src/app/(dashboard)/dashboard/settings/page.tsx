export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Instellingen</h1>

      <div className="space-y-6">
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Organisatie</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Organisatienaam
              </label>
              <input
                type="text"
                placeholder="Jouw organisatie"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Contact E-mail
              </label>
              <input
                type="email"
                placeholder="contact@voorbeeld.nl"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
              />
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Teamleden</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Beheer wie toegang heeft tot jouw organisatie.
          </p>
          <button className="mt-4 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            + Lid Uitnodigen
          </button>
        </section>
      </div>
    </div>
  );
}
