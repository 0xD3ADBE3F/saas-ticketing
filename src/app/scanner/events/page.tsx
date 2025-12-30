"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
}

export default function ScannerEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminal, setTerminal] = useState<{ id: string; name: string } | null>(
    null
  );
  const [org, setOrg] = useState<{ name: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for token
    const token = localStorage.getItem("scanner_token");
    if (!token) {
      router.push("/scanner");
      return;
    }

    // Load terminal info
    const terminalData = localStorage.getItem("scanner_terminal");
    if (terminalData) {
      setTerminal(JSON.parse(terminalData));
    }

    const orgData = localStorage.getItem("scanner_org");
    if (orgData) {
      setOrg(JSON.parse(orgData));
    }

    // Fetch events
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/scanner/mobile/events", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          // Token expired
          localStorage.removeItem("scanner_token");
          router.push("/scanner");
          return;
        }

        if (!res.ok) {
          throw new Error("Kon evenementen niet laden");
        }

        const data = await res.json();
        setEvents(data.events || []);

        // If only one event, redirect directly
        if (data.events?.length === 1) {
          router.push(`/scanner/scan/${data.events[0].id}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Er ging iets mis");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("scanner_token");
    localStorage.removeItem("scanner_terminal");
    localStorage.removeItem("scanner_org");
    localStorage.removeItem("scanner_event");
    router.push("/scanner");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">📱</div>
          <p className="text-gray-400">Evenementen laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{org?.name || "Scanner"}</h1>
          <p className="text-sm text-gray-400">
            Terminal: {terminal?.name || "Onbekend"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1 text-sm bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Uitloggen
        </button>
      </header>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300">
          Selecteer een evenement
        </h2>

        {events.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-400">Geen actieve evenementen</p>
            <p className="text-sm text-gray-500 mt-2">
              Er zijn geen live evenementen om te scannen.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/scanner/scan/${event.id}`}
                className="block bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition-colors active:scale-[0.98]"
              >
                <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    📅{" "}
                    {new Date(event.startsAt).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 truncate">
                      📍 {event.location}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
